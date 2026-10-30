from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsOwner, IsOwnerOrManager
from petrolPump.utils import as_drf_error, date_window, int_param, parse_date_or_error

from .models import Attendance, Payslip, Staff
from .serializers import (
    AttendanceSerializer, MarkDaySerializer, MarkPaidSerializer,
    PayslipGenerateSerializer, PayslipSerializer, StaffSerializer,
)
from .services import (
    attendance_sheet, calculate_salary, cancel_payslip, generate_payslip,
    mark_day, mark_payslip_paid, payroll_summary,
)


def _check_year_month(year, month, month_required=True):
    if not 2000 <= year <= 2100:
        raise ValidationError({'year': 'Sahi saal dein (2000-2100).'})
    if month is None and not month_required:
        return
    if not 1 <= month <= 12:
        raise ValidationError({'month': 'Mahina 1 se 12 ke beech dein.'})


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.select_related('user')
    serializer_class = StaffSerializer
    permission_classes = [IsOwner]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Is staff ka attendance/payslip record hai, delete nahi ho sakta. is_active=false kar dein.'},
                status=status.HTTP_409_CONFLICT,
            )

    @action(detail=True, methods=['get'], url_path='salary-preview')
    def salary_preview(self, request, pk=None):
        staff = self.get_object()
        today = timezone.localdate()
        year = int_param(request, 'year')
        month = int_param(request, 'month')
        year = today.year if year is None else year
        month = today.month if month is None else month
        _check_year_month(year, month)
        result = calculate_salary(staff, year, month)
        result['is_final'] = Payslip.objects.filter(staff=staff, year=year, month=month).exists()
        return Response({'staff': staff.pk, 'name': staff.name, **result})


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        permission_class = IsOwner if self.action == 'destroy' else IsOwnerOrManager
        return [permission_class()]

    def get_queryset(self):
        queryset = Attendance.objects.select_related('staff', 'marked_by')
        if self.action != 'list':
            return queryset
        params = self.request.query_params
        start, end = date_window(self.request)
        queryset = queryset.filter(date__gte=start, date__lte=end)
        staff_id = int_param(self.request, 'staff')
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        status_param = params.get('status')
        if status_param:
            if status_param not in Attendance.Status.values:
                raise ValidationError({'status': 'present, half_day ya absent dein.'})
            queryset = queryset.filter(status=status_param)
        return queryset

    def perform_create(self, serializer):
        try:
            serializer.save(marked_by=self.request.user)
        except DjangoValidationError as exc:
            raise as_drf_error(exc)

    def perform_update(self, serializer):
        try:
            serializer.save(marked_by=self.request.user)
        except DjangoValidationError as exc:
            raise as_drf_error(exc)

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except DjangoValidationError as exc:
            raise as_drf_error(exc)

    @action(detail=False, methods=['get'])
    def sheet(self, request):
        raw = request.query_params.get('date')
        today = timezone.localdate()
        day = today if not raw or raw == 'today' else parse_date_or_error('date', raw)
        return Response(attendance_sheet(day))

    @action(detail=False, methods=['post'], url_path='mark-day')
    def mark_day(self, request):
        serializer = MarkDaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        records = mark_day(day=data['date'], entries=data['entries'], user=request.user)
        return Response({
            'date': data['date'],
            'saved': AttendanceSerializer(records, many=True).data,
            'sheet': attendance_sheet(data['date']),
        })


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [IsOwner]

    def get_queryset(self):
        queryset = Payslip.objects.select_related('staff', 'generated_by', 'paid_by')
        if self.action != 'list':
            return queryset
        params = self.request.query_params
        year = int_param(self.request, 'year') or timezone.localdate().year
        queryset = queryset.filter(year=year)
        month = int_param(self.request, 'month')
        if month:
            queryset = queryset.filter(month=month)
        staff_id = int_param(self.request, 'staff')
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        paid = params.get('paid')
        if paid == '1':
            queryset = queryset.filter(paid_on__isnull=False)
        elif paid == '0':
            queryset = queryset.filter(paid_on__isnull=True)
        return queryset

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = PayslipGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payslip = generate_payslip(
            staff_id=data['staff'].pk, year=data['year'], month=data['month'],
            deduction=data.get('deduction', 0), deduction_note=data.get('deduction_note', ''),
            allow_unmarked=data['allow_unmarked'], user=request.user,
        )
        return Response(PayslipSerializer(payslip).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        payslip = self.get_object()
        serializer = MarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = mark_payslip_paid(
            payslip_id=payslip.pk, user=request.user, paid_on=serializer.validated_data.get('paid_on'),
        )
        return Response(PayslipSerializer(updated).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        payslip = self.get_object()
        cancel_payslip(payslip_id=payslip.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        year = int_param(self.request, 'year') or timezone.localdate().year
        month = int_param(self.request, 'month')
        _check_year_month(year, month, month_required=False)
        return Response({'year': year, 'month': month, **payroll_summary(year, month)})