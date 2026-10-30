from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ChangePasswordView, LogoutView, MeView, MyTokenObtainPairView,
    ThrottledTokenRefreshView, UserViewSet,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', MyTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh/', ThrottledTokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
] + router.urls