import hashlib

from django.core.cache import cache
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .models import Profile

FAIL_LIMIT = 5
LOCK_SECONDS = 15 * 60


def ensure_profile(user):
    profile = getattr(user, 'Profile', None)
    if profile is None:
        role = Profile.Role.OWNER if user.is_superuser else Profile.Role.CASHIER
        profile, _ = Profile.objects.get_or_create(user=user, defaults={'role': role})
    return profile


def revoke_all_tokens(user):
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


def _attempt_key(request, username):
    raw = f"{request.META.get('REMOTE_ADDR', 'unknown')}|{(username or '').strip().lower()}"
    return 'login-fail:' + hashlib.sha256(raw.encode()).hexdigest()


def is_locked(request, username):
    return cache.get(_attempt_key(request, username), 0) >= FAIL_LIMIT


def register_failure(request, username):
    key = _attempt_key(request, username)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, LOCK_SECONDS)


def clear_failures(request, username):
    cache.delete(_attempt_key(request, username))