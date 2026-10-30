import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, loginRequest, logoutRequest } from '@/api/auth';
import { AUTH_EXPIRED_EVENT } from '@/api/axios';
import { tokenStore } from '@/api/tokenStore';
import { AuthProvider } from '@/context/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/api/auth', () => ({
  fetchMe: vi.fn(),
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  fetchHealth: vi.fn(),
}));

function Probe() {
  const { status, role, user, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="role">{role ?? 'none'}</p>
      <p data-testid="name">{user?.username ?? 'none'}</p>
      <button onClick={() => login('cash', 'pw').catch(() => {})}>do-login</button>
      <button onClick={logout}>do-logout</button>
    </div>
  );
}

const mountProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const status = () => screen.getByTestId('status').textContent;

function tokenClaiming(role) {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ role })}.sig`;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });

  it('token na ho to foran anonymous, server se kuch nahi poochta', () => {
    mountProvider();
    expect(status()).toBe('anonymous');
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it('role server se aata hai, token ke andar ke role se nahi', async () => {
    tokenStore.set(tokenClaiming('owner'), 'refresh-token');
    fetchMe.mockResolvedValue({ data: { id: 5, username: 'ali', role: 'cashier' } });
    mountProvider();
    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(screen.getByTestId('role')).toHaveTextContent('cashier');
  });

  it('server token rad kare (401) to logout aur token saaf', async () => {
    tokenStore.set('old-access', 'old-refresh');
    fetchMe.mockRejectedValue({ response: { status: 401 } });
    mountProvider();
    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(tokenStore.access).toBeNull();
    expect(tokenStore.refresh).toBeNull();
  });

  it('server na mile (network) to logout nahi, unreachable aur token mehfooz', async () => {
    tokenStore.set('a', 'r');
    fetchMe.mockRejectedValue(new Error('Network Error'));
    mountProvider();
    await waitFor(() => expect(status()).toBe('unreachable'));
    expect(tokenStore.refresh).toBe('r');
  });

  it('kamyab login token store karta hai aur role set karta hai', async () => {
    loginRequest.mockResolvedValue({
      data: { access: 'A', refresh: 'R', user: { id: 1, username: 'cash', role: 'cashier' } },
    });
    mountProvider();
    await userEvent.click(screen.getByText('do-login'));
    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(tokenStore.access).toBe('A');
    expect(tokenStore.refresh).toBe('R');
    expect(screen.getByTestId('name')).toHaveTextContent('cash');
  });

  it('nakam login par anonymous rehta hai aur koi token nahi bachta', async () => {
    loginRequest.mockRejectedValue({ response: { status: 401 } });
    mountProvider();
    await userEvent.click(screen.getByText('do-login'));
    await waitFor(() => expect(loginRequest).toHaveBeenCalled());
    expect(status()).toBe('anonymous');
    expect(tokenStore.access).toBeNull();
  });

  it('logout server ko refresh bhejta hai aur local state saaf karta hai', async () => {
    tokenStore.set('a', 'r');
    fetchMe.mockResolvedValue({ data: { id: 1, username: 'cash', role: 'cashier' } });
    logoutRequest.mockResolvedValue({});
    mountProvider();
    await waitFor(() => expect(status()).toBe('authenticated'));
    await userEvent.click(screen.getByText('do-logout'));
    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(logoutRequest).toHaveBeenCalledWith('r');
    expect(tokenStore.access).toBeNull();
  });

  it('logout API fail ho tab bhi local logout ho jata hai', async () => {
    tokenStore.set('a', 'r');
    fetchMe.mockResolvedValue({ data: { id: 1, username: 'cash', role: 'cashier' } });
    logoutRequest.mockRejectedValue(new Error('server band'));
    mountProvider();
    await waitFor(() => expect(status()).toBe('authenticated'));
    await userEvent.click(screen.getByText('do-logout'));
    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(tokenStore.refresh).toBeNull();
  });

  it('axios se "session expire" ka event aaye to foran logout', async () => {
    tokenStore.set('a', 'r');
    fetchMe.mockResolvedValue({ data: { id: 1, username: 'cash', role: 'cashier' } });
    mountProvider();
    await waitFor(() => expect(status()).toBe('authenticated'));
    act(() => {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    });
    expect(status()).toBe('anonymous');
    expect(screen.getByTestId('role')).toHaveTextContent('none');
  });
});