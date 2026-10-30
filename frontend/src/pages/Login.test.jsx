import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/context/AuthContext';
import Login from '@/pages/Login';

vi.mock('@/hooks/useServerStatus', () => ({
  useServerStatus: () => ({ status: 'online', database: 'ok' }),
}));

function renderLogin(auth, entry = '/login') {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', role: null, login: vi.fn(), ...auth }}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/billing" element={<p>BILLING PAGE</p>} />
          <Route path="/dashboard" element={<p>DASHBOARD PAGE</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

async function fillAndSubmit(username, password) {
  await userEvent.type(screen.getByLabelText('Username'), username);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Login karein' }));
}

describe('Login page', () => {
  it('khali form mein button band hai', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Login karein' })).toBeDisabled();
  });

  it('username ke aage peeche ki khali jagah hata kar bhejta hai, password waisa hi', async () => {
    const login = vi.fn().mockResolvedValue({ role: 'cashier' });
    renderLogin({ login });
    await fillAndSubmit('  cash  ', ' pw ');
    expect(login).toHaveBeenCalledWith('cash', ' pw ');
  });

  it('ghalat password: 401 par saaf paigham aur password khali', async () => {
    const login = vi.fn().mockRejectedValue({ response: { status: 401 } });
    renderLogin({ login });
    await fillAndSubmit('cash', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Username ya password ghalat hai.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('lockout (429) ka alag paigham', async () => {
    const login = vi.fn().mockRejectedValue({ response: { status: 429, data: {} } });
    renderLogin({ login });
    await fillAndSubmit('cash', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Bohat zyada koshishein');
  });

  it('server band ho to network wala paigham', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Network Error'));
    renderLogin({ login });
    await fillAndSubmit('cash', 'pw');
    expect(await screen.findByRole('alert')).toHaveTextContent('Server se rabta nahi');
  });

  it('password dikhane/chhupane ka button', async () => {
    renderLogin();
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Dikhayein' }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('pehle se login cashier ko apna home (billing) milta hai', () => {
    renderLogin({ status: 'authenticated', role: 'cashier' });
    expect(screen.getByText('BILLING PAGE')).toBeInTheDocument();
  });

  it('wapas jaane ka rasta sirf tab jab role ko ijazat ho', () => {
    const entry = { pathname: '/login', state: { from: { pathname: '/dashboard' } } };
    const { unmount } = renderLogin({ status: 'authenticated', role: 'owner' }, entry);
    expect(screen.getByText('DASHBOARD PAGE')).toBeInTheDocument();
    unmount();
    renderLogin({ status: 'authenticated', role: 'cashier' }, entry);
    expect(screen.getByText('BILLING PAGE')).toBeInTheDocument();
  });
});