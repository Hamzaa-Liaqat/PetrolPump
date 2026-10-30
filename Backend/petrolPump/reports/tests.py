from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone

from credit.models import Customer
from credit.services import record_credit_sale, record_payment
from inventory.models import Purchase, Tank
from inventory.services import apply_stock_movement
from rest_framework.test import APITestCase
from sales.models import FuelRate, Nozzle, Sale
from sales.services import void_sale
from staff.models import Attendance, Staff

from .calc import bucket_keys, bucket_start, month_bounds
from .models import Expense, ExpenseCategory
from .services import (
    build_alerts, dashboard_summary, monthly_report, sales_by_hour, sales_trend, void_expense,
)

User = get_user_model()


def D(value):
    return Decimal(str(value))


def make_user(username, role):
    user = User.objects.create_user(username=username, password='Test@12345')
    user.Profile.role = role
    user.Profile.save()
    return user


def make_pump():
    tank = Tank.objects.create(name='Tank-1', fuel_type='petrol', capacity=D(20000), reorder_level=D(1000))
    apply_stock_movement(tank_id=tank.pk, movement_type='adjustment', litres_change=5000, note='opening')
    nozzle = Nozzle.objects.create(name='N1', fuel_type='petrol', tank=tank, initial_reading=D(1000))
    FuelRate.objects.create(fuel_type='petrol', rate=D('250.00'))
    return tank, nozzle


def make_sale(nozzle, opening=1000, closing=1100):
    return Sale.objects.create(nozzle=nozzle, opening_reading=D(opening), closing_reading=D(closing))


class CalcTests(SimpleTestCase):
    def test_month_bounds_and_buckets(self):
        self.assertEqual(month_bounds(2024, 2), (date(2024, 2, 1), date(2024, 2, 29)))
        self.assertEqual(bucket_start(date(2026, 10, 2), 'week'), date(2026, 9, 28))
        self.assertEqual(bucket_start(date(2026, 10, 2), 'month'), date(2026, 10, 1))
        self.assertEqual(len(bucket_keys(date(2026, 9, 1), date(2026, 9, 30), 'day')), 30)
        self.assertEqual(bucket_keys(date(2026, 9, 28), date(2026, 10, 4), 'week'), [date(2026, 9, 28)])


class ExpenseModelTests(TestCase):
    def test_rules(self):
        self.assertNotIn('salary', ExpenseCategory.values)
        with self.assertRaises(DjangoValidationError):
            Expense(category='other', amount=D(5), note='').clean()
        future = timezone.localdate() + timedelta(days=1)
        with self.assertRaises(DjangoValidationError):
            Expense(category='rent', amount=D(5), date=future).clean()
        expense = Expense.objects.create(category='rent', amount=D(5000))
        expense.amount = D(1)
        with self.assertRaises(DjangoValidationError):
            expense.save()
        with self.assertRaises(DjangoValidationError):
            expense.delete()


