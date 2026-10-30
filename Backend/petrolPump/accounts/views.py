from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Profile
from .permissions import IsOwner
from .serializers import (
    ChangePasswordSerializer, LogoutSerializer, MeUpdateSerializer, MyTokenObtainPairSerializer,
    ResetPasswordSerializer, UserCreateSerializer, UserSerializer, UserUpdateSerializer,
)
from .services import revoke_all_tokens

User = get_user_model()


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'refresh'


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data['refresh'])
            if token.get('user_id') != str(request.user.pk) and token.get('user_id') != request.user.pk:
                raise ValidationError({'refresh': 'Ye token aap ka nahi hai.'})
            token.blacklist()
        except TokenError:
            raise ValidationError({'refresh': 'Token ghalat ya expire ho chuka hai.'})
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = MeUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password'

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        revoke_all_tokens(request.user)
        return Response({'detail': 'Password badal gaya. Dobara login karein.'})


class UserViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                  mixins.UpdateModelMixin, viewsets.GenericViewSet):
    throttle_scope = "users"
    permission_classes = [IsOwner]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        params = self.request.query_params
        queryset = User.objects.select_related('Profile').order_by('username')
        role = params.get('role')
        if role:
            if role not in Profile.Role.values:
                raise ValidationError({'role': 'owner, manager ya cashier dein.'})
            queryset = queryset.filter(Profile__role=role)
        active = params.get('active')
        if active in ('1', 'true', 'True'):
            queryset = queryset.filter(is_active=True)
        elif active in ('0', 'false', 'False'):
            queryset = queryset.filter(is_active=False)
        search = (params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action == 'partial_update':
            return UserUpdateSerializer
        return UserSerializer

    @action(
        detail=True, methods=['post'], url_path='reset-password',
        throttle_classes=[ScopedRateThrottle], throttle_scope='password',
    )
    def reset_password(self, request, pk=None):
        target = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data, context={'target_user': target})
        serializer.is_valid(raise_exception=True)
        target.set_password(serializer.validated_data['new_password'])
        target.save()
        revoke_all_tokens(target)
        return Response({'detail': f'{target.username} ka password badal diya gaya.'})