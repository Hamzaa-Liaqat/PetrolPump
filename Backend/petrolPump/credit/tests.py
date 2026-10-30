from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APITestCase

from sales.models import FuelRate

from .models import CreditTransaction, Customer
from .services import (
    credit_alerts, customer_statement, record_credit_sale, record_payment,
    reverse_transaction, verify_customer_balance,
)

User = get_user_model()


def D(value):
    return Decimal(str(value))


def make_user(username, role):
    user = User.objects.create_user(username=username, password='Test@12345')
    user.Profile.role = role
    user.Profile.save()
    return user


def make_customer(limit=100000, **overrides):
    data = dict(name='Ali Traders', phone='03001234567', credit_limit=D(limit))
    data.update(overrides)
    return Customer.objects.create(**data)


def sell(customer, litres=100):
    return record_credit_sale(customer_id=customer.pk, fuel_type='petrol', litres=D(litres))


class CreditServiceTests(TestCase):
    def setUp(self):
        FuelRate.objects.create(fuel_type='petrol', rate=D('250.00'))
        self.customer = make_customer()

    def test_credit_sale_uses_server_rate(self):
        entry = sell(self.customer)
        self.customer.refresh_from_db()
        self.assertEqual(entry.rate, D('250.00'))
        self.assertEqual(entry.amount, D('25000.00'))
        self.assertEqual(entry.balance_after, D('25000.00'))
        self.assertEqual(self.customer.balance, D('25000.00'))

    def test_credit_sale_needs_rate(self):
        with self.assertRaises(DRFValidationError):
            record_credit_sale(customer_id=self.customer.pk, fuel_type='diesel', litres=D(10))

    def test_credit_limit_enforced(self):
        small = make_customer(limit=20000, name='Small', phone='03007654321')
        with self.assertRaises(DRFValidationError):
            sell(small)
        small.refresh_from_db()
        self.assertEqual(small.balance, D('0.00'))
        self.assertEqual(CreditTransaction.objects.filter(customer=small).count(), 0)

    def test_payment_reduces_balance_and_overpayment_rejected(self):
        sell(self.customer)
        entry = record_payment(customer_id=self.customer.pk, amount=D(10000))
        self.assertEqual(entry.balance_after, D('15000.00'))
        with self.assertRaises(DRFValidationError):
            record_payment(customer_id=self.customer.pk, amount=D(20000))

    def test_reversal_rules(self):
        sale = sell(self.customer)
        payment = record_payment(customer_id=self.customer.pk, amount=D(10000))
        with self.assertRaises(DRFValidationError):
            reverse_transaction(transaction_id=sale.pk, reason='x')
        reverse_transaction(transaction_id=payment.pk, reason='Cheque bounce')
        reversal = reverse_transaction(transaction_id=sale.pk, reason='Galat entry')
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.balance, D('0.00'))
        with self.assertRaises(DRFValidationError):
            reverse_transaction(transaction_id=sale.pk, reason='dobara')
        with self.assertRaises(DRFValidationError):
            reverse_transaction(transaction_id=reversal.pk, reason='reversal ki reversal')

    def test_payment_reversal_ignores_limit(self):
        sell(self.customer)
        payment = record_payment(customer_id=self.customer.pk, amount=D(25000))
        Customer.objects.filter(pk=self.customer.pk).update(credit_limit=D(10000))
        reverse_transaction(transaction_id=payment.pk, reason='Cheque bounce')
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.balance, D('25000.00'))
        self.assertTrue(self.customer.is_over_limit)

    def test_entries_are_immutable(self):
        entry = sell(self.customer)
        entry.note = 'edit'
        with self.assertRaises(DjangoValidationError):
            entry.save()
        with self.assertRaises(DjangoValidationError):
            entry.delete()

    def test_statement_and_verify(self):
        sell(self.customer)
        record_payment(customer_id=self.customer.pk, amount=D(5000))
        today = timezone.localdate()
        data = customer_statement(self.customer, today, today)
        self.assertEqual(data['opening_balance'], D('0.00'))
        self.assertEqual(data['total_debits'], D('25000.00'))
        self.assertEqual(data['total_credits'], D('5000.00'))
        self.assertEqual(data['closing_balance'], D('20000.00'))
        self.assertEqual(data['entries'].count(), 2)

        tomorrow = today + timedelta(days=1)
        later = customer_statement(self.customer, tomorrow, tomorrow)
        self.assertEqual(later['opening_balance'], D('20000.00'))
        self.assertEqual(later['closing_balance'], D('20000.00'))

        self.customer.refresh_from_db()
        self.assertTrue(verify_customer_balance(self.customer)['is_consistent'])
        Customer.objects.filter(pk=self.customer.pk).update(balance=D(1))
        self.customer.refresh_from_db()
        self.assertFalse(verify_customer_balance(self.customer)['is_consistent'])

    def test_alerts_for_overdue_and_over_limit(self):
        sell(self.customer)
        self.assertEqual(credit_alerts(), [])
        overdue = credit_alerts(now=timezone.now() + timedelta(days=31))
        self.assertEqual(overdue[0]['reasons'], ['overdue'])
        Customer.objects.filter(pk=self.customer.pk).update(credit_limit=D(1000))
        reasons = credit_alerts()[0]['reasons']
        self.assertIn('over_limit', reasons)


