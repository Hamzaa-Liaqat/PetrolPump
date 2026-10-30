from rest_framework.routers import DefaultRouter

from .views import FuelRateViewSet, NozzleViewSet, SaleViewSet

router = DefaultRouter()
router.register('nozzles', NozzleViewSet, basename='nozzle')
router.register('fuel-rates', FuelRateViewSet, basename='fuel-rate')
router.register('sales', SaleViewSet, basename='sale')

urlpatterns = router.urls