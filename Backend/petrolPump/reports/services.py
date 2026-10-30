from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from credit.models import CreditTransaction
from credit.services import credit_alerts, credit_summary
from inventory.models import FuelType, Purchase, Tank
from petrolPump.utils import day_start
from sales.models import FuelRate, Nozzle, Sale
from staff.models import Payslip, Staff
from staff.services import attendance_sheet, calculate_salary

from .calc import bucket_keys, bucket_start, month_bounds
from .models import Expense, ExpenseCategory

TWO_PLACES = Decimal('0.01')
ZERO = Value(Decimal('0.00'))
MONEY = DecimalField(max_digits=16, decimal_places=2)
SHORTAGE_ALERT_PERCENT = Decimal('0.5')
NO_SALE_ALERT_AFTER_HOUR = 12
SEVERITY_ORDER = {'critical': 0, 'warning': 1, 'info': 2}


def _sum(field, **kwargs):
    return Coalesce(Sum(field, **kwargs), ZERO, output_field=MONEY)


def _ratio(numerator, denominator):
    if not denominator:
        return None
    return (numerator / denominator).quantize(TWO_PLACES)


def _fuel_label(fuel_type):
    return FuelType(fuel_type).label if fuel_type in FuelType.values else fuel_type


def _sales_in(start, end):
    return Sale.objects.active().filter(
        timestamp__gte=day_start(start),
        timestamp__lt=day_start(end + timedelta(days=1)),
    )


# ---------- sales ----------

def sales_totals(start, end):
    data = _sales_in(start, end).aggregate(
        amount_sum=_sum('amount'), litres_sum=_sum('litres'), entries=Count('id'),
    )
    return {'amount': data['amount_sum'], 'litres': data['litres_sum'], 'entries': data['entries']}


def sales_by_fuel(start, end):
    rows = (
        _sales_in(start, end).values('nozzle__fuel_type')
        .annotate(amount_sum=_sum('amount'), litres_sum=_sum('litres'))
        .order_by('-amount_sum')
    )
    return [
        {
            'fuel_type': row['nozzle__fuel_type'],
            'label': _fuel_label(row['nozzle__fuel_type']),
            'litres': row['litres_sum'],
            'amount': row['amount_sum'],
            'total': row['amount_sum'],
        }
        for row in rows
    ]


def sales_by_nozzle(start, end):
    rows = (
        _sales_in(start, end).values('nozzle_id', 'nozzle__name', 'nozzle__fuel_type')
        .annotate(amount_sum=_sum('amount'), litres_sum=_sum('litres'))
        .order_by('-amount_sum')
    )
    return [
        {
            'nozzle': row['nozzle_id'],
            'name': row['nozzle__name'],
            'fuel_type': row['nozzle__fuel_type'],
            'label': _fuel_label(row['nozzle__fuel_type']),
            'litres': row['litres_sum'],
            'amount': row['amount_sum'],
        }
        for row in rows
    ]


def sales_trend(start, end, group='day'):
    buckets = {
        key: {'period': key, 'litres': Decimal('0.00'), 'amount': Decimal('0.00'), 'entries': 0}
        for key in bucket_keys(start, end, group)
    }
    rows = _sales_in(start, end).values_list('timestamp', 'litres', 'amount')
    for stamp, litres, amount in rows:
        bucket = buckets[bucket_start(timezone.localtime(stamp).date(), group)]
        bucket['litres'] += litres
        bucket['amount'] += amount
        bucket['entries'] += 1
    return [buckets[key] for key in sorted(buckets)]


def sales_by_hour(start, end):
    hours = [
        {'hour': hour, 'litres': Decimal('0.00'), 'amount': Decimal('0.00'), 'entries': 0}
        for hour in range(24)
    ]
    for stamp, litres, amount in _sales_in(start, end).values_list('timestamp', 'litres', 'amount'):
        bucket = hours[timezone.localtime(stamp).hour]
        bucket['litres'] += litres
        bucket['amount'] += amount
        bucket['entries'] += 1
    return hours


# ---------- credit / salary ----------

