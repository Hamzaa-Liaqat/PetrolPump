import copy
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from .models import Attendance, Payslip, Shift, Staff


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            'id', 'name', 'phone', 'position', 'shift', 'daily_rate',
            'user', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class AttendanceSerializer(serializers.ModelSerializer):
    date = serializers.DateField(default=timezone.localdate)
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    marked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = ['id', 'staff', 'staff_name', 'date', 'status', 'shift', 'marked_by_name', 'updated_at']
        read_only_fields = ['updated_at']

    def get_marked_by_name(self, obj):
        return obj.marked_by.username if obj.marked_by else None

    def validate(self, attrs):
        if self.instance:
            for field in ('staff', 'date'):
                if field in attrs and attrs[field] != getattr(self.instance, field):
                    raise serializers.ValidationError({
                        field: 'Ye badla nahi ja sakta. Galat entry ho to owner delete karke dobara lagaye.'
                    })
        instance = copy.copy(self.instance) if self.instance else Attendance()
        for field, value in attrs.items():
            setattr(instance, field, value)
        instance.clean()
        return attrs


class AttendanceEntrySerializer(serializers.Serializer):
    staff = serializers.PrimaryKeyRelatedField(queryset=Staff.objects.filter(is_active=True))
    status = serializers.ChoiceField(choices=Attendance.Status.choices)
    shift = serializers.ChoiceField(choices=Shift.choices, required=False)


class MarkDaySerializer(serializers.Serializer):
    date = serializers.DateField(default=timezone.localdate)
    entries = AttendanceEntrySerializer(many=True, allow_empty=False)

    def validate_entries(self, entries):
        if len(entries) > 200:
            raise serializers.ValidationError('Ek baar mein 200 se zyada entries nahi.')
        staff_ids = [entry['staff'].pk for entry in entries]
        if len(staff_ids) != len(set(staff_ids)):
            raise serializers.ValidationError('Ek staff member ek se zyada baar nahi aa sakta.')
        return entries


class PayslipSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    period = serializers.ReadOnlyField()
    is_paid = serializers.ReadOnlyField()
    generated_by_name = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payslip
        fields = [
            'id', 'staff', 'staff_name', 'year', 'month', 'period', 'days_present',
            'gross_amount', 'deduction', 'deduction_note', 'net_amount',
            'is_paid', 'paid_on', 'generated_by_name', 'paid_by_name', 'generated_at',
        ]

    def get_generated_by_name(self, obj):
        return obj.generated_by.username if obj.generated_by else None

    def get_paid_by_name(self, obj):
        return obj.paid_by.username if obj.paid_by else None


class PayslipGenerateSerializer(serializers.Serializer):
    staff = serializers.PrimaryKeyRelatedField(queryset=Staff.objects.all())
    year = serializers.IntegerField(min_value=2000, max_value=2100)
    month = serializers.IntegerField(min_value=1, max_value=12)
    deduction = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, min_value=Decimal('0'),
    )
    deduction_note = serializers.CharField(max_length=200, required=False, allow_blank=True)
    allow_unmarked = serializers.BooleanField(default=False)


class MarkPaidSerializer(serializers.Serializer):
    paid_on = serializers.DateField(required=False)