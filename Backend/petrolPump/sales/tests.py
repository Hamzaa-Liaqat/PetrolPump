from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APITestCase

from inventory.models import StockMovement, Tank
from inventory.services import apply_stock_movement

from .models import FuelRate, Nozzle, Sale
from .services import void_sale

User = get_user_model()


def D(value):
    return Decimal(str(value))


def make_user(username, role):
    user = User.objects.create_user(username=username, password='Test@12345')
    user.Profile.role = role
    user.Profile.save()
    return user


def make_pump(rate='250.00'):
    tank = Tank.objects.create(
        name='Tank-1', fuel_type='petrol', capacity=D(10000), reorder_level=D(1000),
    )
    apply_stock_movement(tank_id=tank.pk, movement_type='adjustment', litres_change=5000, note='opening')
    nozzle = Nozzle.objects.create(name='N1', fuel_type='petrol', tank=tank, initial_reading=D(1000))
    if rate is not None:
        FuelRate.objects.create(fuel_type='petrol', rate=D(rate))
    return tank, nozzle


def make_sale(nozzle, opening, closing, cashier=None):
    return Sale.objects.create(
        nozzle=nozzle, opening_reading=D(opening), closing_reading=D(closing), cashier=cashier,
    )


class SaleModelTests(TestCase):
    def test_sale_computes_values_and_reduces_stock(self):
        tank, nozzle = make_pump()
        cashier = make_user('c1', 'cashier')
        sale = make_sale(nozzle, 1000, 1100, cashier)
        tank.refresh_from_db()
        nozzle.refresh_from_db()
        move = StockMovement.objects.get(movement_type='sale')
        self.assertEqual(sale.litres, D('100.00'))
        self.assertEqual(sale.rate, D('250.00'))
        self.assertEqual(sale.amount, D('25000.00'))
        self.assertEqual(tank.current_stock, D('4900.00'))
        self.assertEqual(nozzle.last_reading, D('1100.00'))
        self.assertEqual(move.litres_change, D('-100.00'))
        self.assertEqual(move.reference, f'sale:{sale.pk}')
        self.assertEqual(sale.receipt_no, f'RCP-{sale.pk:06d}')

    def test_amount_rounds_half_up(self):
        _, nozzle = make_pump(rate='258.45')
        sale = make_sale(nozzle, 1000, '1003.33')
        self.assertEqual(sale.amount, D('860.64'))

    def test_rate_uses_latest_effective_rate(self):
        _, nozzle = make_pump(rate=None)
        now = timezone.now()
        FuelRate.objects.create(fuel_type='petrol', rate=D(250), effective_from=now - timedelta(hours=2))
        FuelRate.objects.create(fuel_type='petrol', rate=D(260), effective_from=now - timedelta(hours=1))
        FuelRate.objects.create(fuel_type='petrol', rate=D(270), effective_from=now + timedelta(days=1))
        self.assertEqual(FuelRate.current_for('petrol').rate, D('260.00'))
        self.assertEqual(make_sale(nozzle, 1000, 1010).rate, D('260.00'))

    def test_meter_continuity_enforced(self):
        _, nozzle = make_pump()
        make_sale(nozzle, 1000, 1100)
        with self.assertRaises(DjangoValidationError):
            make_sale(nozzle, 1000, 1200)
        probe = Sale(nozzle=nozzle, opening_reading=D(1100), closing_reading=D(1200))
        with self.assertRaises(DjangoValidationError) as ctx:
            probe.clean()
        self.assertIn('opening_reading', ctx.exception.message_dict)
        make_sale(nozzle, 1100, 1200)

    def test_closing_must_exceed_opening(self):
        _, nozzle = make_pump()
        with self.assertRaises(DjangoValidationError):
            make_sale(nozzle, 1000, 1000)

    def test_sale_without_rate_rejected(self):
        _, nozzle = make_pump(rate=None)
        with self.assertRaises(DjangoValidationError):
            make_sale(nozzle, 1000, 1100)

    def test_insufficient_stock_rolls_back_everything(self):
        tank, nozzle = make_pump()
        with self.assertRaises(DRFValidationError):
            make_sale(nozzle, 1000, 7000)
        tank.refresh_from_db()
        nozzle.refresh_from_db()
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(nozzle.last_reading, D('1000.00'))
        self.assertEqual(tank.current_stock, D('5000.00'))

    def test_nozzle_fuel_must_match_tank(self):
        tank, _ = make_pump()
        bad = Nozzle(name='X', fuel_type='diesel', tank=tank, initial_reading=D(0))
        with self.assertRaises(DjangoValidationError) as ctx:
            bad.full_clean()
        self.assertIn('fuel_type', ctx.exception.message_dict)

    def test_sale_and_rate_are_immutable(self):
        _, nozzle = make_pump()
        sale = make_sale(nozzle, 1000, 1100)
        sale.litres = D(1)
        with self.assertRaises(DjangoValidationError):
            sale.save()
        with self.assertRaises(DjangoValidationError):
            sale.delete()
        rate = FuelRate.objects.first()
        with self.assertRaises(DjangoValidationError):
            rate.save()
        with self.assertRaises(DjangoValidationError):
            rate.delete()

    def test_void_restores_stock_and_meter(self):
        tank, nozzle = make_pump()
        manager = make_user('mgr', 'manager')
        sale = make_sale(nozzle, 1000, 1100)
        void_sale(sale_id=sale.pk, user=manager, reason='Typo')
        sale.refresh_from_db()
        tank.refresh_from_db()
        nozzle.refresh_from_db()
        self.assertTrue(sale.is_void)
        self.assertEqual(sale.voided_by, manager)
        self.assertEqual(tank.current_stock, D('5000.00'))
        self.assertEqual(nozzle.last_reading, D('1000.00'))
        self.assertEqual(StockMovement.objects.filter(reference=f'void-sale:{sale.pk}').count(), 1)
        self.assertEqual(Sale.objects.active().count(), 0)
        self.assertEqual(Sale.objects.count(), 1)
        make_sale(nozzle, 1000, 1050)

    def test_void_order_and_double_void(self):
        _, nozzle = make_pump()
        manager = make_user('mgr', 'manager')
        first = make_sale(nozzle, 1000, 1100)
        second = make_sale(nozzle, 1100, 1200)
        with self.assertRaises(DjangoValidationError):
            void_sale(sale_id=first.pk, user=manager, reason='x')
        void_sale(sale_id=second.pk, user=manager, reason='x')
        with self.assertRaises(DjangoValidationError):
            void_sale(sale_id=second.pk, user=manager, reason='x')


