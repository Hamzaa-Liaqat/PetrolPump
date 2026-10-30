from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from inventory.models import FuelType, Tank

TWO_PLACES = Decimal('0.01')
POSITIVE = MinValueValidator(Decimal('0.01'))
NOT_NEGATIVE = MinValueValidator(Decimal('0'))


class Nozzle(models.Model):
    name = models.CharField(max_length=30, unique=True)
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices)
    tank = models.ForeignKey(Tank, on_delete=models.PROTECT, related_name='nozzles')
    initial_reading = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[NOT_NEGATIVE],
    )
    last_reading = models.DecimalField(
        max_digits=12, decimal_places=2, blank=True, validators=[NOT_NEGATIVE],
        help_text='Meter ka aakhri closing reading. Khali chhodein to initial reading ban jata hai. '
                  'Sirf meter badalne par haath se badlein.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.CheckConstraint(condition=models.Q(initial_reading__gte=0), name='nozzle_initial_not_negative'),
            models.CheckConstraint(condition=models.Q(last_reading__gte=0), name='nozzle_last_not_negative'),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_fuel_type_display()})'

    def clean(self):
        if self.tank_id and self.fuel_type and self.tank.fuel_type != self.fuel_type:
            raise ValidationError({
                'fuel_type': f'Tank {self.tank.name} {self.tank.get_fuel_type_display()} ka hai, '
                             f'nozzle ka fuel type isi se match hona chahiye.'
            })

    def save(self, *args, **kwargs):
        if self.last_reading is None:
            self.last_reading = self.initial_reading
        super().save(*args, **kwargs)


class FuelRate(models.Model):
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices)
    rate = models.DecimalField(max_digits=8, decimal_places=2, validators=[POSITIVE])
    effective_from = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_from', '-id']
        indexes = [models.Index(fields=['fuel_type', 'effective_from'])]
        constraints = [
            models.CheckConstraint(condition=models.Q(rate__gt=0), name='fuelrate_positive'),
        ]

    def __str__(self):
        return f'{self.get_fuel_type_display()} @ {self.rate} ({self.effective_from:%Y-%m-%d %H:%M})'

    @classmethod
    def current_for(cls, fuel_type):
        return cls.objects.filter(fuel_type=fuel_type, effective_from__lte=timezone.now()).first()

    @classmethod
    def current_rates(cls):
        rates = {}
        for fuel_type in FuelType.values:
            current = cls.current_for(fuel_type)
            rates[fuel_type] = current.rate if current else None
        return rates

    def clean(self):
        if not self.fuel_type or self.effective_from is None:
            return
        errors = {}
        if self.effective_from > timezone.now() + timedelta(days=7):
            errors['effective_from'] = 'Rate 7 din se zyada aage ki date ka nahi ho sakta.'
        latest = FuelRate.objects.filter(fuel_type=self.fuel_type).first()
        if latest and self.effective_from <= latest.effective_from:
            errors['effective_from'] = (
                f'Is fuel ka rate {latest.effective_from:%Y-%m-%d %H:%M} se naya hona chahiye.'
            )
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError('Rate badla nahi ja sakta. Naya rate nayi entry se dalen.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Rate ki history delete nahi ho sakti.')


class SaleQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_void=False)


class Sale(models.Model):
    nozzle = models.ForeignKey(Nozzle, on_delete=models.PROTECT, related_name='sales')
    opening_reading = models.DecimalField(max_digits=12, decimal_places=2, validators=[NOT_NEGATIVE])
    closing_reading = models.DecimalField(max_digits=12, decimal_places=2, validators=[NOT_NEGATIVE])
    litres = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    rate = models.DecimalField(max_digits=8, decimal_places=2, editable=False)
    amount = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    is_void = models.BooleanField(default=False, editable=False)
    void_reason = models.CharField(max_length=200, blank=True, editable=False)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    voided_at = models.DateTimeField(null=True, blank=True, editable=False)

    objects = SaleQuerySet.as_manager()

    class Meta:
        ordering = ['-timestamp', '-id']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['nozzle', 'timestamp']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(closing_reading__gt=models.F('opening_reading')),
                name='sale_closing_above_opening',
            ),
            models.CheckConstraint(condition=models.Q(litres__gt=0), name='sale_litres_positive'),
            models.CheckConstraint(condition=models.Q(rate__gt=0), name='sale_rate_positive'),
            models.CheckConstraint(condition=models.Q(amount__gte=0), name='sale_amount_not_negative'),
        ]

    def __str__(self):
        return f'{self.receipt_no} | {self.nozzle.name} | {self.litres} L'

    @property
    def receipt_no(self):
        return f'RCP-{self.pk:06d}' if self.pk else ''

    def clean(self):
        if self.nozzle_id is None:
            return
        errors = {}
        nozzle = self.nozzle
        tank = nozzle.tank
        opening, closing = self.opening_reading, self.closing_reading

        if not nozzle.is_active:
            errors['nozzle'] = 'Ye nozzle inactive hai.'
        if opening is not None and opening != nozzle.last_reading:
            errors['opening_reading'] = f'Is nozzle ka pichla closing reading {nozzle.last_reading} hai.'
        if opening is not None and closing is not None:
            if closing <= opening:
                errors['closing_reading'] = 'Closing reading, opening reading se zyada honi chahiye.'
            elif closing - opening > tank.current_stock:
                errors['closing_reading'] = f'{tank.name} mein sirf {tank.current_stock} litre hai.'

        current = FuelRate.current_for(nozzle.fuel_type)
        if current is None:
            errors['rate'] = f'{nozzle.get_fuel_type_display()} ka rate set nahi. Pehle Fuel Rate add karein.'
        elif self.rate is not None and self.rate != current.rate:
            errors['rate'] = f'Maujooda rate {current.rate} hai, aap ne {self.rate} bheja. Page refresh karein.'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError('Sale save hone ke baad badli nahi ja sakti. Ghalti ho to Void karein.')
        with transaction.atomic():
            nozzle = Nozzle.objects.select_for_update().get(pk=self.nozzle_id)
            if not nozzle.is_active:
                raise ValidationError({'nozzle': 'Ye nozzle inactive hai.'})
            if self.opening_reading != nozzle.last_reading:
                raise ValidationError({
                    'opening_reading': f'Is nozzle ka pichla closing reading {nozzle.last_reading} hai.'
                })
            if self.closing_reading <= self.opening_reading:
                raise ValidationError({
                    'closing_reading': 'Closing reading, opening reading se zyada honi chahiye.'
                })
            current = FuelRate.current_for(nozzle.fuel_type)
            if current is None:
                raise ValidationError({'rate': f'{nozzle.get_fuel_type_display()} ka rate set nahi.'})
            if self.rate is not None and self.rate != current.rate:
                raise ValidationError({'rate': f'Maujooda rate {current.rate} hai. Page refresh karein.'})

            self.rate = current.rate
            self.litres = (self.closing_reading - self.opening_reading).quantize(TWO_PLACES)
            self.amount = (self.litres * self.rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

            nozzle.last_reading = self.closing_reading
            nozzle.save(update_fields=['last_reading', 'updated_at'])
            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Sale delete nahi ho sakti. Galat entry ko Void karein.')
