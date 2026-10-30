from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.models import Profile
from accounts.permissions import IsOwner, IsOwnerOrManager, get_role,HasAnyRole 
from inventory.models import FuelType
from petrolPump.utils import as_drf_error, date_param, day_start, int_param, parse_date_or_error

from .models import FuelRate, Nozzle, Sale
from .serializers import (
    FuelRateSerializer, NozzleSerializer, SaleSerializer, SaleVoidSerializer,
)
from .services import void_sale

MAX_RANGE_DAYS = 92


class NozzleViewSet(viewsets.ModelViewSet):
    serializer_class = NozzleSerializer
    WRITE_ACTIONS = ('create', 'update', 'partial_update', 'destroy')

    def get_permissions(self):
        permission_class = IsOwner if self.action in self.WRITE_ACTIONS else HasAnyRole
        return [permission_class()]

    def get_queryset(self):
        queryset = Nozzle.objects.select_related('tank')
        if get_role(self.request.user) == Profile.Role.CASHIER:
            queryset = queryset.filter(is_active=True)
        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'Is nozzle ki sales history hai, delete nahi ho sakta. is_active=false kar dein.'},
                status=status.HTTP_409_CONFLICT,
            )


class FuelRateViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                      mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = FuelRateSerializer
    queryset = FuelRate.objects.select_related('created_by')

    def get_permissions(self):
        permission_class = IsOwner if self.action == 'create' else HasAnyRole
        return [permission_class()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        data = [
            {'fuel_type': fuel_type, 'label': FuelType(fuel_type).label, 'rate': rate}
            for fuel_type, rate in FuelRate.current_rates().items()
        ]
        return Response(data)


class SaleViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                  mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = SaleSerializer

    def get_permissions(self):
        permission_class = IsOwnerOrManager if self.action == 'void' else HasAnyRole
        return [permission_class()]

    def _date_window(self):
        params = self.request.query_params
        today = timezone.localdate()
        if params.get('date'):
            raw = params['date']
            day = today if raw == 'today' else parse_date_or_error('date', raw)
            return day, day
        start = date_param(self.request, 'date_from')
        end = date_param(self.request, 'date_to')
        if start is None and end is None:
            return today, today
        end = end or today
        start = start or end
        if start > end:
            raise ValidationError({'date_from': 'date_from, date_to se pehle ki honi chahiye.'})
        if (end - start).days >= MAX_RANGE_DAYS:
            raise ValidationError({'date_to': f'Ek baar mein {MAX_RANGE_DAYS} din se zyada nahi.'})
        return start, end

    def get_queryset(self):
        params = self.request.query_params
        role = get_role(self.request.user)
        queryset = Sale.objects.select_related('nozzle', 'cashier')
        if role == Profile.Role.CASHIER:
            queryset = queryset.filter(cashier=self.request.user)
        if self.action != 'list':
            return queryset

        start, end = self._date_window()
        queryset = queryset.filter(
            timestamp__gte=day_start(start),
            timestamp__lt=day_start(end + timedelta(days=1)),
        )
        nozzle_id = int_param(self.request, 'nozzle')
        if nozzle_id:
            queryset = queryset.filter(nozzle_id=nozzle_id)
        fuel_type = params.get('fuel_type')
        if fuel_type:
            if fuel_type not in FuelType.values:
                raise ValidationError({'fuel_type': 'petrol, hi_octane ya diesel dein.'})
            queryset = queryset.filter(nozzle__fuel_type=fuel_type)

        wants_void = params.get('include_void') in ('1', 'true', 'True')
        can_see_void = role in (Profile.Role.OWNER, Profile.Role.MANAGER)
        if not (wants_void and can_see_void):
            queryset = queryset.active()
        return queryset

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        sale = self.get_object()
        serializer = SaleVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            voided = void_sale(
                sale_id=sale.pk, user=request.user, reason=serializer.validated_data['reason'],
            )
        except DjangoValidationError as exc:
            raise as_drf_error(exc)
        return Response(SaleSerializer(voided).data)