class ReportServiceTests(TestCase):
    def setUp(self):
        self.tank, self.nozzle = make_pump()
        self.today = timezone.localdate()

    def test_same_month_of_another_year_is_not_mixed_in(self):
        make_sale(self.nozzle)
        Expense.objects.create(
            category='rent', amount=D(7000), date=date(self.today.year - 1, self.today.month, 1),
        )
        this_year = monthly_report(self.today.year, self.today.month)['totals']
        self.assertEqual(this_year['expenses'], D('0.00'))
        self.assertEqual(this_year['sales'], D('25000.00'))
        last_year = monthly_report(self.today.year - 1, self.today.month)['totals']
        self.assertEqual(last_year['expenses'], D('7000.00'))


    def test_monthly_report_numbers(self):
        make_sale(self.nozzle)
        Purchase.objects.create(
            tank=self.tank, supplier='PSO', tanker_number='T1', invoice_number='I1',
            litres=D(2000), invoice_amount=D(400000),
        )
        Expense.objects.create(category='electricity', amount=D(10000))
        staff = Staff.objects.create(name='Ahmed', phone='03001112233', daily_rate=D(1500))
        Attendance.objects.create(staff=staff, date=self.today, status='present')

        report = monthly_report(self.today.year, self.today.month)
        totals = report['totals']
        self.assertEqual(totals['sales'], D('25000.00'))
        self.assertEqual(totals['litres'], D('100.00'))
        self.assertEqual(totals['purchases'], D('400000.00'))
        self.assertEqual(totals['expenses'], D('10000.00'))
        self.assertEqual(totals['salaries'], D('1500.00'))
        self.assertTrue(totals['salaries_is_estimate'])
        self.assertEqual(totals['profit'], D('-386500.00'))

        fuel = report['by_fuel'][0]
        self.assertEqual(fuel['label'], 'Petrol')
        self.assertEqual(fuel['avg_rate'], D('250.00'))
        self.assertEqual(fuel['cost_per_litre'], D('200.00'))
        self.assertEqual(fuel['margin_per_litre'], D('50.00'))
        self.assertEqual(report['by_nozzle'][0]['name'], 'N1')
        self.assertEqual(report['expenses']['by_category'][0]['label'], 'Electricity bill')

    def test_void_sales_and_expenses_are_excluded(self):
        sale = make_sale(self.nozzle)
        expense = Expense.objects.create(category='rent', amount=D(5000))
        void_sale(sale_id=sale.pk, user=None, reason='typo')
        void_expense(expense_id=expense.pk, user=None, reason='typo')
        totals = monthly_report(self.today.year, self.today.month)['totals']
        self.assertEqual(totals['sales'], D('0.00'))
        self.assertEqual(totals['expenses'], D('0.00'))

    def test_trend_fills_empty_days_and_hours(self):
        make_sale(self.nozzle)
        points = sales_trend(self.today - timedelta(days=6), self.today, 'day')
        self.assertEqual(len(points), 7)
        self.assertEqual(points[-1]['amount'], D('25000.00'))
        self.assertEqual(points[0]['amount'], D('0.00'))
        hours = sales_by_hour(self.today, self.today)
        self.assertEqual(len(hours), 24)
        self.assertEqual(sum(hour['amount'] for hour in hours), D('25000.00'))

    def test_dashboard_cash_collected(self):
        make_sale(self.nozzle)
        customer = Customer.objects.create(name='Ali', phone='03001234567', credit_limit=D(100000))
        record_credit_sale(customer_id=customer.pk, fuel_type='petrol', litres=D(40))
        record_payment(customer_id=customer.pk, amount=D(4000))
        data = dashboard_summary()
        self.assertEqual(data['today_sales'], D('25000.00'))
        self.assertEqual(data['credit_sales_today'], D('10000.00'))
        self.assertEqual(data['credit_payments_today'], D('4000.00'))
        self.assertEqual(data['cash_collected'], D('19000.00'))
        self.assertEqual(data['credit_due_total'], D('6000.00'))
        self.assertEqual(len(data['tanks']), 1)
        self.assertEqual(len(data['trend_7_days']), 7)

    def test_alerts(self):
        apply_stock_movement(tank_id=self.tank.pk, movement_type='adjustment', litres_change=-4500)
        diesel = Tank.objects.create(name='Tank-D', fuel_type='diesel', capacity=D(5000), reorder_level=D(100))
        Nozzle.objects.create(name='N-D', fuel_type='diesel', tank=diesel, initial_reading=D(0))
        Staff.objects.create(name='Bilal', phone='03211234567', daily_rate=D(1500))
        customer = Customer.objects.create(name='Ali', phone='03001234567', credit_limit=D(100000))
        record_credit_sale(customer_id=customer.pk, fuel_type='petrol', litres=D(10))
        Customer.objects.filter(pk=customer.pk).update(credit_limit=D(100))
        shortage = Purchase(
            tank=self.tank, supplier='PSO', tanker_number='T1', invoice_number='I9',
            litres=D(1000), dip_before=D(0), dip_after=D(980), invoice_amount=D(200000),
        )
        shortage.clean()
        shortage.save()

        afternoon = timezone.localtime().replace(hour=15)
        alerts = build_alerts(now=afternoon)
        kinds = {alert['type'] for alert in alerts}
        self.assertTrue(kinds <= {
            'low_stock', 'missing_rate', 'credit', 'delivery_shortage',
            'unmarked_attendance', 'no_sales_today',
        })
        self.assertTrue({
            'low_stock', 'missing_rate', 'credit', 'delivery_shortage',
            'unmarked_attendance', 'no_sales_today',
        } <= kinds)
        low = [alert for alert in alerts if alert['type'] == 'low_stock'][0]
        self.assertEqual(low['severity'], 'critical')
        order = {'critical': 0, 'warning': 1, 'info': 2}
        levels = [order[alert['severity']] for alert in alerts]
        self.assertEqual(levels, sorted(levels))