def credit_flow(start, end):
    Type = CreditTransaction.Type
    queryset = CreditTransaction.objects.filter(
        timestamp__gte=day_start(start), timestamp__lt=day_start(end + timedelta(days=1)),
    )
    data = queryset.aggregate(
        sale_sum=_sum('amount', filter=Q(type=Type.SALE)),
        sale_reversed=_sum('amount', filter=Q(type=Type.SALE_REVERSAL)),
        payment_sum=_sum('amount', filter=Q(type=Type.PAYMENT)),
        payment_reversed=_sum('amount', filter=Q(type=Type.PAYMENT_REVERSAL)),
    )
    return {
        'credit_sales': data['sale_sum'] - data['sale_reversed'],
        'credit_payments': data['payment_sum'] - data['payment_reversed'],
    }


def salary_cost(year, month):
    payslips = Payslip.objects.filter(year=year, month=month)
    with_payslip = set(payslips.values_list('staff_id', flat=True))
    amount = payslips.aggregate(net_sum=_sum('net_amount'))['net_sum']
    is_estimate = False
    for staff in Staff.objects.filter(is_active=True).exclude(pk__in=with_payslip):
        gross = calculate_salary(staff, year, month)['gross_amount']
        if gross > 0:
            amount += gross
            is_estimate = True
    return {'amount': amount, 'is_estimate': is_estimate}


# ---------- monthly report / profit & loss ----------

def monthly_report(year, month):
    start, end = month_bounds(year, month)
    totals = sales_totals(start, end)
    by_fuel = sales_by_fuel(start, end)

    purchase_qs = Purchase.objects.filter(date__gte=start, date__lte=end)
    purchases = purchase_qs.aggregate(
        cost=_sum('invoice_amount'), litres_invoiced=_sum('litres'),
        litres_received=_sum('received_litres'), count=Count('id'),
    )
    purchases['shortage_litres'] = purchases['litres_invoiced'] - purchases['litres_received']
    bought = {
        row['tank__fuel_type']: row
        for row in purchase_qs.values('tank__fuel_type')
        .annotate(cost_sum=_sum('invoice_amount'), received_sum=_sum('received_litres'))
        .order_by()
    }
    for row in by_fuel:
        avg_rate = _ratio(row['amount'], row['litres'])
        purchased = bought.get(row['fuel_type'])
        cost_per_litre = _ratio(purchased['cost_sum'], purchased['received_sum']) if purchased else None
        margin = avg_rate - cost_per_litre if avg_rate is not None and cost_per_litre is not None else None
        row.update({'avg_rate': avg_rate, 'cost_per_litre': cost_per_litre, 'margin_per_litre': margin})

    expense_qs = Expense.objects.active().filter(date__gte=start, date__lte=end)
    expense_total = expense_qs.aggregate(total=_sum('amount'))['total']
    by_category = [
        {
            'category': row['category'],
            'label': ExpenseCategory(row['category']).label,
            'total': row['total'],
        }
        for row in expense_qs.values('category').annotate(total=_sum('amount')).order_by('-total')
    ]

    salaries = salary_cost(year, month)
    credit = credit_flow(start, end)
    credit['outstanding_now'] = credit_summary()['total_due']

    profit = totals['amount'] - purchases['cost'] - expense_total - salaries['amount']
    return {
        'year': year,
        'month': month,
        'period': f'{year}-{month:02d}',
        'date_from': start,
        'date_to': end,
        'totals': {
            'sales': totals['amount'],
            'litres': totals['litres'],
            'entries': totals['entries'],
            'purchases': purchases['cost'],
            'expenses': expense_total,
            'salaries': salaries['amount'],
            'salaries_is_estimate': salaries['is_estimate'],
            'profit': profit,
        },
        'by_fuel': by_fuel,
        'by_nozzle': sales_by_nozzle(start, end),
        'daily': sales_trend(start, end, 'day'),
        'purchases': purchases,
        'expenses': {'by_category': by_category},
        'credit': credit,
    }


# ---------- expenses ----------

@transaction.atomic
def void_expense(*, expense_id, user, reason):
    expense = Expense.objects.select_for_update().get(pk=expense_id)
    if expense.is_void:
        raise ValidationError({'detail': 'Ye expense pehle hi void ho chuka hai.'})
    Expense.objects.filter(pk=expense.pk).update(
        is_void=True, void_reason=reason, voided_by=user, voided_at=timezone.now(),
    )
    return Expense.objects.get(pk=expense.pk)


# ---------- alerts ----------

def _alert(kind, severity, title, message, data=None):
    return {'type': kind, 'severity': severity, 'title': title, 'message': message, 'data': data or {}}


