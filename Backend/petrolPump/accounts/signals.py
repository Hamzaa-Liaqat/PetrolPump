from .models import Profile
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

User=get_user_model()
@receiver(post_save,sender=User)
def creatProfile(sender,created,instance, **kwargs):
    if created:
        role=Profile.Role.OWNER if instance.is_superuser else Profile.Role.CASHIER
        Profile.objects.get_or_create(user=instance, defaults={'role': role})
        
