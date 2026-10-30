from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('date', 'category', 'amount', 'reference', 'is_void', 'created_by')
    list_filter = ('category', 'is_void', 'date')
    search_fields = ('note', 'reference')
    list_select_related = ('created_by',)
    date_hierarchy = 'date'

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False