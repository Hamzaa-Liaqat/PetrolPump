from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APITestCase

from .models import Purchase, StockMovement, Tank
from accounts.models import Profile
from .services import apply_stock_movement


User = get_user_model()


def D(value):
    return Decimal(str(value))


def make_user(username, role):
    user = User.objects.create_user(
        username=username,
        password="Test@12345",
    )

    user.Profile.role = role
    user.Profile.save()

    return user


def make_tank(**overrides):
    data = {
        "name": "Tank-1",
        "fuel_type": "petrol",
        "capacity": Decimal("10000"),
        "reorder_level": Decimal("1000"),
    }

    data.update(overrides)

    return Tank.objects.create(**data)


def purchase_payload(tank, **overrides):
    data = {
        "tank": tank.pk,
        "supplier": "PSO",
        "tanker_number": "lea-1234",
        "invoice_number": "INV-001",
        "litres": "5000.00",
        "invoice_amount": "1500000.00",
    }

    data.update(overrides)

    return data


class ModelAndServiceTests(TestCase):

    def test_database_blocks_stock_above_capacity(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                make_tank(
                    name="Bad",
                    capacity=Decimal("1000"),
                    current_stock=Decimal("2000"),
                )

    def test_purchase_increases_stock_and_writes_ledger(self):
        tank = make_tank()
        owner = make_user(
            "boss",
            Profile.Role.OWNER,
        )

        purchase = Purchase.objects.create(
            tank=tank,
            supplier="PSO",
            tanker_number="lea-1234",
            invoice_number="INV-1",
            litres=Decimal("5000"),
            invoice_amount=Decimal("1500000"),
            created_by=owner,
        )

        tank.refresh_from_db()

        move = StockMovement.objects.get()

        self.assertEqual(
            tank.current_stock,
            Decimal("5000.00"),
        )

        self.assertEqual(
            move.movement_type,
            "purchase",
        )

        self.assertEqual(
            move.balance_after,
            Decimal("5000.00"),
        )

        self.assertEqual(
            move.reference,
            f"purchase:{purchase.pk}",
        )

        self.assertEqual(
            purchase.tanker_number,
            "LEA-1234",
        )

    def test_dip_readings_set_received_and_shortage(self):
        tank = make_tank()

        purchase = Purchase(
            tank=tank,
            supplier="PSO",
            tanker_number="T1",
            invoice_number="INV-2",
            litres=Decimal("5000"),
            dip_before=Decimal("1000"),
            dip_after=Decimal("5950"),
            invoice_amount=Decimal("1500000"),
        )

        purchase.clean()
        purchase.save()

        tank.refresh_from_db()

        self.assertEqual(
            purchase.received_litres,
            Decimal("4950"),
        )

        self.assertEqual(
            purchase.shortage_litres,
            Decimal("50"),
        )

        self.assertEqual(
            tank.current_stock,
            Decimal("4950.00"),
        )

    def test_purchase_cannot_be_edited_or_deleted(self):
        tank = make_tank()

        purchase = Purchase.objects.create(
            tank=tank,
            supplier="PSO",
            tanker_number="T1",
            invoice_number="INV-3",
            litres=Decimal("100"),
            invoice_amount=Decimal("1000"),
        )

        purchase.litres = Decimal("1")

        with self.assertRaises(DjangoValidationError):
            purchase.save()

        with self.assertRaises(DjangoValidationError):
            purchase.delete()

    def test_stock_cannot_go_negative(self):
        tank = make_tank()

        apply_stock_movement(
            tank_id=tank.pk,
            movement_type="adjustment",
            litres_change=500,
        )

        with self.assertRaises(DRFValidationError):
            apply_stock_movement(
                tank_id=tank.pk,
                movement_type="sale",
                litres_change=-800,
            )

        tank.refresh_from_db()

        self.assertEqual(
            tank.current_stock,
            Decimal("500.00"),
        )

        self.assertEqual(
            StockMovement.objects.count(),
            1,
        )

    def test_stock_cannot_exceed_capacity(self):
        tank = make_tank(
            capacity=Decimal("1000"),
        )

        with self.assertRaises(DRFValidationError):
            apply_stock_movement(
                tank_id=tank.pk,
                movement_type="adjustment",
                litres_change=1500,
            )

        tank.refresh_from_db()

        self.assertEqual(
            tank.current_stock,
            Decimal("0.00"),
        )

    def test_ledger_entry_cannot_be_changed(self):
        tank = make_tank()

        move = apply_stock_movement(
            tank_id=tank.pk,
            movement_type="adjustment",
            litres_change=100,
        )

        move.note = "edit"

        with self.assertRaises(DjangoValidationError):
            move.save()

        with self.assertRaises(DjangoValidationError):
            move.delete()


class InventoryApiTests(APITestCase):

    def setUp(self):
        self.owner = make_user(
            "boss",
            Profile.Role.OWNER,
        )

        self.manager = make_user(
            "mgr",
            Profile.Role.MANAGER,
        )

        self.cashier = make_user(
            "cash",
            Profile.Role.CASHIER,
        )

        self.tank = make_tank()

    def login(self, user):
        self.client.force_authenticate(user=user)

    def test_anonymous_is_blocked(self):
        response = self.client.get(
            reverse("tank-list")
        )

        self.assertIn(
            response.status_code,
            (401, 403),
        )

    def test_cashier_is_forbidden_everywhere(self):
        self.login(self.cashier)

        for name in (
            "tank-list",
            "purchase-list",
            "stock-movement-list",
            "tank-alerts",
        ):
            self.assertEqual(
                self.client.get(reverse(name)).status_code,
                403,
                name,
            )

    def test_manager_can_read_but_not_create_tank(self):
        self.login(self.manager)

        self.assertEqual(
            self.client.get(
                reverse("tank-list")
            ).status_code,
            200,
        )

        response = self.client.post(
            reverse("tank-list"),
            {
                "name": "T9",
                "fuel_type": "diesel",
                "capacity": "5000",
                "reorder_level": "500",
            },
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_owner_creates_tank_but_cannot_set_stock(self):
        self.login(self.owner)

        response = self.client.post(
            reverse("tank-list"),
            {
                "name": "T2",
                "fuel_type": "diesel",
                "capacity": "5000",
                "reorder_level": "500",
                "current_stock": "4000",
            },
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        self.assertEqual(
            Tank.objects.get(
                name="T2"
            ).current_stock,
            Decimal("0.00"),
        )

    def test_reorder_level_above_capacity_rejected(self):
        self.login(self.owner)

        response = self.client.post(
            reverse("tank-list"),
            {
                "name": "T3",
                "fuel_type": "diesel",
                "capacity": "1000",
                "reorder_level": "2000",
            },
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_manager_creates_purchase_and_stock_rises(self):
        self.login(self.manager)

        response = self.client.post(
            reverse("purchase-list"),
            purchase_payload(self.tank),
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        self.tank.refresh_from_db()

        self.assertEqual(
            self.tank.current_stock,
            Decimal("5000.00"),
        )

        self.assertEqual(
            Purchase.objects.get().created_by,
            self.manager,
        )

    def test_dip_calculation_through_api(self):
        self.login(self.manager)

        response = self.client.post(
            reverse("purchase-list"),
            purchase_payload(
                self.tank,
                dip_before="1000",
                dip_after="5950",
            ),
        )

        self.assertEqual(
            response.status_code,
            201,
            response.data,
        )

        self.assertEqual(
            D(response.data["received_litres"]),
            D("4950"),
        )

        self.assertEqual(
            D(response.data["shortage_litres"]),
            D("50"),
        )

    def test_purchase_over_capacity_rejected_and_nothing_saved(self):
        small = make_tank(
            name="Small",
            capacity=Decimal("1000"),
            reorder_level=Decimal("100"),
        )

        self.login(self.manager)

        response = self.client.post(
            reverse("purchase-list"),
            purchase_payload(small),
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        self.assertEqual(
            Purchase.objects.count(),
            0,
        )

        small.refresh_from_db()

        self.assertEqual(
            small.current_stock,
            Decimal("0.00"),
        )

    def test_duplicate_invoice_rejected(self):
        self.login(self.manager)

        first = self.client.post(
            reverse("purchase-list"),
            purchase_payload(
                self.tank,
                litres="100",
            ),
        )

        second = self.client.post(
            reverse("purchase-list"),
            purchase_payload(
                self.tank,
                litres="100",
            ),
        )

        self.assertEqual(
            first.status_code,
            201,
        )

        self.assertEqual(
            second.status_code,
            400,
        )

    def test_purchase_cannot_be_updated_or_deleted_via_api(self):
        self.login(self.owner)

        created = self.client.post(
            reverse("purchase-list"),
            purchase_payload(
                self.tank,
                litres="100",
            ),
        )

        self.assertEqual(
            created.status_code,
            201,
            created.data,
        )

        url = reverse(
            "purchase-detail",
            args=[created.data["id"]],
        )

        self.assertEqual(
            self.client.patch(
                url,
                {"litres": "1"},
            ).status_code,
            405,
        )

        self.assertEqual(
            self.client.delete(url).status_code,
            405,
        )

    def test_created_by_cannot_be_spoofed(self):
        self.login(self.manager)

        payload = purchase_payload(
            self.tank,
            litres="100",
            created_by=self.owner.pk,
        )

        self.client.post(
            reverse("purchase-list"),
            payload,
        )

        self.assertEqual(
            Purchase.objects.get().created_by,
            self.manager,
        )

    def test_reconcile_sets_stock_and_logs_variance(self):
        apply_stock_movement(
            tank_id=self.tank.pk,
            movement_type="adjustment",
            litres_change=5000,
        )

        self.login(self.owner)

        response = self.client.post(
            reverse(
                "tank-reconcile",
                args=[self.tank.pk],
            ),
            {
                "measured_litres": "4900",
                "note": "Evening dip",
            },
        )

        self.assertEqual(
            response.status_code,
            200,
            response.data,
        )

        self.tank.refresh_from_db()

        self.assertEqual(
            self.tank.current_stock,
            Decimal("4900.00"),
        )

        self.assertEqual(
            D(response.data["variance_litres"]),
            D("-100"),
        )

        self.assertTrue(
            response.data["is_significant"]
        )

        self.assertEqual(
            StockMovement.objects.count(),
            2,
        )

    def test_reconcile_needs_note_and_valid_amount(self):
        self.login(self.owner)

        url = reverse(
            "tank-reconcile",
            args=[self.tank.pk],
        )

        self.assertEqual(
            self.client.post(
                url,
                {"measured_litres": "100"},
            ).status_code,
            400,
        )

        too_much = self.client.post(
            url,
            {
                "measured_litres": "20000",
                "note": "x",
            },
        )

        self.assertEqual(
            too_much.status_code,
            400,
        )

    def test_alerts_lists_only_low_tanks(self):
        full = make_tank(
            name="Full"
        )

        apply_stock_movement(
            tank_id=full.pk,
            movement_type="adjustment",
            litres_change=5000,
        )

        self.login(self.manager)

        response = self.client.get(
            reverse("tank-alerts")
        )

        self.assertEqual(
            [t["name"] for t in response.data],
            ["Tank-1"],
        )

    def test_ledger_is_read_only(self):
        self.login(self.manager)

        self.assertEqual(
            self.client.post(
                reverse("stock-movement-list"),
                {},
            ).status_code,
            405,
        )

    def test_tank_with_history_cannot_be_deleted(self):
        apply_stock_movement(
            tank_id=self.tank.pk,
            movement_type="adjustment",
            litres_change=100,
        )

        self.login(self.owner)

        response = self.client.delete(
            reverse(
                "tank-detail",
                args=[self.tank.pk],
            )
        )

        self.assertEqual(
            response.status_code,
            409,
        )