def build_alerts(now=None):
    now = now or timezone.localtime()
    today = now.date()
    alerts = []

    low_tanks = Tank.objects.filter(is_active=True, current_stock__lt=F('reorder_level'))
    for tank in low_tanks:
        severity = 'critical' if tank.current_stock <= tank.reorder_level / 2 else 'warning'
        alerts.append(_alert(
            'low_stock', severity, f'{tank.name} mein tel kam hai',
            f'{tank.current_stock} litre baqi hai (limit {tank.reorder_level}).', {'tank': tank.pk},
        ))

    rates = FuelRate.current_rates()
    active_fuels = set(Nozzle.objects.filter(is_active=True).values_list('fuel_type', flat=True))
    for fuel_type in sorted(active_fuels):
        if rates.get(fuel_type) is None:
            alerts.append(_alert(
                'missing_rate', 'critical', f'{_fuel_label(fuel_type)} ka rate set nahi',
                'Rate ke bagair is fuel ki sale ya credit sale nahi ho sakti.', {'fuel_type': fuel_type},
            ))

    for item in credit_alerts():
        parts = []
        if 'over_limit' in item['reasons']:
            parts.append('limit se zyada udhaar')
        if 'overdue' in item['reasons']:
            parts.append(f"{item['days_since_last_activity']} din se payment nahi")
        alerts.append(_alert(
            'credit', 'warning', f"{item['name']}: udhaar",
            f"Baqi {item['balance']} ({', '.join(parts)}).", {'customer': item['customer']},
        ))

    recent = Purchase.objects.filter(date__gte=today - timedelta(days=6)).select_related('tank')
    for purchase in recent:
        shortage = purchase.litres - purchase.received_litres
        if shortage > 0 and shortage * 100 / purchase.litres > SHORTAGE_ALERT_PERCENT:
            alerts.append(_alert(
                'delivery_shortage', 'warning', f'Tanker mein tel kam mila ({purchase.supplier})',
                f'Invoice {purchase.invoice_number}: {shortage} litre kam '
                f'({purchase.litres} likha, {purchase.received_litres} mila).', {'purchase': purchase.pk},
            ))

    unmarked = attendance_sheet(today)['summary']['unmarked']
    if unmarked:
        alerts.append(_alert(
            'unmarked_attendance', 'info', 'Aaj ki attendance baqi hai',
            f'{unmarked} staff member ki attendance mark nahi hui.',
        ))

    if now.hour >= NO_SALE_ALERT_AFTER_HOUR:
        sold = set(_sales_in(today, today).values_list('nozzle_id', flat=True))
        for nozzle in Nozzle.objects.filter(is_active=True).exclude(pk__in=sold):
            alerts.append(_alert(
                'no_sales_today', 'info', f'{nozzle.name} ki aaj koi sale darj nahi',
                'Agar tel nikla hai to reading darj karna na bhoolein.', {'nozzle': nozzle.pk},
            ))

    alerts.sort(key=lambda alert: SEVERITY_ORDER[alert['severity']])
    return alerts


# ---------- dashboard ----------

def dashboard_summary():
    today = timezone.localdate()
    totals = sales_totals(today, today)
    credit_today = credit_flow(today, today)
    credit_total = credit_summary()
    cash_collected = totals['amount'] - credit_today['credit_sales'] + credit_today['credit_payments']

    tanks = [
        {
            'id': tank.pk, 'name': tank.name, 'fuel_type': tank.fuel_type,
            'current_stock': tank.current_stock, 'capacity': tank.capacity,
            'reorder_level': tank.reorder_level, 'fill_percent': tank.fill_percent,
            'is_low': tank.is_low,
        }
        for tank in Tank.objects.filter(is_active=True)
    ]
    return {
        'date': today,
        'today_sales': totals['amount'],
        'litres_sold': totals['litres'],
        'sale_entries': totals['entries'],
        'cash_collected': cash_collected,
        'credit_sales_today': credit_today['credit_sales'],
        'credit_payments_today': credit_today['credit_payments'],
        'by_fuel_today': sales_by_fuel(today, today),
        'tanks': tanks,
        'low_stock_tanks': [tank for tank in tanks if tank['is_low']],
        'credit_due_total': credit_total['total_due'],
        'credit': credit_total,
        'trend_7_days': sales_trend(today - timedelta(days=6), today, 'day'),
        'staff_today': attendance_sheet(today)['summary'],
        'alerts_count': len(build_alerts()),
    }