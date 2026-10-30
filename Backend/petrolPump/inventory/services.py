from collections import namedtuple
from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import StockMovement, Tank

TWO_PLACES = Decimal('0.01')
DIP_VARIANCE_TOLERANCE_PERCENT = Decimal('0.5')

ReconcileResult = namedtuple(
    'ReconcileResult',
    'tank movement previous_stock variance variance_percent is_significant',
)


def _to_decimal(value):
    return Decimal(str(value)).quantize(TWO_PLACES)

def _post_movement(tank, movement_type, litres_change, reference, note, user):
    new_balance = tank.current_stock + litres_change
    if new_balance < 0:
        raise ValidationError({
            'stock': f'{tank.name} mein sirf {tank.current_stock} litre hai, '
                     f'{abs(litres_change)} litre nahi nikal sakte.'
        })
    if new_balance > tank.capacity:
        raise ValidationError({
            'stock': f'{tank.name} ki capacity {tank.capacity} litre hai, '
                     f'{new_balance} litre nahi ho sakte.'
        })
    tank.current_stock = new_balance
    tank.save(update_fields=['current_stock', 'updated_at'])
    return StockMovement.objects.create(
        tank=tank,
        movement_type=movement_type,
        litres_change=litres_change,
        balance_after=new_balance,
        reference=reference,
        note=note,
        created_by=user,
    )

@transaction.atomic
def apply_stock_movement(*, tank_id, movement_type, litres_change,
                         reference='', note='', user=None):
    litres_change = _to_decimal(litres_change)
    if litres_change == 0:
        raise ValidationError({'litres': 'Litres zero nahi ho sakte.'})
    tank = Tank.objects.select_for_update().get(pk=tank_id)
    return _post_movement(tank, movement_type, litres_change, reference, note, user)

@transaction.atomic
def reconcile_tank(*, tank_id, measured_litres, note, user=None):
    measured = _to_decimal(measured_litres)
    tank = Tank.objects.select_for_update().get(pk=tank_id)
    previous = tank.current_stock
    variance = measured - previous

    movement = None
    if variance != 0:
        movement = _post_movement(
            tank, StockMovement.Type.ADJUSTMENT, variance, 'dip-check', note, user,
        )

    variance_percent = None
    is_significant = False
    if previous > 0:
        variance_percent = (variance / previous * 100).quantize(TWO_PLACES)
        is_significant = abs(variance_percent) > DIP_VARIANCE_TOLERANCE_PERCENT

    return ReconcileResult(tank, movement, previous, variance, variance_percent, is_significant)