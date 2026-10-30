import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changePasswordRequest, fetchMe, updateMeRequest } from '@/api/auth';
import { AuthContext } from '@/context/AuthContext';
import Profile from '@/pages/Profile';
import { peekFlash } from '@/utils/flash';

vi.mock('@/api/auth', () => ({
  fetchMe: vi.fn(),
  updateMeRequest: vi.fn(),
  changePasswordRequest: vi.fn(),
}));
vi.mock('@/components/diagnostics/ConnectionChecks', () => ({ default: () => <p>CHECKS</p> }));

const me = { id: 1, username: 'cash', first_name: 'Ali', last_name: 'Raza', email: '', phone: '03001234567', role: 'cashier', last_login: null };

function renderPage(auth = {}) {
  return render(
    <AuthContext.Provider
      value={{ user: me, role: 'cashier', status: 'authenticated', refreshUser: vi.fn().mockResolvedValue(me), logout: vi.fn().mockResolvedValue(), ...auth }}
    >
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Profile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    fetchMe.mockResolvedValue({ data: me });
  });

  it('server se aayi maloomat form mein bhar deta hai', async () => {
    renderPage();
    expect(await screen.findByLabelText('Phone')).toHaveValue('03001234567');
    expect(screen.getByLabelText('Pehla naam')).toHaveValue('Ali');
  });

  it('ghalat phone par API nahi bulata', async () => {
    renderPage();
    const phone = await screen.findByLabelText('Phone');
    await userEvent.clear(phone);
    await userEvent.type(phone, 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Mehfooz karein' }));
    expect(screen.getByText(/Phone sirf digits mein likhein/)).toBeInTheDocument();
    expect(updateMeRequest).not.toHaveBeenCalled();
  });

  it('sahi maloomat par update, phir user dobara load', async () => {
    updateMeRequest.mockResolvedValue({ data: me });
    const refreshUser = vi.fn().mockResolvedValue(me);
    renderPage({ refreshUser });
    const first = await screen.findByLabelText('Pehla naam');
    await userEvent.clear(first);
    await userEvent.type(first, 'Hamza');
    await userEvent.click(screen.getByRole('button', { name: 'Mehfooz karein' }));
    expect(updateMeRequest).toHaveBeenCalledWith({ first_name: 'Hamza', last_name: 'Raza', email: '', phone: '03001234567' });
    expect(refreshUser).toHaveBeenCalled();
    expect(await screen.findByText('Maloomat mehfooz ho gayi.')).toBeInTheDocument();
  });

  it('server ki field ghalti (email) email ke neeche', async () => {
    updateMeRequest.mockRejectedValue({ response: { status: 400, data: { email: ['Valid email dein.'] } } });
    renderPage();
    await screen.findByLabelText('Email');
    await userEvent.click(screen.getByRole('button', { name: 'Mehfooz karein' }));
    expect(await screen.findByText('Valid email dein.')).toBeInTheDocument();
  });

  it('password: dono naye password mel na khayen to API nahi', async () => {
    renderPage();
    await userEvent.type(await screen.findByLabelText('Purana password'), 'Old#12345');
    await userEvent.type(screen.getByLabelText('Naya password'), 'Brand#New2026!');
    await userEvent.type(screen.getByLabelText('Naya password dobara'), 'Different#1');
    await userEvent.click(screen.getByRole('button', { name: 'Password badlein' }));
    expect(screen.getByText('Dono password mel nahi khate.')).toBeInTheDocument();
    expect(changePasswordRequest).not.toHaveBeenCalled();
  });

  it('password: kamyabi par logout aur login page ke liye paigham', async () => {
    changePasswordRequest.mockResolvedValue({ data: {} });
    const logout = vi.fn().mockResolvedValue();
    renderPage({ logout });
    await userEvent.type(await screen.findByLabelText('Purana password'), 'Old#12345');
    await userEvent.type(screen.getByLabelText('Naya password'), 'Brand#New2026!');
    await userEvent.type(screen.getByLabelText('Naya password dobara'), 'Brand#New2026!');
    await userEvent.click(screen.getByRole('button', { name: 'Password badlein' }));
    expect(changePasswordRequest).toHaveBeenCalledWith('Old#12345', 'Brand#New2026!');
    expect(logout).toHaveBeenCalledTimes(1);
    expect(peekFlash()).toContain('Password badal gaya');
  });

  it('password: purana ghalat ho to server ki ghalti, logout nahi', async () => {
    changePasswordRequest.mockRejectedValue({ response: { status: 400, data: { old_password: ['Purana password ghalat hai.'] } } });
    const logout = vi.fn();
    renderPage({ logout });
    await userEvent.type(await screen.findByLabelText('Purana password'), 'Wrong#12345');
    await userEvent.type(screen.getByLabelText('Naya password'), 'Brand#New2026!');
    await userEvent.type(screen.getByLabelText('Naya password dobara'), 'Brand#New2026!');
    await userEvent.click(screen.getByRole('button', { name: 'Password badlein' }));
    expect(await screen.findByText('Purana password ghalat hai.')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });
});