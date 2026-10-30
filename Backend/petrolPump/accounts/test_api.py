from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()
PASSWORD = 'Test@12345'
NEW_PASSWORD = 'Brand#New2026!'


def make_user(username, role, **extra):
    user = User.objects.create_user(username=username, password=PASSWORD, **extra)
    user.Profile.role = role
    user.Profile.save()
    return user


class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('boss', 'owner')
        self.manager = make_user('mgr', 'manager')
        self.cashier = make_user('cash', 'cashier')

    def login(self, username='cash', password=PASSWORD):
        return self.client.post(reverse('auth-login'), {'username': username, 'password': password})

    def bearer(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_login_returns_tokens_role_and_user(self):
        response = self.login()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(AccessToken(response.data['access'])['role'], 'cashier')
        self.assertEqual(response.data['user']['role'], 'cashier')
        self.assertIn('refresh', response.data)
        self.cashier.refresh_from_db()
        self.assertIsNotNone(self.cashier.last_login)

    def test_bad_credentials_look_the_same(self):
        wrong = self.login(password='wrong')
        unknown = self.login(username='nobody')
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(wrong.data['detail'], unknown.data['detail'])
        self.cashier.is_active = False
        self.cashier.save()
        self.assertEqual(self.login().status_code, 401)

    def test_lockout_after_repeated_failures(self):
        for _ in range(5):
            self.assertEqual(self.login(password='wrong').status_code, 401)
        self.assertEqual(self.login().status_code, 429)
        cache.clear()
        self.assertEqual(self.login().status_code, 200)

    def test_success_resets_failure_counter(self):
        for _ in range(2):
            self.login(password='wrong')
        self.assertEqual(self.login().status_code, 200)
        for _ in range(3):
            self.login(password='wrong')
        self.assertEqual(self.login().status_code, 200)

    def test_token_gives_access_and_missing_token_does_not(self):
        self.assertEqual(self.client.get(reverse('auth-me')).status_code, 401)
        self.bearer(self.login().data['access'])
        me = self.client.get(reverse('auth-me'))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['username'], 'cash')
        self.assertNotIn('password', me.data)

    def test_refresh_rotates_and_old_refresh_dies(self):
        refresh = self.login().data['refresh']
        url = reverse('auth-refresh')
        fresh = self.client.post(url, {'refresh': refresh})
        self.assertEqual(fresh.status_code, 200, fresh.data)
        self.assertIn('access', fresh.data)
        self.assertIn('refresh', fresh.data)
        self.assertEqual(self.client.post(url, {'refresh': refresh}).status_code, 401)

    def test_logout_blacklists_refresh(self):
        data = self.login().data
        other_refresh = self.login(username='mgr').data['refresh']
        self.bearer(data['access'])
        self.assertEqual(self.client.post(reverse('auth-logout'), {'refresh': other_refresh}).status_code, 400)
        self.assertEqual(self.client.post(reverse('auth-logout'), {'refresh': data['refresh']}).status_code, 204)
        self.client.credentials()
        self.assertEqual(self.client.post(reverse('auth-refresh'), {'refresh': data['refresh']}).status_code, 401)

    def test_me_update_cannot_change_role(self):
        self.client.force_authenticate(user=self.cashier)
        url = reverse('auth-me')
        ok = self.client.patch(url, {'first_name': 'Ali', 'phone': '03001234567', 'role': 'owner'})
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data['first_name'], 'Ali')
        self.assertEqual(ok.data['role'], 'cashier')
        self.assertEqual(self.client.patch(url, {'phone': 'abc'}).status_code, 400)

    def test_change_password_flow(self):
        data = self.login().data
        self.bearer(data['access'])
        url = reverse('auth-change-password')
        self.assertEqual(self.client.post(url, {'old_password': 'bad', 'new_password': NEW_PASSWORD}).status_code, 400)
        self.assertEqual(self.client.post(url, {'old_password': PASSWORD, 'new_password': '12345678'}).status_code, 400)
        self.assertEqual(self.client.post(url, {'old_password': PASSWORD, 'new_password': NEW_PASSWORD}).status_code, 200)
        self.client.credentials()
        self.assertEqual(self.client.post(reverse('auth-refresh'), {'refresh': data['refresh']}).status_code, 401)
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, 200)

    def test_role_in_token_is_not_trusted_for_permissions(self):
        access = self.login(username='mgr').data['access']
        self.client.force_authenticate(user=self.owner)
        demote = self.client.patch(reverse('user-detail', args=[self.manager.pk]), {'role': 'cashier'})
        self.assertEqual(demote.status_code, 200, demote.data)
        self.client.force_authenticate(user=None)
        self.bearer(access)
        self.assertEqual(AccessToken(access)['role'], 'manager')
        self.assertEqual(self.client.get(reverse('customer-list')).status_code, 403)


class UserManagementTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('boss', 'owner')
        self.manager = make_user('mgr', 'manager')
        self.cashier = make_user('cash', 'cashier')

    def new_user_payload(self, **overrides):
        data = {
            'username': 'newguy', 'password': NEW_PASSWORD, 'first_name': 'Naya',
            'role': 'cashier', 'phone': '03211234567',
        }
        data.update(overrides)
        return data

    def test_only_owner_can_manage_users(self):
        url = reverse('user-list')
        self.assertEqual(self.client.get(url).status_code, 401)
        for user in (self.manager, self.cashier):
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.get(url).status_code, 403)
            self.assertEqual(self.client.post(url, self.new_user_payload()).status_code, 403)

    def test_owner_creates_user_with_role(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(reverse('user-list'), self.new_user_payload(role='manager'))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['role'], 'manager')
        self.assertNotIn('password', response.data)
        created = User.objects.get(username='newguy')
        self.assertTrue(created.check_password(NEW_PASSWORD))
        self.assertEqual(created.Profile.phone, '03211234567')

    def test_create_validation(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('user-list')
        self.assertEqual(self.client.post(url, self.new_user_payload(password='12345678')).status_code, 400)
        self.assertEqual(self.client.post(url, self.new_user_payload(username='CASH')).status_code, 400)
        self.assertEqual(self.client.post(url, self.new_user_payload(role='god')).status_code, 400)
        self.assertEqual(self.client.post(url, self.new_user_payload(phone='abc')).status_code, 400)

    def test_list_filters(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse('user-list'), {'role': 'cashier'})
        self.assertEqual([user['username'] for user in response.data], ['cash'])
        inactive = self.client.get(reverse('user-list'), {'active': '0'})
        self.assertEqual(len(inactive.data), 0)
        self.assertEqual(self.client.get(reverse('user-list'), {'role': 'god'}).status_code, 400)

    def test_owner_cannot_change_own_role_or_deactivate_self(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('user-detail', args=[self.owner.pk])
        self.assertEqual(self.client.patch(url, {'role': 'cashier'}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'is_active': False}).status_code, 400)
        self.assertEqual(self.client.patch(url, {'first_name': 'Boss'}).status_code, 200)

    def test_deactivation_kills_tokens_immediately(self):
        cache.clear()
        login = self.client.post(reverse('auth-login'), {'username': 'cash', 'password': PASSWORD})
        access, refresh = login.data['access'], login.data['refresh']
        self.client.force_authenticate(user=self.owner)
        self.assertEqual(
            self.client.patch(reverse('user-detail', args=[self.cashier.pk]), {'is_active': False}).status_code, 200,
        )
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        self.assertEqual(self.client.get(reverse('auth-me')).status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post(reverse('auth-refresh'), {'refresh': refresh}).status_code, 401)

    def test_owner_resets_password(self):
        self.client.force_authenticate(user=self.owner)
        url = reverse('user-reset-password', args=[self.cashier.pk])
        self.assertEqual(self.client.post(url, {'new_password': '12345678'}).status_code, 400)
        self.assertEqual(self.client.post(url, {'new_password': NEW_PASSWORD}).status_code, 200)
        self.client.force_authenticate(user=None)
        cache.clear()
        old = self.client.post(reverse('auth-login'), {'username': 'cash', 'password': PASSWORD})
        new = self.client.post(reverse('auth-login'), {'username': 'cash', 'password': NEW_PASSWORD})
        self.assertEqual(old.status_code, 401)
        self.assertEqual(new.status_code, 200)