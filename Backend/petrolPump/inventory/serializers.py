import copy

from rest_framework import serializers

from .models import Purchase, StockMovement, Tank


class TankSerializer(serializers.ModelSerializer):
    fill_percent = serializers.ReadOnlyField()
    is_low = serializers.ReadOnlyField()
    available_space = serializers.ReadOnlyField()

    class Meta:
        model = Tank
        fields = [
            'id', 'name', 'fuel_type', 'capacity', 'current_stock', 'reorder_level',
            'is_active', 'fill_percent', 'is_low', 'available_space',
             'updated_at',
        ]
        read_only_fields = ['current_stock', 'created_at', 'updated_at']

    def validate(self, attrs):
        instance = copy.copy(self.instance) if self.instance else Tank()
        for field, value in attrs.items():
            setattr(instance, field, value)
        instance.clean()
        return attrs

class PurchaseSerializer(serializers.ModelSerializer):
    tank_name = serializers.CharField(source='tank.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    shortage_litres = serializers.ReadOnlyField()
    cost_per_litre = serializers.ReadOnlyField()

    class Meta:
        model = Purchase
        fields = [
            'id', 'tank', 'tank_name', 'supplier', 'tanker_number', 'invoice_number',
            'litres', 'received_litres', 'dip_before', 'dip_after', 'shortage_litres',
            'invoice_amount', 'cost_per_litre', 'date', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None

    def validate(self, attrs):
        instance = Purchase(**attrs)
        instance.clean()
        attrs['received_litres'] = instance.received_litres
        return attrs

class StockMovementSerializer(serializers.ModelSerializer):
    tank_name = serializers.CharField(source='tank.name', read_only=True)
    movement_label = serializers.CharField(source='get_movement_type_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            'id', 'tank', 'tank_name', 'movement_type', 'movement_label',
            'litres_change', 'balance_after', 'reference', 'note',
            'created_by_name', 'created_at',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None


class TankReconcileSerializer(serializers.Serializer):
    measured_litres = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    note = serializers.CharField(max_length=200)