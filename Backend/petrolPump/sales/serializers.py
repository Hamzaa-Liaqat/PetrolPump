import copy
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from petrolPump.utils import as_drf_error

from .models import FuelRate, Nozzle, Sale


class NozzleSerializer(serializers.ModelSerializer):
    tank_name = serializers.CharField(source='tank.name', read_only=True)
    current_rate = serializers.SerializerMethodField()

    class Meta:
        model = Nozzle
        fields = [
            'id', 'name', 'fuel_type', 'tank', 'tank_name', 'initial_reading',
            'last_reading', 'current_rate', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['last_reading', 'created_at', 'updated_at']

    def get_current_rate(self, obj):
        rates = self.context.get('_current_rates')
        if rates is None:
            rates = self.context['_current_rates'] = FuelRate.current_rates()
        return rates.get(obj.fuel_type)

    def validate(self, attrs):
        instance = copy.copy(self.instance) if self.instance else Nozzle()
        for field, value in attrs.items():
            setattr(instance, field, value)
        instance.clean()
        return attrs


class FuelRateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FuelRate
        fields = ['id', 'fuel_type', 'rate', 'effective_from', 'created_by_name', 'created_at']
        read_only_fields = ['created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None

    def validate(self, attrs):
        FuelRate(**attrs).clean()
        return attrs


class SaleSerializer(serializers.ModelSerializer):
    rate = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, min_value=Decimal('0.01'),
    )
    receipt_no = serializers.ReadOnlyField()
    nozzle_name = serializers.CharField(source='nozzle.name', read_only=True)
    fuel_type = serializers.CharField(source='nozzle.fuel_type', read_only=True)
    cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'receipt_no', 'nozzle', 'nozzle_name', 'fuel_type',
            'opening_reading', 'closing_reading', 'litres', 'rate', 'amount',
            'cashier_name', 'timestamp', 'is_void', 'void_reason',
        ]
        read_only_fields = ['litres', 'amount', 'timestamp', 'is_void', 'void_reason']

    def get_cashier_name(self, obj):
        return obj.cashier.username if obj.cashier else None

    def validate(self, attrs):
        Sale(**attrs).clean()
        return attrs

    def create(self, validated_data):
        try:
            return Sale.objects.create(cashier=self.context['request'].user, **validated_data)
        except DjangoValidationError as exc:
            raise as_drf_error(exc)


class SaleVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=180)