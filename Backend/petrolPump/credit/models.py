from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from inventory.models import FuelType

POSITIVE = MinValueValidator(Decimal('0.01'))
NOT_NEGATIVE = MinValueValidator(Decimal('0'))
PHONE_VALIDATOR = RegexValidator(
    r'^\+?\d{10,15}$',
    'Phone sirf digits mein likhein (10 se 15 digits, shuru mein + allowed).',
)


class Customer(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=16, validators=[PHONE_VALIDATOR])
    address = models.CharField(max_length=200, blank=True)
    credit_limit = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[NOT_NEGATIVE],
    )
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), editable=False,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['name', 'phone'], name='unique_customer_name_phone'),
            models.CheckConstraint(condition=models.Q(balance__gte=0), name='customer_balance_not_negative'),
            models.CheckConstraint(condition=models.Q(credit_limit__gte=0), name='customer_limit_not_negative'),
        ]

    def __str__(self):
        return f'{self.name} ({self.phone})'

    @property
    def available_credit(self):
        return max(self.credit_limit - self.balance, Decimal('0.00'))

    @property
    def is_over_limit(self):
        return self.balance > self.credit_limit

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)


class CreditTransaction(models.Model):
    class Type(models.TextChoices):
        SALE = 'sale', 'Credit sale'
        PAYMENT = 'payment', 'Payment received'
        SALE_REVERSAL = 'sale_reversal', 'Credit sale reversed'
        PAYMENT_REVERSAL = 'payment_reversal', 'Payment reversed'

    DEBIT_TYPES = (Type.SALE, Type.PAYMENT_REVERSAL)
    CREDIT_TYPES = (Type.PAYMENT, Type.SALE_REVERSAL)
    REVERSAL_TYPES = (Type.SALE_REVERSAL, Type.PAYMENT_REVERSAL)

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='transactions')
    type = models.CharField(max_length=20, choices=Type.choices)
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, blank=True)
    litres = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=[POSITIVE],
    )
    rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True, validators=[POSITIVE],
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[POSITIVE])
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    vehicle_number = models.CharField(max_length=20, blank=True)
    reference = models.CharField(max_length=50, blank=True)
    note = models.CharField(max_length=200, blank=True)
    reversal_of = models.OneToOneField(
        'self', on_delete=models.PROTECT, null=True, blank=True,
        editable=False, related_name='reversal',
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )

    class Meta:
        ordering = ['-id']
        indexes = [models.Index(fields=['customer', 'timestamp']), models.Index(fields=['timestamp'])]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='credit_amount_positive'),
            models.CheckConstraint(condition=models.Q(balance_after__gte=0), name='credit_balance_after_not_negative'),
            models.CheckConstraint(
                condition=~models.Q(type='sale') | models.Q(litres__isnull=False, rate__isnull=False),
                name='credit_sale_needs_litres_and_rate',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(type__in=['sale_reversal', 'payment_reversal'], reversal_of__isnull=False)
                    | (~models.Q(type__in=['sale_reversal', 'payment_reversal'])
                       & models.Q(reversal_of__isnull=True))
                ),
                name='credit_reversal_link_consistent',
            ),
        ]

    def __str__(self):
        return f'{self.customer.name} | {self.type} | {self.amount} -> {self.balance_after}'

    @property
    def signed_amount(self):
        return self.amount if self.type in self.DEBIT_TYPES else -self.amount

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError('Ledger ki entry badli nahi ja sakti. Ghalti ho to Reverse karein.')
        self.vehicle_number = self.vehicle_number.strip().upper()
        self.reference = self.reference.strip()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Ledger ki entry delete nahi ho sakti.')
