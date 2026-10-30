from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Profile

User=get_user_model()

class ProfileInline(admin.StackedInline):
    model=Profile
    can_delete=False
    fk_name="user"
admin.site.unregister(User)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    Inlines=[ProfileInline]
    list_display=('username', 'email', 'get_role', 'is_active', 'is_staff')
    list_select_related=('Profile',)
    list_filter=BaseUserAdmin.list_filter + ('Profile__role',)

    @admin.display(description='Role', ordering='Profile__role')
    def get_role(self, obj):
        profile = getattr(obj, 'Profile', None)
        return profile.get_role_display() if profile else '-'

    def get_inline_instances(self, request, obj=None):
        if obj is None:
            return []
        return super().get_inline_instances(request, obj)