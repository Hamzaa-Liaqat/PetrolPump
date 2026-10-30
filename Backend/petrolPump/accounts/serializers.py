from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, Throttled
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Profile
from .services import (
    LOCK_SECONDS, clear_failures, ensure_profile, is_locked, register_failure, revoke_all_tokens,
)

User = get_user_model()
PHONE_REGEX = r'^\+?\d{10,15}$'
PHONE_MESSAGE = 'Phone sirf digits mein likhein (10 se 15 digits, shuru mein + allowed).'


def _validate_new_password(password, user, field='new_password'):
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({field: list(exc.messages)})


def _phone_field():
    return serializers.RegexField(
        PHONE_REGEX, max_length=16, required=False, allow_blank=True,
        error_messages={'invalid': PHONE_MESSAGE},
    )


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = ensure_profile(user).role
        token['username'] = user.username
        return token

    def validate(self, attrs):
        request = self.context.get('request')
        username = attrs.get(self.username_field, '')
        if request is not None and is_locked(request, username):
            raise Throttled(
                wait=LOCK_SECONDS,
                detail='Bohat zyada ghalat koshishein. Kuch der baad dobara try karein.',
            )
        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            if request is not None:
                register_failure(request, username)
            raise
        if request is not None:
            clear_failures(request, username)

        profile = ensure_profile(self.user)
        data['user'] = {
            'id': self.user.pk,
            'username': self.user.username,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': profile.role,
        }
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'phone',
            'is_active', 'last_login', 'date_joined',
        ]

    def get_role(self, user):
        return ensure_profile(user).role

    def get_phone(self, user):
        return ensure_profile(user).phone


class MeUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = _phone_field()

    def update(self, user, validated_data):
        with transaction.atomic():
            for field in ('first_name', 'last_name', 'email'):
                if field in validated_data:
                    setattr(user, field, validated_data[field])
            user.save()
            if 'phone' in validated_data:
                profile = ensure_profile(user)
                profile.phone = validated_data['phone']
                profile.save()
        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Purana password ghalat hai.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'Naya password purane se alag hona chahiye.'})
        _validate_new_password(attrs['new_password'], user)
        return attrs


class UserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=Profile.Role.choices, default=Profile.Role.CASHIER)
    phone = _phone_field()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Ye username pehle se maujood hai.')
        return value

    def validate(self, attrs):
        probe = User(
            username=attrs['username'], first_name=attrs.get('first_name', ''),
            last_name=attrs.get('last_name', ''), email=attrs.get('email', ''),
        )
        _validate_new_password(attrs['password'], probe, field='password')
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                email=validated_data.get('email', ''),
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
            )
            profile = ensure_profile(user)
            profile.role = validated_data['role']
            profile.phone = validated_data.get('phone', '')
            profile.save()
        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


class UserUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=Profile.Role.choices, required=False)
    phone = _phone_field()
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        actor = self.context['request'].user
        if self.instance.pk == actor.pk:
            if 'role' in attrs and attrs['role'] != ensure_profile(actor).role:
                raise serializers.ValidationError({'role': 'Aap apna role khud nahi badal sakte.'})
            if 'is_active' in attrs and attrs['is_active'] != actor.is_active:
                raise serializers.ValidationError({'is_active': 'Aap apna account khud band nahi kar sakte.'})
        return attrs

    def update(self, user, validated_data):
        with transaction.atomic():
            for field in ('first_name', 'last_name', 'email', 'is_active'):
                if field in validated_data:
                    setattr(user, field, validated_data[field])
            user.save()
            profile = ensure_profile(user)
            if 'role' in validated_data:
                profile.role = validated_data['role']
            if 'phone' in validated_data:
                profile.phone = validated_data['phone']
            profile.save()
            if validated_data.get('is_active') is False:
                revoke_all_tokens(user)
        return user

    def to_representation(self, instance):
        return UserSerializer(instance).data


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        _validate_new_password(attrs['new_password'], self.context['target_user'])
        return attrs