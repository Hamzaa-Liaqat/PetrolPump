from rest_framework import serializers

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'category', 'category_label', 'amount', 'date', 'note', 'reference',
            'created_by_name', 'created_at', 'is_void', 'void_reason',
        ]
        read_only_fields = ['created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None

    def validate(self, attrs):
        Expense(**attrs).clean()
        return attrs


class ExpenseVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=180)