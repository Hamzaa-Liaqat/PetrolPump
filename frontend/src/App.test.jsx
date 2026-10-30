import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { NAV_ITEMS } from '@/config/navigation';
import { ROLE_LIST } from '@/config/role';
import { AuthContext } from '@/context/AuthContext';

vi.mock('@/hooks/useServerStatus', () => ({
  useServerStatus: () => ({ status: 'online', database: 'ok' }),
}));
vi.mock('@/hooks/UseAlerts', () => ({
  UseAlerts: () => ({ alerts: [], count: 0, loading: false, error: null, reload: () => {} }),
}));
vi.mock('@/components/diagnostics/ConnectionChecks', () => ({
  default: () => <p>CHECKS</p>,
}));
vi.mock('@/api/auth', () => ({
  fetchMe: vi.fn().mockResolvedValue({ data: { id: 1, username: 'x', first_name: '', last_name: '', email: '', phone: '', role: 'owner' } }),
  updateMeRequest: vi.fn(),
  changePasswordRequest: vi.fn(),
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  fetchHealth: vi.fn(),
}));
vi.mock('@/api/dashboard', async () => {
  const { dashboardFixture } = await import('@/test/fixtures');
  return { fetchDashboard: vi.fn().mockResolvedValue({ data: dashboardFixture() }) };
});
vi.mock('@/api/sales', () => ({
  fetchNozzles: vi.fn().mockResolvedValue({ data: [] }),
  fetchTodaySales: vi.fn().mockResolvedValue({ data: [] }),
  createSale: vi.fn(),
  voidSale: vi.fn(),
}));
vi.mock('@/api/inventory', () => ({
  fetchTanks: vi.fn().mockResolvedValue({ data: [] }),
  fetchStockMovements: vi.fn().mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } }),
  createTank: vi.fn(),
  updateTank: vi.fn(),
  reconcileTank: vi.fn(),
}));
vi.mock('@/api/purchases', () => ({
  fetchPurchases: vi.fn().mockResolvedValue({ data: [] }),
  createPurchase: vi.fn(),
}));
vi.mock('@/api/credit', () => ({
  fetchCustomers: vi.fn().mockResolvedValue({ data: [] }),
  fetchCreditSummary: vi.fn().mockResolvedValue({ data: { total_due: 0, customers_with_due: 0, alerts_count: 0 } }),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  fetchStatement: vi.fn(),
  createCreditSale: vi.fn(),
  createPayment: vi.fn(),
  reverseTransaction: vi.fn(),
}));
vi.mock('@/api/rates', () => ({
  fetchCurrentRates: vi.fn().mockResolvedValue({ data: [] }),
  fetchRates: vi.fn().mockResolvedValue({ data: [] }),
  createRate: vi.fn(),
}));
vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn().mockResolvedValue({ data: [] }),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  resetUserPassword: vi.fn(),
}));
vi.mock('react-chartjs-2', () => ({ Bar: () => <div />, Line: () => <div /> }));
vi.mock('@/api/reports', () => ({
  fetchReportSummary: vi.fn().mockResolvedValue({
    data: {
      year: 2026, month: 10, period: '2026-10',
      totals: { sales: 0, litres: 0, entries: 0, purchases: 0, expenses: 0, salaries: 0, salaries_is_estimate: false, profit: 0 },
      by_fuel: [], by_nozzle: [], daily: [],
      purchases: { cost: 0, litres_invoiced: 0, litres_received: 0, count: 0, shortage_litres: 0 },
      expenses: { by_category: [] },
      credit: { credit_sales: 0, credit_payments: 0, outstanding_now: 0 },
    },
  }),
  fetchProfitLoss: vi.fn(),
  downloadReport: vi.fn(),
}));
vi.mock('@/api/expenses', () => ({
  fetchExpenses: vi.fn().mockResolvedValue({ data: [] }),
  createExpense: vi.fn(),
  voidExpense: vi.fn(),
}));
vi.mock('@/api/staff', () => ({
  fetchSheet: vi.fn().mockResolvedValue({ data: { date: '2026-10-11', summary: {}, rows: [] } }),
  markDay: vi.fn(),
  patchAttendance: vi.fn(),
  fetchStaff: vi.fn().mockResolvedValue({ data: [] }),
  createStaff: vi.fn(),
  updateStaff: vi.fn(),
  fetchSalaryPreview: vi.fn(),
  fetchPayslips: vi.fn().mockResolvedValue({ data: [] }),
  fetchPayrollSummary: vi.fn().mockResolvedValue({ data: {} }),
  generatePayslip: vi.fn(),
  markPayslipPaid: vi.fn(),
  cancelPayslip: vi.fn(),
}));

function renderApp(path, auth) {
  const user = auth.role ? { id: 1, username: `${auth.role}1`, first_name: '', last_name: '', role: auth.role } : null;
  return render(
    <AuthContext.Provider value={{ user, status: 'anonymous', logout: () => {}, retry: () => {}, login: () => {}, ...auth }}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const authed = (role) => ({ role, status: 'authenticated' });

describe('App routes: har role x har page ki jaanch', () => {
  for (const role of ROLE_LIST) {
    for (const item of NAV_ITEMS) {
      const allowed = item.roles.includes(role);
      it(`${role} ${item.path} par ${allowed ? 'page dekhta hai' : 'ijazat ka paigham dekhta hai'}`, async () => {
        renderApp(item.path, authed(role));
        if (allowed) {
          expect(await screen.findByRole('heading', { name: item.label })).toBeInTheDocument();
          expect(screen.queryByRole('heading', { name: 'Is page ki ijazat nahi' })).not.toBeInTheDocument();
        } else {
          expect(screen.getByRole('heading', { name: 'Is page ki ijazat nahi' })).toBeInTheDocument();
        }
      });
    }
  }
});

describe('App routes: baqi raste', () => {
  it('login ke bagair har page login par jata hai', () => {
    for (const item of NAV_ITEMS) {
      const { unmount } = renderApp(item.path, { role: null, status: 'anonymous' });
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
      unmount();
    }
  });

  it('"/" par har role apne home par jata hai', async () => {
    const { unmount } = renderApp('/', authed('cashier'));
    expect(await screen.findByRole('heading', { name: 'Billing' })).toBeInTheDocument();
    unmount();
    renderApp('/', authed('owner'));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('anjaan address par 404', () => {
    renderApp('/yeh-page-nahi-hai', authed('owner'));
    expect(screen.getByText('Ye page maujood nahi')).toBeInTheDocument();
  });
});