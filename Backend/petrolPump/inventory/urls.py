from rest_framework.routers import DefaultRouter

from .views import PurchaseViewSet, StockMovementViewSet, TankViewSet

router = DefaultRouter()
router.register('tanks', TankViewSet, basename='tank')
router.register('purchases', PurchaseViewSet, basename='purchase')
router.register('stock-movements', StockMovementViewSet, basename='stock-movement')

urlpatterns = router.urls