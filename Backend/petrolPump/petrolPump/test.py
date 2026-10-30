from django.test import TestCase, override_settings
from django.urls import reverse
from inventory.models import FuelType
from accounts.models import Profile
from reports.models import ExpenseCategory
from staff.models import Attendance, Shift, Staff

ORIGIN = 'http://localhost:5173'

PROTECTED_URL_NAMES = [
    'auth-me', 'user-list', 'tank-list', 'purchase-list', 'stock-movement-list',
    'nozzle-list', 'fuel-rate-list', 'sale-list', 'customer-list', 'credit-transaction-list',
    'staff-list', 'attendance-list', 'payslip-list', 'expense-list',
    'dashboard-summary', 'report-summary', 'report-sales-trend', 'report-profit-loss',
    'report-export', 'alerts',
]


@override_settings(CORS_ALLOWED_ORIGINS=[ORIGIN])
class FrontendConnectionTests(TestCase):
    def test_health_is_public_and_reveals_nothing_else(self):
        response = self.client.get(reverse('health'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok', 'database': 'ok'})

    def test_download_filename_header_is_visible_to_the_browser(self):
        response = self.client.get(reverse('health'), HTTP_ORIGIN=ORIGIN)
        exposed = response['Access-Control-Expose-Headers'].lower()
        self.assertIn('content-disposition', exposed)

    def test_choice_values_match_the_frontend(self):

        self.assertEqual(
            sorted(ExpenseCategory.values),
            ['electricity', 'maintenance', 'other', 'rent', 'repair', 'supplies', 'tax'],
        )
        self.assertEqual(sorted(Attendance.Status.values), ['absent', 'half_day', 'present'])
        self.assertEqual(sorted(Shift.values), ['evening', 'morning', 'night'])
        self.assertEqual(sorted(Staff.Position.values), ['attendant', 'cashier', 'other'])

    def test_fuel_values_match_the_frontend(self):   
        self.assertEqual(sorted(FuelType.values), ['diesel', 'hi_octane', 'petrol'])

    def test_cors_allows_the_frontend_origin(self):
        response = self.client.get(reverse('health'), HTTP_ORIGIN=ORIGIN)
        self.assertEqual(response['Access-Control-Allow-Origin'], ORIGIN)

    def test_cors_does_not_allow_other_origins(self):
        response = self.client.get(reverse('health'), HTTP_ORIGIN='http://evil.example')
        self.assertNotIn('Access-Control-Allow-Origin', response)

    def test_preflight_allows_authorization_header(self):
        response = self.client.options(
            reverse('auth-login'),
            HTTP_ORIGIN=ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization,content-type',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Access-Control-Allow-Origin'], ORIGIN)
        allowed = response['Access-Control-Allow-Headers'].lower()
        self.assertIn('authorization', allowed)
        self.assertIn('content-type', allowed)

    def test_every_api_endpoint_needs_login(self):
        for name in PROTECTED_URL_NAMES:
            response = self.client.get(reverse(name))
            self.assertIn(response.status_code, (401, 403), name)

    def test_role_values_match_the_frontend(self):
        # frontend/src/config/roles.js ki ROLE_LIST se mel khana chahiye
        self.assertEqual(sorted(Profile.Role.values), ['cashier', 'manager', 'owner'])