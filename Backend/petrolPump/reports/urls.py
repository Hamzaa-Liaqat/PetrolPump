from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AlertsView, DashboardSummaryView, ExpenseViewSet, ProfitLossView,
    ReportExportView, ReportSummaryView, SalesTrendView,
)

router = DefaultRouter()
router.register('expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('reports/summary/', ReportSummaryView.as_view(), name='report-summary'),
    path('reports/sales-trend/', SalesTrendView.as_view(), name='report-sales-trend'),
    path('reports/profit-loss/', ProfitLossView.as_view(), name='report-profit-loss'),
    path('reports/export/', ReportExportView.as_view(), name='report-export'),
    path('alerts/', AlertsView.as_view(), name='alerts'),
] + router.urls