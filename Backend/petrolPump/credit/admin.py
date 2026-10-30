from django.contrib import admin

from .models import CreditTransaction, Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'credit_limit', 'balance', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'phone')
    readonly_fields = ('balance', 'created_at', 'updated_at')


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'customer', 'type', 'amount', 'balance_after', 'vehicle_number', 'created_by')
    list_filter = ('type',)
    search_fields = ('customer__name', 'vehicle_number', 'reference')
    list_select_related = ('customer', 'created_by')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False