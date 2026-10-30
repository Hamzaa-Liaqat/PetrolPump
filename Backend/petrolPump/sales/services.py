from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from inventory.models import StockMovement
from inventory.services import apply_stock_movement

from .models import Nozzle, Sale


@transaction.atomic
def void_sale(*, sale_id, user, reason):
    nozzle_id = Sale.objects.values_list('nozzle_id', flat=True).get(pk=sale_id)
    nozzle = Nozzle.objects.select_for_update().get(pk=nozzle_id)
    sale = Sale.objects.select_for_update().get(pk=sale_id)

    if sale.is_void:
        raise ValidationError('Ye sale pehle hi void ho chuki hai.')
    if Sale.objects.filter(nozzle_id=nozzle_id, is_void=False, id__gt=sale.id).exists():
        raise ValidationError('Is nozzle ki is ke baad ki sales pehle void karein (nayi se purani ki taraf).')

    apply_stock_movement(
        tank_id=nozzle.tank_id,
        movement_type=StockMovement.Type.ADJUSTMENT,
        litres_change=sale.litres,
        reference=f'void-sale:{sale.pk}',
        note=f'Sale void: {reason}'[:200],
        user=user,
    )
    nozzle.last_reading = sale.opening_reading
    nozzle.save(update_fields=['last_reading', 'updated_at'])
    Sale.objects.filter(pk=sale.pk).update(
        is_void=True, void_reason=reason, voided_by=user, voided_at=timezone.now(),
    )
    return Sale.objects.get(pk=sale.pk)