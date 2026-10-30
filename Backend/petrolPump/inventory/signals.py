from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Purchase, StockMovement
from .services import apply_stock_movement


@receiver(post_save, sender=Purchase)
def increase_stock(sender, instance, created, raw=False, **kwargs):
    if raw or not created:
        return
    apply_stock_movement(
        tank_id=instance.tank_id,
        movement_type=StockMovement.Type.PURCHASE,
        litres_change=instance.received_litres,
        reference=f'purchase:{instance.pk}',
        note=f'{instance.supplier} / {instance.tanker_number}',
        user=instance.created_by,
    )