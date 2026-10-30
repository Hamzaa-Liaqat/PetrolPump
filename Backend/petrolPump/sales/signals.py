from django.db.models.signals import post_save
from django.dispatch import receiver

from inventory.models import StockMovement
from inventory.services import apply_stock_movement

from .models import Sale


@receiver(post_save, sender=Sale)
def reduce_stock(sender, instance, created, raw=False, **kwargs):
    if raw or not created:
        return
    apply_stock_movement(
        tank_id=instance.nozzle.tank_id,
        movement_type=StockMovement.Type.SALE,
        litres_change=-instance.litres,
        reference=f'sale:{instance.pk}',
        user=instance.cashier,
    )