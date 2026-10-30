from decimal import Decimal

from rest_framework import serializers

from accounts.models import Profile
from accounts.permissions import get_role
from inventory.models import FuelType

from .models import CreditTransaction, Customer


class CustomerSerializer(serializers.ModelSerializer):
    available_credit = serializers.ReadOnlyField()
    is_over_limit = serializers.ReadOnlyField()
    last_payment_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'address', 'credit_limit', 'balance',
            'available_credit', 'is_over_limit', 'last_payment_at',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['balance', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context['request']
        if 'credit_limit' in attrs and get_role(request.user) != Profile.Role.OWNER:
            current = self.instance.credit_limit if self.instance else Decimal('0.00')
            if attrs['credit_limit'] != current:
                raise serializers.ValidationError(
                    {'credit_limit': 'Credit limit sirf owner tay ya badal sakta hai.'}
                )
        if self.instance and attrs.get('is_active') is False and self.instance.balance > 0:
            raise serializers.ValidationError(
                {'is_active': 'Jis customer ka udhaar baqi ho usay inactive nahi kar sakte.'}
            )
        return attrs


class CreditTransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    type_label = serializers.CharField(source='get_type_display', read_only=True)
    signed_amount = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CreditTransaction
        fields = [
            'id', 'customer', 'customer_name', 'type', 'type_label', 'fuel_type',
            'litres', 'rate', 'amount', 'signed_amount', 'balance_after',
            'vehicle_number', 'reference', 'note', 'reversal_of',
            'timestamp', 'created_by_name',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None


class CreditSaleInputSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.filter(is_active=True))
    fuel_type = serializers.ChoiceField(choices=FuelType.choices)
    litres = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    vehicle_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    reference = serializers.CharField(max_length=50, required=False, allow_blank=True)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)


class PaymentInputSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    reference = serializers.CharField(max_length=50, required=False, allow_blank=True)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)


class ReversalInputSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=180)