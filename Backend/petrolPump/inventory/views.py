from datetime import datetime, time, timedelta

from django.db.models import F, ProtectedError
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.permissions import IsOwner, IsOwnerOrManager

from .models import Purchase, StockMovement, Tank
from .serializers import (
    PurchaseSerializer, StockMovementSerializer,
    TankReconcileSerializer, TankSerializer,
)
from .services import DIP_VARIANCE_TOLERANCE_PERCENT, reconcile_tank

def _int_param(request, name):
    raw = request.query_params.get(name)
    if not raw:
        return None
    if not raw.isdecimal():
        raise ValidationError({name: 'Sahi number dein.'})
    return int(raw)


def _date_param(request, name):
    raw = request.query_params.get(name)
    if not raw:
        return None
    try:
        parsed = parse_date(raw)
    except ValueError:
        parsed = None
    if parsed is None:
        raise ValidationError({name: 'Date YYYY-MM-DD format mein dein.'})
    return parsed


def _day_start(day):
    return timezone.make_aware(datetime.combine(day, time.min))

class TankViewSet(viewsets.ModelViewSet):
    queryset = Tank.objects.all()
    serializer_class = TankSerializer
    WRITE_ACTIONS = ('create', 'update', 'partial_update', 'destroy')

    def get_permissions(self):
        permission_class = IsOwner if self.action in self.WRITE_ACTIONS else IsOwnerOrManager
        return [permission_class()]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Is tank ki history hai, delete nahi ho sakta. is_active=false kar dein.'},
                status=status.HTTP_409_CONFLICT,
            )

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        low_tanks = self.get_queryset().filter(is_active=True, current_stock__lt=F('reorder_level'))
        return Response(self.get_serializer(low_tanks, many=True).data)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        tank = self.get_object()
        serializer = TankReconcileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = reconcile_tank(
            tank_id=tank.pk,
            measured_litres=serializer.validated_data['measured_litres'],
            note=serializer.validated_data['note'],
            user=request.user,
        )
        return Response({
            'tank': TankSerializer(result.tank).data,
            'previous_stock': result.previous_stock,
            'measured_litres': result.tank.current_stock,
            'variance_litres': result.variance,
            'variance_percent': result.variance_percent,
            'is_significant': result.is_significant,
            'tolerance_percent': DIP_VARIANCE_TOLERANCE_PERCENT,
            'movement': StockMovementSerializer(result.movement).data if result.movement else None,
        })
class PurchaseViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                      mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PurchaseSerializer
    permission_classes = [IsOwnerOrManager]

    def get_queryset(self):
        queryset = Purchase.objects.select_related('tank', 'created_by')
        tank_id = _int_param(self.request, 'tank')
        supplier = self.request.query_params.get('supplier')
        date_from = _date_param(self.request, 'date_from')
        date_to = _date_param(self.request, 'date_to')
        if tank_id:
            queryset = queryset.filter(tank_id=tank_id)
        if supplier:
            queryset = queryset.filter(supplier__icontains=supplier.strip())
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class LedgerPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200



class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [IsOwnerOrManager]
    pagination_class = LedgerPagination

    def get_queryset(self):
        queryset = StockMovement.objects.select_related('tank', 'created_by')
        tank_id = _int_param(self.request, 'tank')
        movement_type = self.request.query_params.get('type')
        date_from = _date_param(self.request, 'date_from')
        date_to = _date_param(self.request, 'date_to')
        if tank_id:
            queryset = queryset.filter(tank_id=tank_id)
        if movement_type:
            if movement_type not in StockMovement.Type.values:
                raise ValidationError({'type': 'purchase, sale ya adjustment dein.'})
            queryset = queryset.filter(movement_type=movement_type)
        if date_from:
            queryset = queryset.filter(created_at__gte=_day_start(date_from))
        if date_to:
            queryset = queryset.filter(created_at__lt=_day_start(date_to + timedelta(days=1)))
        return queryset