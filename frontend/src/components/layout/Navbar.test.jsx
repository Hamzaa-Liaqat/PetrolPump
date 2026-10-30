import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Navbar from '@/components/ui/Navbar';
import { AuthContext } from '@/context/AuthContext';

vi.mock('@/hooks/useServerStatus', () => ({
  useServerStatus: () => ({ status: 'online', database: 'ok' }),
}));
vi.mock('@/hooks/UseAlerts', () => ({
  UseAlerts: () => ({ alerts: [], count: 0, loading: false, error: null, reload: () => {} }),
}));

function renderNavbar(user, logout = () => {}) {
  return render(
    <AuthContext.Provider value={{ user, role: user.role, status: 'authenticated', logout }}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const person = (role, extra = {}) => ({ id: 1, username: `${role}1`, first_name: '', last_name: '', role, ...extra });

describe('Navbar', () => {
  it('cashier ko sirf Billing dikhti hai', () => {
    renderNavbar(person('cashier'));
    expect(screen.getByRole('link', { name: 'Billing' })).toBeInTheDocument();
    for (const hidden of ['Dashboard', 'Tanks', 'Deliveries', 'Credit', 'Staff', 'Expenses', 'Reports', 'Fuel rates', 'Users']) {
      expect(screen.queryByRole('link', { name: hidden })).not.toBeInTheDocument();
    }
  });

  it('manager ko Users nahi dikhta, Reports aur Deliveries dikhte hain', () => {
    renderNavbar(person('manager'));
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Deliveries' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('owner ko sab links milte hain', () => {
    renderNavbar(person('owner'));
    for (const label of ['Dashboard', 'Billing', 'Tanks', 'Deliveries', 'Credit', 'Staff', 'Expenses', 'Reports', 'Fuel rates', 'Users']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('alerts ki ghanti sirf owner/manager ko, cashier ko nahi', () => {
    const { unmount } = renderNavbar(person('cashier'));
    expect(screen.queryByRole('button', { name: /^Alerts/ })).not.toBeInTheDocument();
    unmount();
    const owner = renderNavbar(person('owner'));
    expect(screen.getByRole('button', { name: /^Alerts/ })).toBeInTheDocument();
    owner.unmount();
    renderNavbar(person('manager'));
    expect(screen.getByRole('button', { name: /^Alerts/ })).toBeInTheDocument();
  });

  it('naam aur role ka label dikhata hai (naam na ho to username)', () => {
    renderNavbar(person('manager', { first_name: 'Ali', last_name: 'Raza' }));
    expect(screen.getByText('Ali Raza')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('naam khali ho to username dikhta hai', () => {
    renderNavbar(person('cashier'));
    expect(screen.getByText('cashier1')).toBeInTheDocument();
  });

  it('Logout dabane par logout chalta hai', async () => {
    const logout = vi.fn();
    renderNavbar(person('owner'), logout);
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('mobile menu kholne par links aur "My account" dikhte hain', async () => {
    renderNavbar(person('cashier'));
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My account' })).toBeInTheDocument();
  });
});