from rest_framework.permissions import BasePermission

from .models import Profile


def get_role(user):
    """
    Return the role of the authenticated and active user's profile.
    """
    if not user or not user.is_authenticated or not user.is_active:
        return None

    profile = getattr(user, "Profile", None)

    if profile is None:
        return None

    return profile.role


class HasRole(BasePermission):
    """
    Base permission class for role-based access.
    """

    allowed_roles = ()

    message = "Aap ko is action ki ijazat nahi hai."

    def has_permission(self, request, view):
        return get_role(request.user) in self.allowed_roles


class IsOwner(HasRole):
    """
    Only Owner can access.
    """

    allowed_roles = (
        Profile.Role.OWNER,
    )


class IsOwnerOrManager(HasRole):
    """
    Owner and Manager can access.
    """

    allowed_roles = (
        Profile.Role.OWNER,
        Profile.Role.MANAGER,
    )

class HasAnyRole(HasRole):
     allowed_roles = (Profile.Role.OWNER,
                       Profile.Role.MANAGER, 
                       Profile.Role.CASHIER
                       )