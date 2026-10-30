from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import Profile

User = get_user_model()


class ProfileModelTests(TestCase):
    def make_user(self, name='ali'):
        return User.objects.create_user(username=name, password='Test@12345')

    def test_profile_auto_created_with_cashier_role(self):
        user = self.make_user()
        self.assertEqual(Profile.objects.filter(user=user).count(), 1)
        self.assertEqual(user.Profile.role, Profile.Role.CASHIER)

    def test_superuser_gets_owner_role(self):
        boss = User.objects.create_superuser(username='boss', password='Test@12345')
        self.assertEqual(boss.Profile.role, Profile.Role.OWNER)

    def test_password_is_hashed(self):
        user = self.make_user()
        self.assertNotEqual(user.password, 'Test@12345')
        self.assertTrue(user.check_password('Test@12345'))

    def test_second_profile_for_same_user_rejected(self):
        user = self.make_user()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Profile.objects.create(user=user, role=Profile.Role.MANAGER)

    def test_invalid_role_rejected(self):
        profile = self.make_user().Profile
        profile.role = 'hacker'
        with self.assertRaises(ValidationError) as ctx:
            profile.full_clean()
        self.assertIn('role', ctx.exception.message_dict)

    def test_bad_phone_rejected(self):
        profile = self.make_user().Profile
        profile.phone = 'abc123'
        with self.assertRaises(ValidationError):
            profile.full_clean()

    def test_good_phone_accepted(self):
        profile = self.make_user().Profile
        profile.phone = '+923001234567'
        profile.full_clean()

    def test_deleting_user_deletes_profile(self):
        user = self.make_user()
        user.delete()
        self.assertEqual(Profile.objects.count(), 0)

    def test_str(self):
        self.assertEqual(str(self.make_user().Profile), 'ali (Cashier)')
