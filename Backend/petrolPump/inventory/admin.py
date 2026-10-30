from django.contrib import admin

from .models import Purchase, StockMovement, Tank


@admin.register(Tank)
class TankAdmin(admin.ModelAdmin):
    list_display = ('name', 'fuel_type', 'capacity', 'current_stock',
                    'reorder_level', 'low_stock', 'is_active')
    list_filter = ('fuel_type', 'is_active')
    search_fields = ('name',)
    readonly_fields = ('current_stock', 'updated_at')

    @admin.display(boolean=True, description='Low stock')
    def low_stock(self, obj):
        return obj.is_low


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('date', 'tank', 'supplier', 'tanker_number', 'invoice_number',
                    'litres', 'received_litres', 'shortage', 'invoice_amount')
    list_filter = ('tank', 'date')
    search_fields = ('supplier', 'tanker_number', 'invoice_number')
    list_select_related = ('tank',)
    date_hierarchy = 'date'

    @admin.display(description='Shortage (L)')
    def shortage(self, obj):
        return obj.shortage_litres

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'tank', 'movement_type', 'litres_change',
                    'balance_after', 'reference', 'created_by')
    list_filter = ('movement_type', 'tank')
    list_select_related = ('tank', 'created_by')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False