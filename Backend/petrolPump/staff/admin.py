from django.contrib import admin

from .models import Attendance, Payslip, Staff


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('name', 'position', 'shift', 'daily_rate', 'phone', 'is_active')
    list_filter = ('position', 'shift', 'is_active')
    search_fields = ('name', 'phone')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('date', 'staff', 'status', 'shift', 'marked_by')
    list_filter = ('status', 'shift', 'date')
    search_fields = ('staff__name',)
    list_select_related = ('staff', 'marked_by')
    date_hierarchy = 'date'

    def save_model(self, request, obj, form, change):
        obj.marked_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('staff', 'year', 'month', 'days_present', 'gross_amount', 'deduction', 'net_amount', 'paid_on')
    list_filter = ('year', 'month')
    search_fields = ('staff__name',)
    list_select_related = ('staff',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False