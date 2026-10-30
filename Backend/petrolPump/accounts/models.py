from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator

# Create your models here.

class Profile(models.Model):
    class Role(models.TextChoices):
        OWNER="owner","Owner"
        CASHIER="cashier","Cashier"
        MANAGER="manager","Manager"

    user=models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="Profile"
        )
    role=models.CharField(
        max_length=12,
        choices=Role.choices,
        default=Role.CASHIER,
    )
    phone=models.CharField(
        max_length=16,
        blank=True,
        validators=[RegexValidator(
            r'^\+?\d{10,15}$',
            'Phone sirf digits mein likhein (10 se 15 digits, shuru mein + allowed).',
        )],
    )
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    def __str__(self):
        return f'{self.user.username} ({self.get_role_display()})'