class ReportApiTests(APITestCase):
    def setUp(self):
        self.owner = make_user('boss', 'owner')
        self.manager = make_user('mgr', 'manager')
        self.cashier = make_user('cash', 'cashier')
        self.tank, self.nozzle = make_pump()

    def login(self, user):
        self.client.force_authenticate(user=user)

    def test_anonymous_and_cashier_blocked(self):
        self.assertIn(self.client.get(reverse('dashboard-summary')).status_code, (401, 403))
        self.login(self.cashier)
        for name in ('dashboard-summary', 'report-summary', 'report-sales-trend',
                     'report-profit-loss', 'report-export', 'alerts', 'expense-list'):
            self.assertEqual(self.client.get(reverse(name)).status_code, 403, name)

    def test_dashboard_and_summary_shapes(self):
        make_sale(self.nozzle)
        self.login(self.manager)
        dashboard = self.client.get(reverse('dashboard-summary'))
        self.assertEqual(dashboard.status_code, 200)
        for key in ('today_sales', 'litres_sold', 'tanks', 'cash_collected', 'trend_7_days'):
            self.assertIn(key, dashboard.data)
        self.assertEqual(D(dashboard.data['today_sales']), D('25000'))

        summary = self.client.get(reverse('report-summary'))
        self.assertEqual(summary.status_code, 200)
        for key in ('sales', 'by_fuel', 'profit', 'totals', 'by_nozzle', 'daily'):
            self.assertIn(key, summary.data)
        self.assertEqual(D(summary.data['sales']), D('25000'))
        self.assertEqual(self.client.get(reverse('report-summary'), {'month': 13}).status_code, 400)
        self.assertEqual(self.client.get(reverse('report-summary'), {'year': 1999}).status_code, 400)

    def test_trend_and_profit_loss(self):
        make_sale(self.nozzle)
        self.login(self.manager)
        url = reverse('report-sales-trend')
        self.assertEqual(self.client.get(url, {'group': 'year'}).status_code, 400)
        long_range = {'date_from': '2020-01-01', 'date_to': '2026-01-01'}
        self.assertEqual(self.client.get(url, long_range).status_code, 400)
        ok = self.client.get(url, {'group': 'week'})
        self.assertEqual(ok.status_code, 200)
        self.assertIn('points', ok.data)
        self.assertEqual(len(ok.data['by_hour']), 24)

        year = timezone.localdate().year
        yearly = self.client.get(reverse('report-profit-loss'), {'year': year})
        self.assertEqual(len(yearly.data['months']), 12)
        single = self.client.get(reverse('report-profit-loss'), {'year': year, 'month': timezone.localdate().month})
        self.assertEqual(len(single.data['months']), 1)

    def test_exports(self):
        make_sale(self.nozzle)
        self.login(self.manager)
        url = reverse('report-export')
        pdf = self.client.get(url, {'file': 'pdf'})
        self.assertEqual(pdf.status_code, 200)
        self.assertEqual(pdf['Content-Type'], 'application/pdf')
        self.assertTrue(pdf.content.startswith(b'%PDF-'))
        xlsx = self.client.get(url, {'file': 'xlsx'})
        self.assertEqual(xlsx.status_code, 200)
        self.assertTrue(xlsx.content.startswith(b'PK'))
        self.assertEqual(self.client.get(url, {'file': 'csv'}).status_code, 400)

    def test_expense_api(self):
        self.login(self.manager)
        url = reverse('expense-list')
        created = self.client.post(url, {'category': 'electricity', 'amount': '12000', 'note': 'Sept bill'})
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(Expense.objects.get().created_by, self.manager)
        self.assertEqual(self.client.post(url, {'category': 'salary', 'amount': '100'}).status_code, 400)
        self.assertEqual(self.client.post(url, {'category': 'other', 'amount': '100'}).status_code, 400)
        self.assertEqual(len(self.client.get(url).data), 1)

        void_url = reverse('expense-void', args=[created.data['id']])
        self.assertEqual(self.client.post(void_url, {'reason': 'Galat'}).status_code, 403)
        self.login(self.owner)
        self.assertEqual(self.client.post(void_url, {}).status_code, 400)
        self.assertEqual(self.client.post(void_url, {'reason': 'Galat'}).status_code, 200)
        self.assertEqual(self.client.post(void_url, {'reason': 'Galat'}).status_code, 400)
        self.assertEqual(len(self.client.get(url).data), 0)
        self.assertEqual(len(self.client.get(url, {'include_void': '1'}).data), 1)