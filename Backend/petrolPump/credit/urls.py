from rest_framework.routers import DefaultRouter

from .views import CreditTransactionViewSet, CustomerViewSet

router = DefaultRouter()
router.register('customers', CustomerViewSet, basename='customer')
router.register('credit-transactions', CreditTransactionViewSet, basename='credit-transaction')

urlpatterns = router.urls