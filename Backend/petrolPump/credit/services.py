from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Count, DecimalField, Max, Min, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from petrolPump.utils import day_start
from sales.models import FuelRate

from .models import CreditTransaction, Customer

TWO_PLACES = Decimal('0.01')
ZERO = Value(Decimal('0.00'))
MONEY = DecimalField(max_digits=14, decimal_places=2)
OVERDUE_AFTER_DAYS = 30


def _to_decimal(value):
    return Decimal(str(value)).quantize(TWO_PLACES)


def _post(customer, tx_type, amount, new_balance, *, user, **extra):
    customer.balance = new_balance
    customer.save(update_fields=['balance', 'updated_at'])
    return CreditTransaction.objects.create(
        customer=customer, type=tx_type, amount=amount,
        balance_after=new_balance, created_by=user, **extra,
    )


@transaction.atomic
def record_credit_sale(*, customer_id, fuel_type, litres, vehicle_number='',
                       reference='', note='', user=None):
    litres = _to_decimal(litres)
    customer = Customer.objects.select_for_update().get(pk=customer_id)
    if not customer.is_active:
        raise ValidationError({'customer': 'Ye customer inactive hai.'})

    current = FuelRate.current_for(fuel_type)
    if current is None:
        raise ValidationError({'fuel_type': 'Is fuel ka rate set nahi. Pehle Fuel Rate add karein.'})

    amount = (litres * current.rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    new_balance = customer.balance + amount
    if new_balance > customer.credit_limit:
        raise ValidationError({
            'litres': f'Credit limit {customer.credit_limit} hai, abhi sirf '
                      f'{customer.available_credit} ka udhaar baqi hai (is sale ki raqam {amount}).'
        })
    return _post(
        customer, CreditTransaction.Type.SALE, amount, new_balance, user=user,
        fuel_type=fuel_type, litres=litres, rate=current.rate,
        vehicle_number=vehicle_number, reference=reference, note=note,
    )


@transaction.atomic
def record_payment(*, customer_id, amount, reference='', note='', user=None):
    amount = _to_decimal(amount)
    customer = Customer.objects.select_for_update().get(pk=customer_id)
    if amount > customer.balance:
        raise ValidationError({
            'amount': f'Payment baqi udhaar {customer.balance} se zyada nahi ho sakti.'
        })
    return _post(
        customer, CreditTransaction.Type.PAYMENT, amount, customer.balance - amount,
        user=user, reference=reference, note=note,
    )


@transaction.atomic
def reverse_transaction(*, transaction_id, reason, user=None):
    customer_id = CreditTransaction.objects.values_list('customer_id', flat=True).get(pk=transaction_id)
    customer = Customer.objects.select_for_update().get(pk=customer_id)
    original = CreditTransaction.objects.select_for_update().get(pk=transaction_id)

    Type = CreditTransaction.Type
    if original.type not in (Type.SALE, Type.PAYMENT):
        raise ValidationError({'detail': 'Reversal ko reverse nahi kiya ja sakta.'})
    if CreditTransaction.objects.filter(reversal_of=original).exists():
        raise ValidationError({'detail': 'Ye entry pehle hi reverse ho chuki hai.'})

    if original.type == Type.SALE:
        reversal_type = Type.SALE_REVERSAL
        new_balance = customer.balance - original.amount
        if new_balance < 0:
            raise ValidationError({
                'detail': 'Is sale ke baad payments aa chuki hain. Pehle un payments ko reverse karein.'
            })
    else:
        reversal_type = Type.PAYMENT_REVERSAL
        new_balance = customer.balance + original.amount

    return _post(
        customer, reversal_type, original.amount, new_balance, user=user,
        reversal_of=original, reference=f'reversal-of:{original.pk}',
        note=f'Reversal: {reason}'[:200],
    )


def customer_statement(customer, start, end):
    start_dt = day_start(start)
    end_dt = day_start(end + timedelta(days=1))
    entries = CreditTransaction.objects.filter(customer=customer)

    before = entries.filter(timestamp__lt=start_dt).order_by('-id') \
        .values_list('balance_after', flat=True).first()
    opening = before if before is not None else Decimal('0.00')

    period = entries.filter(timestamp__gte=start_dt, timestamp__lt=end_dt)
    totals = period.aggregate(
        debits=Coalesce(Sum('amount', filter=Q(type__in=CreditTransaction.DEBIT_TYPES)),
                        ZERO, output_field=MONEY),
        credits=Coalesce(Sum('amount', filter=Q(type__in=CreditTransaction.CREDIT_TYPES)),
                         ZERO, output_field=MONEY),
    )
    return {
        'opening_balance': opening,
        'total_debits': totals['debits'],
        'total_credits': totals['credits'],
        'closing_balance': opening + totals['debits'] - totals['credits'],
        'entries': period.order_by('id'),
    }


def verify_customer_balance(customer):
    totals = CreditTransaction.objects.filter(customer=customer).aggregate(
        debits=Coalesce(Sum('amount', filter=Q(type__in=CreditTransaction.DEBIT_TYPES)),
                        ZERO, output_field=MONEY),
        credits=Coalesce(Sum('amount', filter=Q(type__in=CreditTransaction.CREDIT_TYPES)),
                         ZERO, output_field=MONEY),
    )
    computed = totals['debits'] - totals['credits']
    last = CreditTransaction.objects.filter(customer=customer).order_by('-id') \
        .values_list('balance_after', flat=True).first()
    last = last if last is not None else Decimal('0.00')
    return {
        'stored_balance': customer.balance,
        'computed_balance': computed,
        'last_entry_balance': last,
        'is_consistent': customer.balance == computed == last,
    }


def credit_alerts(now=None):
    now = now or timezone.now()
    Type = CreditTransaction.Type
    customers = Customer.objects.filter(is_active=True, balance__gt=0).annotate(
        last_payment_at=Max('transactions__timestamp', filter=Q(transactions__type=Type.PAYMENT)),
        first_sale_at=Min('transactions__timestamp', filter=Q(transactions__type=Type.SALE)),
    )
    alerts = []
    for customer in customers:
        reasons = []
        if customer.balance > customer.credit_limit:
            reasons.append('over_limit')
        reference = customer.last_payment_at or customer.first_sale_at
        days = (now - reference).days if reference else 0
        if reference and days >= OVERDUE_AFTER_DAYS:
            reasons.append('overdue')
        if reasons:
            alerts.append({
                'customer': customer.pk, 'name': customer.name, 'phone': customer.phone,
                'balance': customer.balance, 'credit_limit': customer.credit_limit,
                'days_since_last_activity': days, 'reasons': reasons,
            })
    return sorted(alerts, key=lambda alert: alert['balance'], reverse=True)


def credit_summary():
    active = Customer.objects.filter(is_active=True)
    totals = active.aggregate(
        total_due=Coalesce(Sum('balance'), ZERO, output_field=MONEY),
        customers_with_due=Count('id', filter=Q(balance__gt=0)),
    )
    top = list(active.filter(balance__gt=0).order_by('-balance').values('id', 'name', 'balance')[:5])
    return {**totals, 'top_debtors': top, 'alerts_count': len(credit_alerts())}