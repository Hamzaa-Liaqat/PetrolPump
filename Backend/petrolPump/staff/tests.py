from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APITestCase

from .models import Attendance, Payslip, Staff
from .services import (
    calculate_salary, cancel_payslip, generate_payslip, mark_payslip_paid, payroll_summary,
)

User = get_user_model()


def D(value):
    return Decimal(str(value))


def make_user(username, role):
    user = User.objects.create_user(username=username, password='Test@12345')
    user.Profile.role = role
    user.Profile.save()
    return user


def make_staff(**overrides):
    data = dict(name='Ahmed', phone='03001112233', position='attendant',
                shift='morning', daily_rate=D(1500))
    data.update(overrides)
    return Staff.objects.create(**data)


def last_month_days(count=4):
    last = timezone.localdate().replace(day=1) - timedelta(days=1)
    first = last.replace(day=1)
    return last.year, last.month, [first + timedelta(days=i) for i in range(count)]


def mark(staff, day, status):
    return Attendance.objects.create(staff=staff, date=day, status=status)


class StaffModelTests(TestCase):
    def setUp(self):
        self.staff = make_staff()

    def test_snapshot_default_shift_and_unique_per_day(self):
        today = timezone.localdate()
        record = mark(self.staff, today, 'present')
        self.assertEqual(record.daily_rate, D('1500.00'))
        self.assertEqual(record.shift, 'morning')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                mark(self.staff, today, 'absent')

    def test_future_date_and_inactive_staff_rejected(self):
        tomorrow = timezone.localdate() + timedelta(days=1)
        with self.assertRaises(DjangoValidationError):
            Attendance(staff=self.staff, date=tomorrow, status='present').clean()
        self.staff.is_active = False
        self.staff.save()
        with self.assertRaises(DjangoValidationError):
            Attendance(staff=self.staff, date=timezone.localdate(), status='present').clean()

    def test_salary_uses_snapshot_rates(self):
        year, month, days = last_month_days()
        mark(self.staff, days[0], 'present')
        mark(self.staff, days[1], 'half_day')
        mark(self.staff, days[2], 'absent')
        result = calculate_salary(self.staff, year, month)
        self.assertEqual(result['days_present'], D('1.5'))
        self.assertEqual(result['gross_amount'], D('2250.00'))
        self.assertEqual(result['absent_days'], 1)

        self.staff.daily_rate = D(2000)
        self.staff.save()
        mark(self.staff, days[3], 'present')
        self.assertEqual(calculate_salary(self.staff, year, month)['gross_amount'], D('4250.00'))

    def test_payslip_rules(self):
        year, month, days = last_month_days()
        mark(self.staff, days[0], 'present')
        mark(self.staff, days[1], 'half_day')
        today = timezone.localdate()
        with self.assertRaises(DRFValidationError):
            generate_payslip(staff_id=self.staff.pk, year=today.year, month=today.month, allow_unmarked=True)
        with self.assertRaises(DRFValidationError):
            generate_payslip(staff_id=self.staff.pk, year=year, month=month)
        with self.assertRaises(DRFValidationError):
            generate_payslip(staff_id=self.staff.pk, year=year, month=month,
                             deduction=D(99999), allow_unmarked=True)
        payslip = generate_payslip(staff_id=self.staff.pk, year=year, month=month,
                                   deduction=D(250), allow_unmarked=True)
        self.assertEqual(payslip.gross_amount, D('2250.00'))
        self.assertEqual(payslip.net_amount, D('2000.00'))
        self.assertEqual(payslip.days_present, D('1.5'))
        with self.assertRaises(DRFValidationError):
            generate_payslip(staff_id=self.staff.pk, year=year, month=month, allow_unmarked=True)
        payslip.deduction = D(1)
        with self.assertRaises(DjangoValidationError):
            payslip.save()

    def test_attendance_locked_after_payslip_until_cancelled(self):
        year, month, days = last_month_days()
        row = mark(self.staff, days[0], 'present')
        payslip = generate_payslip(staff_id=self.staff.pk, year=year, month=month, allow_unmarked=True)
        with self.assertRaises(DjangoValidationError):
            mark(self.staff, days[1], 'present')
        row.status = 'absent'
        with self.assertRaises(DjangoValidationError):
            row.save()
        with self.assertRaises(DjangoValidationError):
            row.delete()
        cancel_payslip(payslip_id=payslip.pk)
        row.save()
        self.assertEqual(Attendance.objects.get(pk=row.pk).status, 'absent')

    def test_paid_payslip_rules_and_summary(self):
        year, month, days = last_month_days()
        mark(self.staff, days[0], 'present')
        payslip = generate_payslip(staff_id=self.staff.pk, year=year, month=month,
                                   deduction=D(500), allow_unmarked=True)
        before = payroll_summary(year, month)
        self.assertEqual(before['net'], D('1000.00'))
        self.assertEqual(before['unpaid'], D('1000.00'))
        paid = mark_payslip_paid(payslip_id=payslip.pk, user=None)
        self.assertTrue(paid.is_paid)
        with self.assertRaises(DRFValidationError):
            mark_payslip_paid(payslip_id=payslip.pk, user=None)
        with self.assertRaises(DRFValidationError):
            cancel_payslip(payslip_id=payslip.pk)
        after = payroll_summary(year, month)
        self.assertEqual(after['paid'], D('1000.00'))
        self.assertEqual(after['unpaid'], D('0.00'))


