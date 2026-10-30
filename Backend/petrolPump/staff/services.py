import calendar
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from petrolPump.utils import as_drf_error

from .models import Attendance, Payslip, Staff

TWO_PLACES = Decimal('0.01')
ONE_PLACE = Decimal('0.1')
ZERO = Value(Decimal('0.00'))
MONEY = DecimalField(max_digits=14, decimal_places=2)
FACTOR = {'present': Decimal('1'), 'half_day': Decimal('0.5'), 'absent': Decimal('0')}


def _to_decimal(value):
    return Decimal(str(value)).quantize(TWO_PLACES)


def calculate_salary(staff, year, month):
    days_in_month = calendar.monthrange(year, month)[1]
    first = date(year, month, 1)
    last = date(year, month, days_in_month)
    rows = list(Attendance.objects.filter(staff=staff, date__gte=first, date__lte=last))

    days_present = Decimal('0')
    gross = Decimal('0')
    absent_days = 0
    for row in rows:
        factor = FACTOR[row.status]
        days_present += factor
        gross += row.daily_rate * factor
        if row.status == 'absent':
            absent_days += 1
    return {
        'year': year,
        'month': month,
        'days_in_month': days_in_month,
        'marked_days': len(rows),
        'unmarked_days': days_in_month - len(rows),
        'absent_days': absent_days,
        'days_present': days_present.quantize(ONE_PLACE),
        'gross_amount': gross.quantize(TWO_PLACES, rounding=ROUND_HALF_UP),
    }


@transaction.atomic
def generate_payslip(*, staff_id, year, month, deduction=Decimal('0.00'),
                     deduction_note='', allow_unmarked=False, user=None):
    staff = Staff.objects.select_for_update().get(pk=staff_id)
    today = timezone.localdate()
    if (year, month) >= (today.year, today.month):
        raise ValidationError({'month': 'Salary sirf mukammal ho chuke mahine ki banti hai.'})
    if Payslip.objects.filter(staff=staff, year=year, month=month).exists():
        raise ValidationError({'detail': 'Is mahine ki payslip pehle hi ban chuki hai.'})

    result = calculate_salary(staff, year, month)
    if result['unmarked_days'] and not allow_unmarked:
        raise ValidationError({
            'detail': f"{result['unmarked_days']} din ki attendance mark nahi hai. Pehle mark karein, "
                      f"ya allow_unmarked=true bhejein (unmarked din absent ginay jayenge)."
        })

    deduction = _to_decimal(deduction)
    gross = result['gross_amount']
    if deduction > gross:
        raise ValidationError({'deduction': f'Deduction gross salary {gross} se zyada nahi ho sakti.'})
    return Payslip.objects.create(
        staff=staff, year=year, month=month, days_present=result['days_present'],
        gross_amount=gross, deduction=deduction, deduction_note=deduction_note,
        net_amount=gross - deduction, generated_by=user,
    )


@transaction.atomic
def mark_payslip_paid(*, payslip_id, user, paid_on=None):
    payslip = Payslip.objects.select_for_update().get(pk=payslip_id)
    if payslip.is_paid:
        raise ValidationError({'detail': 'Ye payslip pehle hi paid hai.'})
    paid_on = paid_on or timezone.localdate()
    if paid_on > timezone.localdate():
        raise ValidationError({'paid_on': 'Future ki date nahi ho sakti.'})
    Payslip.objects.filter(pk=payslip.pk).update(paid_on=paid_on, paid_by=user)
    return Payslip.objects.get(pk=payslip.pk)


@transaction.atomic
def cancel_payslip(*, payslip_id):
    payslip = Payslip.objects.select_for_update().get(pk=payslip_id)
    if payslip.is_paid:
        raise ValidationError({'detail': 'Paid payslip cancel nahi ho sakti.'})
    Payslip.objects.filter(pk=payslip.pk).delete()


@transaction.atomic
def mark_day(*, day, entries, user):
    if day > timezone.localdate():
        raise ValidationError({'date': 'Future ki attendance nahi lag sakti.'})
    records = []
    for entry in entries:
        record = Attendance.objects.filter(staff=entry['staff'], date=day).first()
        if record is None:
            record = Attendance(staff=entry['staff'], date=day)
        record.status = entry['status']
        if entry.get('shift'):
            record.shift = entry['shift']
        record.marked_by = user
        try:
            record.clean()
            record.save()
        except DjangoValidationError as exc:
            raise as_drf_error(exc)
        records.append(record)
    return records


def attendance_sheet(day):
    staff_list = Staff.objects.filter(is_active=True).order_by('name')
    marked = {row.staff_id: row for row in Attendance.objects.filter(date=day)}
    rows = []
    summary = {'present': 0, 'half_day': 0, 'absent': 0, 'unmarked': 0}
    for staff in staff_list:
        record = marked.get(staff.pk)
        summary[record.status if record else 'unmarked'] += 1
        rows.append({
            'staff': staff.pk, 'name': staff.name, 'position': staff.position,
            'default_shift': staff.shift,
            'attendance_id': record.pk if record else None,
            'status': record.status if record else None,
            'shift': record.shift if record else None,
        })
    return {'date': day, 'summary': summary, 'rows': rows}


def payroll_summary(year, month=None):
    payslips = Payslip.objects.filter(year=year)
    if month:
        payslips = payslips.filter(month=month)
    totals = payslips.aggregate(
        payslips=Count('id'),
        gross=Coalesce(Sum('gross_amount'), ZERO, output_field=MONEY),
        deductions=Coalesce(Sum('deduction'), ZERO, output_field=MONEY),
        net=Coalesce(Sum('net_amount'), ZERO, output_field=MONEY),
        paid=Coalesce(Sum('net_amount', filter=Q(paid_on__isnull=False)), ZERO, output_field=MONEY),
    )
    totals['unpaid'] = totals['net'] - totals['paid']
    return totals