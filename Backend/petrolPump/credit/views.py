from datetime import timedelta

from django.db.models import Max, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsOwner, IsOwnerOrManager
from petrolPump.utils import LedgerPagination, date_param, day_start, int_param

from .models import CreditTransaction, Customer
from .serializers import (
    CreditSaleInputSerializer, CreditTransactionSerializer, CustomerSerializer,
    PaymentInputSerializer, ReversalInputSerializer,
)
from .services import (
    credit_alerts, credit_summary, customer_statement, record_credit_sale,
    record_payment, reverse_transaction, verify_customer_balance,
)

MAX_STATEMENT_DAYS = 366


class CustomerViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                      mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                      viewsets.GenericViewSet):
    serializer_class = CustomerSerializer

    def get_permissions(self):
        permission_class = IsOwner if self.action == 'verify' else IsOwnerOrManager
        return [permission_class()]

    def get_queryset(self):
        params = self.request.query_params
        queryset = Customer.objects.annotate(
            last_payment_at=Max(
                'transactions__timestamp',
                filter=Q(transactions__type=CreditTransaction.Type.PAYMENT),
            )
        )
        search = (params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(phone__icontains=search))
        if params.get('active') in ('1', 'true', 'True'):
            queryset = queryset.filter(is_active=True)
        if params.get('has_due') in ('1', 'true', 'True'):
            queryset = queryset.filter(balance__gt=0)
        return queryset

    @action(detail=True, methods=['get'])
    def statement(self, request, pk=None):
        customer = self.get_object()
        today = timezone.localdate()
        end = date_param(request, 'date_to') or today
        start = date_param(request, 'date_from') or end - timedelta(days=29)
        if start > end:
            raise ValidationError({'date_from': 'date_from, date_to se pehle ki honi chahiye.'})
        if (end - start).days >= MAX_STATEMENT_DAYS:
            raise ValidationError({'date_to': f'Ek statement mein {MAX_STATEMENT_DAYS} din se zyada nahi.'})

        data = customer_statement(customer, start, end)
        entries = CreditTransactionSerializer(data.pop('entries'), many=True).data
        return Response({
            'customer': CustomerSerializer(customer, context=self.get_serializer_context()).data,
            'date_from': start, 'date_to': end, **data, 'entries': entries,
        })

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        return Response(verify_customer_balance(self.get_object()))

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        return Response(credit_alerts())

    @action(detail=False, methods=['get'])
    def summary(self, request):
        return Response(credit_summary())


class CreditTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CreditTransactionSerializer
    pagination_class = LedgerPagination

    def get_permissions(self):
        permission_class = IsOwner if self.action == 'reverse' else IsOwnerOrManager
        return [permission_class()]

    def get_queryset(self):
        params = self.request.query_params
        queryset = CreditTransaction.objects.select_related('customer', 'created_by')
        customer_id = int_param(self.request, 'customer')
        tx_type = params.get('type')
        date_from = date_param(self.request, 'date_from')
        date_to = date_param(self.request, 'date_to')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if tx_type:
            if tx_type not in CreditTransaction.Type.values:
                raise ValidationError({'type': f'Ye mein se ek dein: {", ".join(CreditTransaction.Type.values)}'})
            queryset = queryset.filter(type=tx_type)
        if date_from:
            queryset = queryset.filter(timestamp__gte=day_start(date_from))
        if date_to:
            queryset = queryset.filter(timestamp__lt=day_start(date_to + timedelta(days=1)))
        return queryset

    @action(detail=False, methods=['post'], url_path='credit-sale')
    def credit_sale(self, request):
        serializer = CreditSaleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        entry = record_credit_sale(
            customer_id=data['customer'].pk, fuel_type=data['fuel_type'], litres=data['litres'],
            vehicle_number=data.get('vehicle_number', ''), reference=data.get('reference', ''),
            note=data.get('note', ''), user=request.user,
        )
        return Response(CreditTransactionSerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def payment(self, request):
        serializer = PaymentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        entry = record_payment(
            customer_id=data['customer'].pk, amount=data['amount'],
            reference=data.get('reference', ''), note=data.get('note', ''), user=request.user,
        )
        return Response(CreditTransactionSerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        original = self.get_object()
        serializer = ReversalInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = reverse_transaction(
            transaction_id=original.pk, reason=serializer.validated_data['reason'], user=request.user,
        )
        return Response(CreditTransactionSerializer(entry).data, status=status.HTTP_201_CREATED)