class StaffApiTests(APITestCase):
    def setUp(self):
        self.owner = make_user('boss', 'owner')
        self.manager = make_user('mgr', 'manager')
        self.cashier = make_user('cash', 'cashier')
        self.staff = make_staff()

    def login(self, user):
        self.client.force_authenticate(user=user)

    def test_anonymous_and_cashier_blocked(self):
        self.assertIn(self.client.get(reverse('attendance-list')).status_code, (401, 403))
        self.login(self.cashier)
        for name in ('attendance-list', 'staff-list', 'payslip-list', 'attendance-sheet'):
            self.assertEqual(self.client.get(reverse(name)).status_code, 403, name)

    def test_manager_cannot_see_staff_or_payslips(self):
        self.login(self.manager)
        self.assertEqual(self.client.get(reverse('staff-list')).status_code, 403)
        self.assertEqual(self.client.get(reverse('payslip-list')).status_code, 403)

    def test_attendance_create_toggle_and_rules(self):
        self.login(self.manager)
        response = self.client.post(reverse('attendance-list'), {'staff': self.staff.pk, 'status': 'present'})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Attendance.objects.get().marked_by, self.manager)
        self.assertNotIn('daily_rate', response.data)

        duplicate = self.client.post(reverse('attendance-list'), {'staff': self.staff.pk, 'status': 'absent'})
        self.assertEqual(duplicate.status_code, 400)

        url = reverse('attendance-detail', args=[response.data['id']])
        self.assertEqual(self.client.patch(url, {'status': 'absent'}).status_code, 200)
        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        self.assertEqual(self.client.patch(url, {'date': yesterday}).status_code, 400)
        self.assertEqual(self.client.put(url, {}).status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 403)

        self.login(self.owner)
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_default_list_is_today(self):
        today = timezone.localdate()
        mark(self.staff, today, 'present')
        mark(self.staff, today - timedelta(days=3), 'present')
        self.login(self.manager)
        self.assertEqual(len(self.client.get(reverse('attendance-list')).data), 1)

    def test_sheet_and_mark_day(self):
        self.login(self.manager)
        sheet = self.client.get(reverse('attendance-sheet'))
        self.assertEqual(sheet.data['summary']['unmarked'], 1)
        self.assertIsNone(sheet.data['rows'][0]['status'])

        url = reverse('attendance-mark-day')
        first = self.client.post(url, {'entries': [{'staff': self.staff.pk, 'status': 'present'}]}, format='json')
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(first.data['sheet']['summary']['present'], 1)
        second = self.client.post(url, {'entries': [{'staff': self.staff.pk, 'status': 'absent'}]}, format='json')
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data['sheet']['summary']['absent'], 1)
        self.assertEqual(Attendance.objects.count(), 1)

        duplicate = self.client.post(url, {'entries': [
            {'staff': self.staff.pk, 'status': 'present'},
            {'staff': self.staff.pk, 'status': 'absent'},
        ]}, format='json')
        self.assertEqual(duplicate.status_code, 400)

    def test_owner_staff_crud_and_protected_delete(self):
        self.login(self.owner)
        created = self.client.post(reverse('staff-list'), {
            'name': 'Bilal', 'phone': '03211234567', 'position': 'cashier',
            'shift': 'evening', 'daily_rate': '1800',
        })
        self.assertEqual(created.status_code, 201, created.data)
        mark(self.staff, timezone.localdate(), 'present')
        response = self.client.delete(reverse('staff-detail', args=[self.staff.pk]))
        self.assertEqual(response.status_code, 409)

    def test_payslip_flow_and_preview(self):
        year, month, days = last_month_days()
        mark(self.staff, days[0], 'present')
        mark(self.staff, days[1], 'half_day')
        self.login(self.owner)

        preview = self.client.get(
            reverse('staff-salary-preview', args=[self.staff.pk]), {'year': year, 'month': month},
        )
        self.assertEqual(D(preview.data['gross_amount']), D('2250'))
        self.assertFalse(preview.data['is_final'])

        payload = {'staff': self.staff.pk, 'year': year, 'month': month, 'deduction': '250'}
        self.assertEqual(self.client.post(reverse('payslip-generate'), payload).status_code, 400)
        generated = self.client.post(reverse('payslip-generate'), dict(payload, allow_unmarked='true'))
        self.assertEqual(generated.status_code, 201, generated.data)
        self.assertEqual(D(generated.data['net_amount']), D('2000'))

        paid_url = reverse('payslip-mark-paid', args=[generated.data['id']])
        self.assertEqual(self.client.post(paid_url, {}).status_code, 200)
        self.assertEqual(self.client.post(paid_url, {}).status_code, 400)
        cancel_url = reverse('payslip-cancel', args=[generated.data['id']])
        self.assertEqual(self.client.post(cancel_url).status_code, 400)

        summary = self.client.get(reverse('payslip-summary'), {'year': year, 'month': month})
        self.assertEqual(D(summary.data['paid']), D('2000'))
        self.assertEqual(D(summary.data['unpaid']), D('0'))

        self.login(self.manager)
        self.assertEqual(self.client.post(reverse('payslip-generate'), payload).status_code, 403)

    def test_cancel_unpaid_payslip_unlocks_month(self):
        year, month, days = last_month_days()
        mark(self.staff, days[0], 'present')
        self.login(self.owner)
        payload = {'staff': self.staff.pk, 'year': year, 'month': month, 'allow_unmarked': 'true'}
        payslip_id = self.client.post(reverse('payslip-generate'), payload).data['id']
        self.assertEqual(self.client.post(reverse('payslip-cancel', args=[payslip_id])).status_code, 204)
        self.assertEqual(Payslip.objects.count(), 0)
        again = self.client.post(reverse('attendance-list'), {
            'staff': self.staff.pk, 'status': 'present', 'date': days[1].isoformat(),
        })
        self.assertEqual(again.status_code, 201, again.data)