class CreditApiTests(APITestCase):
    def setUp(self):
        FuelRate.objects.create(fuel_type='petrol', rate=D('250.00'))
        self.owner = make_user('boss', 'owner')
        self.manager = make_user('mgr', 'manager')
        self.cashier = make_user('cash', 'cashier')
        self.customer = make_customer()

    def login(self, user):
        self.client.force_authenticate(user=user)

    def sale_payload(self, **overrides):
        data = {'customer': self.customer.pk, 'fuel_type': 'petrol', 'litres': '100'}
        data.update(overrides)
        return data

    def test_anonymous_and_cashier_blocked(self):
        self.assertIn(self.client.get(reverse('customer-list')).status_code, (401, 403))
        self.login(self.cashier)
        for name in ('customer-list', 'credit-transaction-list', 'customer-alerts', 'customer-summary'):
            self.assertEqual(self.client.get(reverse(name)).status_code, 403, name)

    def test_only_owner_sets_credit_limit(self):
        payload = {'name': 'New Co', 'phone': '03111234567', 'credit_limit': '5000'}
        self.login(self.manager)
        self.assertEqual(self.client.post(reverse('customer-list'), payload).status_code, 400)
        self.login(self.owner)
        response = self.client.post(reverse('customer-list'), payload)
        self.assertEqual(response.status_code, 201, response.data)

    def test_credit_sale_flow_ignores_client_amount(self):
        self.login(self.manager)
        response = self.client.post(
            reverse('credit-transaction-credit-sale'), self.sale_payload(amount='1', vehicle_number='lea-9'),
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(D(response.data['amount']), D('25000'))
        self.assertEqual(response.data['vehicle_number'], 'LEA-9')
        detail = self.client.get(reverse('customer-detail', args=[self.customer.pk]))
        self.assertEqual(D(detail.data['balance']), D('25000'))

    def test_limit_and_overpayment_rejected(self):
        self.login(self.manager)
        too_big = self.client.post(reverse('credit-transaction-credit-sale'), self.sale_payload(litres='5000'))
        self.assertEqual(too_big.status_code, 400)
        over = self.client.post(
            reverse('credit-transaction-payment'), {'customer': self.customer.pk, 'amount': '100'},
        )
        self.assertEqual(over.status_code, 400)

    def test_payment_and_reverse_permissions(self):
        self.login(self.manager)
        self.client.post(reverse('credit-transaction-credit-sale'), self.sale_payload())
        paid = self.client.post(
            reverse('credit-transaction-payment'), {'customer': self.customer.pk, 'amount': '5000'},
        )
        self.assertEqual(paid.status_code, 201, paid.data)
        url = reverse('credit-transaction-reverse', args=[paid.data['id']])
        self.assertEqual(self.client.post(url, {'reason': 'x'}).status_code, 403)
        self.login(self.owner)
        self.assertEqual(self.client.post(url, {}).status_code, 400)
        self.assertEqual(self.client.post(url, {'reason': 'Cheque bounce'}).status_code, 201)
        self.assertEqual(self.client.post(url, {'reason': 'Cheque bounce'}).status_code, 400)

    def test_cannot_deactivate_customer_with_due(self):
        self.login(self.owner)
        self.client.post(reverse('credit-transaction-credit-sale'), self.sale_payload())
        url = reverse('customer-detail', args=[self.customer.pk])
        self.assertEqual(self.client.patch(url, {'is_active': False}).status_code, 400)

    def test_statement_verify_alerts_summary(self):
        self.login(self.owner)
        self.client.post(reverse('credit-transaction-credit-sale'), self.sale_payload())
        statement = self.client.get(reverse('customer-statement', args=[self.customer.pk]))
        self.assertEqual(statement.status_code, 200)
        self.assertEqual(D(statement.data['closing_balance']), D('25000'))
        verify = self.client.get(reverse('customer-verify', args=[self.customer.pk]))
        self.assertTrue(verify.data['is_consistent'])
        self.assertEqual(self.client.get(reverse('customer-alerts')).status_code, 200)
        summary = self.client.get(reverse('customer-summary'))
        self.assertEqual(D(summary.data['total_due']), D('25000'))
        self.login(self.manager)
        verify_as_manager = self.client.get(reverse('customer-verify', args=[self.customer.pk]))
        self.assertEqual(verify_as_manager.status_code, 403)

    def test_ledger_is_read_only_and_paginated(self):
        self.login(self.manager)
        self.client.post(reverse('credit-transaction-credit-sale'), self.sale_payload())
        listing = self.client.get(reverse('credit-transaction-list'))
        self.assertEqual(listing.data['count'], 1)
        self.assertEqual(self.client.post(reverse('credit-transaction-list'), {}).status_code, 405)