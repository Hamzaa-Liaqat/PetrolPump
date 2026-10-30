from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models, transaction
from django.utils import timezone

POSITIVE = MinValueValidator(Decimal('0.01'))
NOT_NEGATIVE = MinValueValidator(Decimal('0'))
PHONE_VALIDATOR = RegexValidator(
    r'^\+?\d{10,15}$',
    'Phone sirf digits mein likhein (10 se 15 digits, shuru mein + allowed).',
)


class Shift(models.TextChoices):
    MORNING = 'morning', 'Morning'
    EVENING = 'evening', 'Evening'
    NIGHT = 'night', 'Night'


class Staff(models.Model):
    class Position(models.TextChoices):
        ATTENDANT = 'attendant', 'Pump attendant'
        CASHIER = 'cashier', 'Cashier'
        OTHER = 'other', 'Other'

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=16, blank=True, validators=[PHONE_VALIDATOR])
    position = models.CharField(max_length=20, choices=Position.choices, default=Position.ATTENDANT)
    shift = models.CharField(max_length=10, choices=Shift.choices, default=Shift.MORNING)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[POSITIVE])
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='staff_member',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'staff'
        constraints = [
            models.UniqueConstraint(fields=['name', 'phone'], name='unique_staff_name_phone'),
            models.CheckConstraint(condition=models.Q(daily_rate__gt=0), name='staff_rate_positive'),
        ]

    def __str__(self):
        return f'{self.name} ({self.get_position_display()})'

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'present', 'Present'
        HALF_DAY = 'half_day', 'Half day'
        ABSENT = 'absent', 'Absent'

    staff = models.ForeignKey(Staff, on_delete=models.PROTECT, related_name='attendance')
    date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=10, choices=Status.choices)
    shift = models.CharField(max_length=10, choices=Shift.choices, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'staff__name']
        indexes = [models.Index(fields=['date'])]
        constraints = [
            models.UniqueConstraint(fields=['staff', 'date'], name='one_attendance_per_staff_per_day'),
            models.CheckConstraint(condition=models.Q(daily_rate__gt=0), name='attendance_rate_positive'),
        ]

    def __str__(self):
        return f'{self.date} | {self.staff.name} | {self.status}'

    def _check_month_open(self, day):
        if self.staff_id and day and Payslip.objects.filter(
            staff_id=self.staff_id, year=day.year, month=day.month,
        ).exists():
            raise ValidationError(
                'Is mahine ki payslip ban chuki hai, attendance ab nahi badal sakti. '
                'Pehle payslip cancel karein.'
            )

    def clean(self):
        errors = {}
        if self.date and self.date > timezone.localdate():
            errors['date'] = 'Future ki attendance nahi lag sakti.'
        if self.staff_id and self._state.adding and not self.staff.is_active:
            errors['staff'] = 'Ye staff member inactive hai.'
        if errors:
            raise ValidationError(errors)
        self._check_month_open(self.date)

    def save(self, *args, **kwargs):
        with transaction.atomic():
            staff = Staff.objects.select_for_update().get(pk=self.staff_id)
            self._check_month_open(self.date)
            if not self._state.adding:
                old_date = Attendance.objects.filter(pk=self.pk).values_list('date', flat=True).first()
                if old_date != self.date:
                    self._check_month_open(old_date)
            else:
                self.daily_rate = staff.daily_rate
            if not self.shift:
                self.shift = staff.shift
            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            Staff.objects.select_for_update().get(pk=self.staff_id)
            self._check_month_open(self.date)
            return super().delete(*args, **kwargs)


class Payslip(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.PROTECT, related_name='payslips')
    year = models.PositiveSmallIntegerField(validators=[MinValueValidator(2000), MaxValueValidator(2100)])
    month = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    days_present = models.DecimalField(max_digits=5, decimal_places=1)
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[NOT_NEGATIVE])
    deduction = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[NOT_NEGATIVE],
    )
    deduction_note = models.CharField(max_length=200, blank=True)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    paid_on = models.DateField(null=True, blank=True)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, editable=False, related_name='+',
    )

    class Meta:
        ordering = ['-year', '-month', 'staff__name']
        constraints = [
            models.UniqueConstraint(fields=['staff', 'year', 'month'], name='one_payslip_per_staff_per_month'),
            models.CheckConstraint(condition=models.Q(month__gte=1, month__lte=12), name='payslip_month_valid'),
            models.CheckConstraint(condition=models.Q(gross_amount__gte=0), name='payslip_gross_not_negative'),
            models.CheckConstraint(condition=models.Q(deduction__gte=0), name='payslip_deduction_not_negative'),
            models.CheckConstraint(
                condition=models.Q(deduction__lte=models.F('gross_amount')),
                name='payslip_deduction_within_gross',
            ),
            models.CheckConstraint(
                condition=models.Q(net_amount=models.F('gross_amount') - models.F('deduction')),
                name='payslip_net_is_gross_minus_deduction',
            ),
        ]

    def __str__(self):
        return f'{self.staff.name} | {self.period} | net {self.net_amount}'

    @property
    def period(self):
        return f'{self.year}-{self.month:02d}'

    @property
    def is_paid(self):
        return self.paid_on is not None

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError('Payslip badli nahi ja sakti. Ghalti ho to cancel karke dobara banayein.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Payslip ko cancel action se hi hataya ja sakta hai.')