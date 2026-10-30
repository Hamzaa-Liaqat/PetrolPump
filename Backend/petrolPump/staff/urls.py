from rest_framework.routers import DefaultRouter

from .views import AttendanceViewSet, PayslipViewSet, StaffViewSet

router = DefaultRouter()
router.register('staff', StaffViewSet, basename='staff')
router.register('attendance', AttendanceViewSet, basename='attendance')
router.register('payslips', PayslipViewSet, basename='payslip')

urlpatterns = router.urls