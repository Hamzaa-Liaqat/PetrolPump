from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class ExpenseCategory(models.TextChoices):
    ELECTRICITY = 'electricity', 'Electricity bill'
    RENT = 'rent', 'Rent'
    MAINTENANCE = 'maintenance', 'Maintenance'
    REPAIR = 'repair', 'Equipment repair'
    TAX = 'tax', 'Tax / fees'
    SUPPLIES = 'supplies', 'Supplies'
    OTHER = 'other', 'Other'


class ExpenseQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_void=False)


class Expense(models.Model):
    category = models.CharField(max_length=20, choices=ExpenseCategory.choices)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))],
    )
    date = models.DateField(default=timezone.localdate)
    note = models.CharField(max_length=200, blank=True)
    reference = models.CharField(max_length=50, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_void = models.BooleanField(default=False, editable=False)
    void_reason = models.CharField(max_length=200, blank=True, editable=False)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    voided_at = models.DateTimeField(null=True, blank=True, editable=False)

    objects = ExpenseQuerySet.as_manager()

    class Meta:
        ordering = ['-date', '-id']
        indexes = [models.Index(fields=['date'])]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='expense_amount_positive'),
        ]

    def __str__(self):
        return f'{self.date} | {self.get_category_display()} | {self.amount}'

    def clean(self):
        errors = {}
        if self.date and self.date > timezone.localdate():
            errors['date'] = 'Future ki date ka expense nahi ho sakta.'
        if self.category == ExpenseCategory.OTHER and not (self.note or '').strip():
            errors['note'] = 'Other category mein note likhna lazmi hai.'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError('Expense badla nahi ja sakta. Ghalti ho to Void karke dobara likhein.')
        self.note = self.note.strip()
        self.reference = self.reference.strip()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Expense delete nahi ho sakta. Galat entry ko Void karein.')