class SalesApiTests(APITestCase):
    
    def test_nozzle_screen_contract(self):
        # frontend ki Nozzles screen jo bhejti aur jo jawab parhti hai (NozzleFormDialog / NozzleSection)
        diesel = Tank.objects.create(name='Tank-D', fuel_type='diesel', capacity=D(5000), reorder_level=D(100))
        self.login(self.owner)
        payload = {'name': 'N2', 'fuel_type': 'diesel', 'tank': diesel.pk, 'initial_reading': '1500.5'}
        created = self.client.post(reverse('nozzle-list'), payload)
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(D(created.data['last_reading']), D('1500.5'))
        self.assertIsNone(created.data['current_rate'])
        for key in ('id', 'name', 'fuel_type', 'tank', 'tank_name', 'last_reading', 'current_rate', 'is_active'):
            self.assertIn(key, created.data)

        duplicate = self.client.post(reverse('nozzle-list'), payload)
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn('name', duplicate.data)

        url = reverse('nozzle-detail', args=[created.data['id']])
        edited = self.client.patch(url, {'name': 'N2-new', 'is_active': False})
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(Nozzle.objects.get(pk=created.data['id']).last_reading, D('1500.5'))

        self.login(self.manager)
        names = [item['name'] for item in self.client.get(reverse('nozzle-list')).data]
        self.assertIn('N2-new', names)
        self.assertEqual(self.client.patch(url, {'name': 'x'}).status_code, 403)

        self.login(self.cashier)
        names = [item['name'] for item in self.client.get(reverse('nozzle-list')).data]
        self.assertNotIn('N2-new', names)

    def setUp(self):
        self.owner = make_user('boss', 'owner')
        self.manager = make_user('mgr', 'manager')
        self.cashier = make_user('cash', 'cashier')
        self.cashier2 = make_user('cash2', 'cashier')
        self.tank, self.nozzle = make_pump()

    def login(self, user):
        self.client.force_authenticate(user=user)

    def payload(self, **overrides):
        data = {'nozzle': self.nozzle.pk, 'opening_reading': '1000', 'closing_reading': '1100'}
        data.update(overrides)
        return data

    def test_anonymous_is_blocked(self):
        self.assertIn(self.client.get(reverse('sale-list')).status_code, (401, 403))

    def test_cashier_creates_sale_and_sees_only_own(self):
        self.login(self.cashier)
        response = self.client.post(reverse('sale-list'), self.payload())
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(D(response.data['amount']), D('25000'))
        self.assertTrue(response.data['receipt_no'].startswith('RCP-'))
        self.assertEqual(Sale.objects.get().cashier, self.cashier)
        self.assertEqual(len(self.client.get(reverse('sale-list')).data), 1)
        self.login(self.cashier2)
        self.assertEqual(len(self.client.get(reverse('sale-list')).data), 0)
        sale_id = Sale.objects.get().pk
        self.assertEqual(self.client.get(reverse('sale-detail', args=[sale_id])).status_code, 404)
        self.login(self.manager)
        self.assertEqual(len(self.client.get(reverse('sale-list')).data), 1)

    def test_server_decides_money_fields_and_cashier(self):
        self.login(self.cashier)
        response = self.client.post(reverse('sale-list'), self.payload(
            cashier=self.owner.pk, amount='1', litres='1',
        ))
        self.assertEqual(response.status_code, 201, response.data)
        sale = Sale.objects.get()
        self.assertEqual(sale.cashier, self.cashier)
        self.assertEqual(sale.amount, D('25000.00'))
        self.assertEqual(sale.litres, D('100.00'))

    def test_client_rate_must_match_current_rate(self):
        self.login(self.cashier)
        self.assertEqual(self.client.post(reverse('sale-list'), self.payload(rate='999')).status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(self.client.post(reverse('sale-list'), self.payload(rate='250')).status_code, 201)

    def test_bad_readings_and_stock_rejected(self):
        self.login(self.cashier)
        mismatch = self.client.post(reverse('sale-list'), self.payload(opening_reading='900'))
        self.assertEqual(mismatch.status_code, 400)
        self.assertIn('opening_reading', mismatch.data)
        too_much = self.client.post(reverse('sale-list'), self.payload(closing_reading='7000'))
        self.assertEqual(too_much.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)

    def test_date_filters(self):
        self.login(self.cashier)
        self.client.post(reverse('sale-list'), self.payload())
        url = reverse('sale-list')
        self.assertEqual(len(self.client.get(url, {'date': 'today'}).data), 1)
        self.assertEqual(len(self.client.get(url).data), 1)
        self.assertEqual(len(self.client.get(url, {'date': '2000-01-01'}).data), 0)
        self.assertEqual(self.client.get(url, {'date': 'abc'}).status_code, 400)
        long_range = {'date_from': '2026-01-01', 'date_to': '2026-12-31'}
        self.assertEqual(self.client.get(url, long_range).status_code, 400)

    def test_void_permissions_and_flow(self):
        self.login(self.cashier)
        created = self.client.post(reverse('sale-list'), self.payload())
        url = reverse('sale-void', args=[created.data['id']])
        self.assertEqual(self.client.post(url, {'reason': 'x'}).status_code, 403)

        self.login(self.manager)
        self.assertEqual(self.client.post(url, {}).status_code, 400)
        self.assertEqual(self.client.post(url, {'reason': 'Typo'}).status_code, 200)
        self.assertEqual(self.client.post(url, {'reason': 'Typo'}).status_code, 400)
        self.tank.refresh_from_db()
        self.assertEqual(self.tank.current_stock, D('5000.00'))

        list_url = reverse('sale-list')
        self.assertEqual(len(self.client.get(list_url).data), 0)
        self.assertEqual(len(self.client.get(list_url, {'include_void': '1'}).data), 1)
        self.login(self.cashier)
        self.assertEqual(len(self.client.get(list_url, {'include_void': '1'}).data), 0)

    def test_fuel_rate_permissions_and_history(self):
        self.login(self.manager)
        response = self.client.post(reverse('fuel-rate-list'), {'fuel_type': 'petrol', 'rate': '260'})
        self.assertEqual(response.status_code, 403)

        self.login(self.owner)
        response = self.client.post(reverse('fuel-rate-list'), {'fuel_type': 'petrol', 'rate': '260'})
        self.assertEqual(response.status_code, 201, response.data)
        old = (timezone.now() - timedelta(days=1)).isoformat()
        backdated = self.client.post(reverse('fuel-rate-list'), {
            'fuel_type': 'petrol', 'rate': '100', 'effective_from': old,
        })
        self.assertEqual(backdated.status_code, 400)

        self.login(self.cashier)
        current = self.client.get(reverse('fuel-rate-current'))
        self.assertEqual(current.status_code, 200)
        by_fuel = {item['fuel_type']: item['rate'] for item in current.data}
        self.assertEqual(by_fuel['petrol'], D('260.00'))
        self.assertIsNone(by_fuel['diesel'])

    def test_nozzle_api_rules(self):
        self.login(self.cashier)
        listing = self.client.get(reverse('nozzle-list'))
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(D(listing.data[0]['current_rate']), D('250'))
        payload = {'name': 'N2', 'fuel_type': 'petrol', 'tank': self.tank.pk, 'initial_reading': '500'}
        self.assertEqual(self.client.post(reverse('nozzle-list'), payload).status_code, 403)

        self.login(self.owner)
        created = self.client.post(reverse('nozzle-list'), dict(payload, last_reading='999'))
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(D(created.data['last_reading']), D('500'))
        mismatch = self.client.post(reverse('nozzle-list'), dict(payload, name='N3', fuel_type='diesel'))
        self.assertEqual(mismatch.status_code, 400)

    def test_nozzle_with_sales_cannot_be_deleted(self):
        make_sale(self.nozzle, 1000, 1100)
        self.login(self.owner)
        response = self.client.delete(reverse('nozzle-detail', args=[self.nozzle.pk]))
        self.assertEqual(response.status_code, 409)
