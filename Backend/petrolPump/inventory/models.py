from django.db import models, transaction
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator

POSITVE=MinValueValidator(Decimal('0.01'))
NOT_NEGATIVE=MinValueValidator(Decimal('0'))

class FuelType(models.TextChoices):
    PETROL = 'petrol', 'Petrol'
    HIOCTANE = 'hi_octane', 'Hi-Octane'
    DIESEL = 'diesel', 'Diesel'


class Tank(models.Model):
    name=models.CharField( max_length=40,unique=True
    )
    fuel_type=models.CharField(max_length=20, choices=FuelType.choices
    )
    capacity=models.DecimalField(max_digits=12,decimal_places=2,validators=[POSITVE]
    )
    current_stock=models.DecimalField( max_digits=12,decimal_places=2,default=Decimal('0.00'),validators=[NOT_NEGATIVE]
    )
    reorder_level=models.DecimalField(max_digits=12, decimal_places=2,default=Decimal('1000'),validators=[NOT_NEGATIVE]        
    )
    is_active=models.BooleanField(default=True)
    updated_at=models.DateTimeField(auto_now_add=True)
    deleted_at=models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']
        indexes = [models.Index(fields=['updated_at'])]

        constraints = [
        models.CheckConstraint(
            condition=models.Q(
                current_stock__lte=models.F('capacity')
            ),
            name='tank_stock_not_above_capacity',
        ),
    ]
        # constraints = [
        #     models.UniqueConstraint(fields=['supplier', 'invoice_number'], name='unique_invoice_per_supplier'),
        #     models.CheckConstraint(condition=models.Q(litres__gt=0), name='purchase_litres_positive'),
        #     models.CheckConstraint(condition=models.Q(invoice_amount__gt=0), name='purchase_amount_positive'),
        # ]
    def __str__(self):
        return f'{self.name},({self.get_fuel_type_display()})'

    @property
    def available_space(self):
        return self.capacity - self.current_stock
    @property
    def fill_percent(self):
        if not self.capacity:
            return 0.0
        return round(float(self.current_stock / self.capacity * 100), 1)
    @property
    def is_low(self):
        return self.current_stock < self.reorder_level
    def clean(self):
        errors = {}
        if self.capacity is not None and self.reorder_level is not None \
                and self.reorder_level > self.capacity:
            errors['reorder_level'] = 'Reorder level capacity se zyada nahi ho sakta.'
        if self.capacity is not None and self.current_stock is not None \
                and self.capacity < self.current_stock:
            errors['capacity'] = 'Capacity maujooda stock se kam nahi ho sakti.'
        if errors:
            raise ValidationError(errors)




class Purchase(models.Model):
    tank = models.ForeignKey(Tank, on_delete=models.PROTECT, related_name='purchases')
    supplier = models.CharField(max_length=100)
    tanker_number = models.CharField(max_length=20)
    invoice_number = models.CharField(max_length=50)
    litres = models.DecimalField(max_digits=10, decimal_places=2, validators=[POSITVE])
    received_litres = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, validators=[POSITVE],
    )
    dip_before = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[NOT_NEGATIVE],
    )
    dip_after = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[NOT_NEGATIVE],
    )
    invoice_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[POSITVE])
    date = models.DateField(default=timezone.localdate)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['date'])]
        constraints = [
            models.UniqueConstraint(fields=['supplier', 'invoice_number'], name='unique_invoice_per_supplier'),
            models.CheckConstraint(condition=models.Q(litres__gt=0), name='purchase_litres_positive'),
            models.CheckConstraint(condition=models.Q(invoice_amount__gt=0), name='purchase_amount_positive'),
        ]

    def __str__(self):
        return f'{self.date} | {self.supplier} | {self.invoice_number}'

    @property
    def shortage_litres(self):
        return self.litres - self.received_litres

    @property
    def cost_per_litre(self):
        return (self.invoice_amount / self.litres).quantize(Decimal('0.01'))

    def clean(self):
        errors = {}
        if (self.dip_before is None) != (self.dip_after is None):
            errors['dip_after'] = 'Dip before aur dip after dono dein, ya dono khali chhodein.'
        elif self.dip_before is not None:
            if self.dip_after <= self.dip_before:
                errors['dip_after'] = 'Dip after, dip before se zyada hona chahiye.'
            else:
                self.received_litres = self.dip_after - self.dip_before
        if self.received_litres is None and self.litres is not None:
            self.received_litres = self.litres
        if self.date and self.date > timezone.localdate():
            errors['date'] = 'Future ki date allowed nahi.'
        if self.tank_id:
            tank = self.tank
            if not tank.is_active:
                errors['tank'] = 'Ye tank inactive hai.'
            elif self.received_litres is not None and self.received_litres > tank.available_space:
                errors['received_litres'] = f'Tank mein sirf {tank.available_space} litre jagah hai.'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError(
                'Purchase save hone ke baad badli nahi ja sakti. Ghalti ho to dip reconcile se theek karein.'
            )
        self.supplier = self.supplier.strip()
        self.tanker_number = self.tanker_number.strip().upper()
        self.invoice_number = self.invoice_number.strip()
        if self.received_litres is None:
            self.received_litres = self.litres
        with transaction.atomic():
            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Purchase record delete nahi ho sakta.')

class StockMovement(models.Model):
    class Type(models.TextChoices):
        PURCHASE = 'purchase', 'Purchase (delivery)'
        SALE = 'sale', 'Sale'
        ADJUSTMENT = 'adjustment', 'Adjustment (dip correction)'

    tank = models.ForeignKey(Tank, on_delete=models.PROTECT, related_name='movements')
    movement_type = models.CharField(max_length=12, choices=Type.choices)
    litres_change = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=50, blank=True)
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['tank', 'created_at'])]
        constraints = [
            models.CheckConstraint(condition=~models.Q(litres_change=0), name='movement_change_not_zero'),
            models.CheckConstraint(condition=models.Q(balance_after__gte=0), name='movement_balance_not_negative'),
        ]

    def __str__(self):
        return f'{self.tank.name} | {self.movement_type} | {self.litres_change} -> {self.balance_after}'

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError('Stock ledger ki entry badli nahi ja sakti.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Stock ledger ki entry delete nahi ho sakti.')