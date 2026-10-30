import { UseAlerts } from '@/hooks/UseAlerts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDashboard } from '@/api/dashboard';
import { AuthContext } from '@/context/AuthContext';
import Dashboard from '@/pages/Dashboard.jsx';
import { alertsFixture, dashboardFixture, tankFixture } from '@/test/fixtures';

const noAlerts = {
  alerts: [],
  count: 0,
  loading: false,
  error: null,
  reload: vi.fn(),
};

vi.mock('@/api/dashboard', () => ({ fetchDashboard: vi.fn() }));
vi.mock('@/hooks/UseAlerts', () => ({
  UseAlerts: vi.fn(() => ({ ...noAlerts })),
}));

function renderPage() {
  return render(
    <AuthContext.Provider value={{ user: { username: 'boss', first_name: 'Ali', last_name: 'Raza', role: 'owner' }, role: 'owner', status: 'authenticated' }}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Dashboard', () => {
    beforeEach(() => {
    vi.resetAllMocks();
    UseAlerts.mockReturnValue(noAlerts);
  });

  it('load hote waqt intezar, phir numbers', async () => {
    fetchDashboard.mockResolvedValue({ data: dashboardFixture() });
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('load ho raha hai');
    expect(await screen.findByText('Rs 25,000')).toBeInTheDocument();
    expect(screen.getByText('Rs 19,000')).toBeInTheDocument();
    expect(screen.getByText('Rs 6,000', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/Ali Raza/)).toBeInTheDocument();
  });

  it('tanks aur udhaar walon ke naam dikhata hai', async () => {
    fetchDashboard.mockResolvedValue({ data: dashboardFixture() });
    renderPage();
    expect(await screen.findByText('Tank-1')).toBeInTheDocument();
    expect(screen.getByText('Ali Traders')).toBeInTheDocument();
  });

  it('kam stock par ilaan', async () => {
    const low = tankFixture({ id: 2, name: 'Tank-9', current_stock: 500, is_low: true });
    fetchDashboard.mockResolvedValue({ data: dashboardFixture({ tanks: [low], low_stock_tanks: [low] }) });
    renderPage();
    expect(await screen.findByText('Kam stock: Tank-9')).toBeInTheDocument();
  });

  it('server na mile to saaf paigham aur dobara koshish', async () => {
    fetchDashboard.mockRejectedValueOnce(new Error('Network Error'));
    renderPage();
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
    fetchDashboard.mockResolvedValue({ data: dashboardFixture() });
    await userEvent.click(screen.getByRole('button', { name: 'Dobara koshish karein' }));
    expect(await screen.findByText('Rs 25,000')).toBeInTheDocument();
  });

  it('khali din par "koi sale nahi" aur "koi udhaar nahi"', async () => {
    fetchDashboard.mockResolvedValue({
      data: dashboardFixture({ today_sales: 0, litres_sold: 0, sale_entries: 0, by_fuel_today: [], tanks: [], credit: { top_debtors: [] } }),
    });
    renderPage();
    expect(await screen.findByText('Aaj abhi koi sale nahi.')).toBeInTheDocument();
    expect(screen.getByText('Koi udhaar baqi nahi.')).toBeInTheDocument();
    expect(screen.getByText('Abhi koi tank nahi.')).toBeInTheDocument();
  });

    it('alerts ka hissa tabhi dikhta hai jab alerts hon', async () => {
    UseAlerts.mockReturnValue({ ...noAlerts, alerts: alertsFixture(), count: 3 });
    fetchDashboard.mockResolvedValue({ data: dashboardFixture() });
    renderPage();
    expect(await screen.findByRole('region', { name: 'Alerts' })).toBeInTheDocument();
    expect(screen.getByText('Tank-1 mein tel kam hai')).toBeInTheDocument();
  });
});