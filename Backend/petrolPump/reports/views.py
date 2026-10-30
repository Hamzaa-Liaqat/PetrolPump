from datetime import timedelta
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOwner, IsOwnerOrManager
from petrolPump.utils import date_param, date_window, int_param

from .exports import build_pdf, build_xlsx
from .models import Expense, ExpenseCategory
from .serializers import ExpenseSerializer, ExpenseVoidSerializer
from .services import (
    build_alerts, dashboard_summary, monthly_report, sales_by_hour, sales_trend, void_expense,
)

XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


def _check_year(year):
    if not 2000 <= year <= 2100:
        raise ValidationError({'year': 'Sahi saal dein (2000-2100).'})


def _check_month(month):
    if not 1 <= month <= 12:
        raise ValidationError({'month': 'Mahina 1 se 12 ke beech dein.'})


def _year_month(request):
    today = timezone.localdate()
    year = int_param(request, 'year')
    month = int_param(request, 'month')
    year = today.year if year is None else year
    month = today.month if month is None else month
    _check_year(year)
    _check_month(month)
    return year, month


class DashboardSummaryView(APIView):
    permission_classes = [IsOwnerOrManager]

    def get(self, request):
        return Response(dashboard_summary())


class ReportSummaryView(APIView):
    permission_classes = [IsOwnerOrManager]

    def get(self, request):
        year, month = _year_month(request)
        report = monthly_report(year, month)
        return Response({
            **report,
            'sales': report['totals']['sales'],
            'profit': report['totals']['profit'],
        })


class SalesTrendView(APIView):
    permission_classes = [IsOwnerOrManager]

    def get(self, request):
        group = request.query_params.get('group', 'day')
        if group not in ('day', 'week', 'month'):
            raise ValidationError({'group': 'day, week ya month dein.'})
        today = timezone.localdate()
        end = date_param(request, 'date_to') or today
        start = date_param(request, 'date_from') or end - timedelta(days=29)
        if start > end:
            raise ValidationError({'date_from': 'date_from, date_to se pehle ki honi chahiye.'})
        if (end - start).days >= 366:
            raise ValidationError({'date_to': 'Ek baar mein 366 din se zyada nahi.'})
        return Response({
            'group': group, 'date_from': start, 'date_to': end,
            'points': sales_trend(start, end, group),
            'by_hour': sales_by_hour(start, end),
        })


class ProfitLossView(APIView):
    permission_classes = [IsOwnerOrManager]

    def get(self, request):
        today = timezone.localdate()
        year = int_param(request, 'year')
        year = today.year if year is None else year
        _check_year(year)
        month = int_param(request, 'month')
        if month is not None:
            _check_month(month)
        months = [month] if month else range(1, 13)

        rows = []
        sums = {key: Decimal('0.00') for key in ('sales', 'litres', 'purchases', 'expenses', 'salaries', 'profit')}
        for number in months:
            totals = monthly_report(year, number)['totals']
            rows.append({'month': number, 'period': f'{year}-{number:02d}', **totals})
            for key in sums:
                sums[key] += totals[key]
        return Response({'year': year, 'months': rows, 'year_totals': sums})


class ReportExportView(APIView):
    permission_classes = [IsOwnerOrManager]

    def get(self, request):
        year, month = _year_month(request)
        kind = request.query_params.get('file', 'pdf')
        if kind not in ('pdf', 'xlsx'):
            raise ValidationError({'file': 'pdf ya xlsx dein.'})
        report = monthly_report(year, month)
        if kind == 'pdf':
            content, content_type = build_pdf(report), 'application/pdf'
        else:
            content, content_type = build_xlsx(report), XLSX_TYPE
        filename = f"petrol-pump-report-{report['period']}.{kind}"
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AlertsView(APIView):
    permission_classes = [IsOwnerOrManager]

    def get(self, request):
        alerts = build_alerts()
        return Response({'count': len(alerts), 'alerts': alerts})


class ExpenseViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                     mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ExpenseSerializer

    def get_permissions(self):
        permission_class = IsOwner if self.action == 'void' else IsOwnerOrManager
        return [permission_class()]

    def get_queryset(self):
        queryset = Expense.objects.select_related('created_by')
        if self.action != 'list':
            return queryset
        params = self.request.query_params
        if any(key in params for key in ('date', 'date_from', 'date_to')):
            start, end = date_window(self.request, max_days=366)
        else:
            today = timezone.localdate()
            start, end = today.replace(day=1), today
        queryset = queryset.filter(date__gte=start, date__lte=end)
        category = params.get('category')
        if category:
            if category not in ExpenseCategory.values:
                raise ValidationError({'category': f'In mein se ek dein: {", ".join(ExpenseCategory.values)}'})
            queryset = queryset.filter(category=category)
        if params.get('include_void') not in ('1', 'true', 'True'):
            queryset = queryset.active()
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        expense = self.get_object()
        serializer = ExpenseVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        voided = void_expense(
            expense_id=expense.pk, user=request.user, reason=serializer.validated_data['reason'],
        )
        return Response(ExpenseSerializer(voided).data)