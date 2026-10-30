from django.contrib import admin

from .models import FuelRate, Nozzle, Sale


@admin.register(Nozzle)
class NozzleAdmin(admin.ModelAdmin):
    list_display = ('name', 'fuel_type', 'tank', 'last_reading', 'is_active')
    list_filter = ('fuel_type', 'is_active')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(FuelRate)
class FuelRateAdmin(admin.ModelAdmin):
    list_display = ('fuel_type', 'rate', 'effective_from', 'created_by')
    list_filter = ('fuel_type',)
    list_select_related = ('created_by',)

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('receipt_no', 'timestamp', 'nozzle', 'litres', 'rate', 'amount', 'cashier', 'is_void')
    list_filter = ('nozzle', 'is_void')
    search_fields = ('cashier__username',)
    list_select_related = ('nozzle', 'cashier')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
