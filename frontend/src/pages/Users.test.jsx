import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUser, fetchUsers, resetUserPassword, updateUser } from '@/api/users';
import { AuthContext } from '@/context/AuthContext';
import Users from '@/pages/Users';

vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  resetUserPassword: vi.fn(),
}));

const person = (overrides) => ({
  id: 1, username: 'boss', first_name: 'Ali', last_name: 'Raza', email: '', phone: '', role: 'owner',
  is_active: true, last_login: null, date_joined: '2026-01-01T00:00:00Z', ...overrides,
});

const everyone = () => [
  person(),
  person({ id: 2, username: 'mgr', first_name: '', last_name: '', role: 'manager' }),
  person({ id: 3, username: 'cash', first_name: '', last_name: '', role: 'cashier', is_active: false }),
];

function renderPage() {
  return render(
    <AuthContext.Provider value={{ user: { id: 1, username: 'boss', role: 'owner' }, role: 'owner', status: 'authenticated' }}>
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const rowOf = (name) => screen.getByText(name).closest('tr');

describe('Users', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchUsers.mockResolvedValue({ data: everyone() });
  });

  it('sab users, role, haalat aur "(aap)" ka nishan', async () => {
    renderPage();
    expect(await screen.findByText('mgr')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(within(rowOf('boss')).getByText('(aap)')).toBeInTheDocument();
    expect(within(rowOf('cash')).getByText('Band')).toBeInTheDocument();
    expect(within(rowOf('mgr')).getByText('Manager')).toBeInTheDocument();
  });

  it('search aur role ka filter', async () => {
    renderPage();
    await screen.findByText('mgr');
    await userEvent.type(screen.getByLabelText('Dhoondhein'), 'ali');
    expect(screen.queryByText('mgr')).not.toBeInTheDocument();
    expect(screen.getByText('boss')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Dhoondhein'));
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'cashier');
    expect(screen.queryByText('boss')).not.toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
  });

  it('naya user: ghalat username/password par API nahi', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Naya user' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Username'), 'ali raza');
    await userEvent.type(within(dialog).getByLabelText('Password'), '12345678');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(within(dialog).getByText(/Username mein sirf haroof/)).toBeInTheDocument();
    expect(within(dialog).getByText('Sirf digits wala password nahi chalega.')).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('naya user: sahi payload (role default cashier)', async () => {
    createUser.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Naya user' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Username'), 'newguy');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'Brand#New2026!');
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'manager');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(createUser).toHaveBeenCalledWith({
      first_name: '', last_name: '', email: '', phone: '', username: 'newguy', password: 'Brand#New2026!', role: 'manager',
    });
    expect(await screen.findByText('Mehfooz ho gaya.')).toBeInTheDocument();
  });

  it('server ki "username pehle se hai" wali ghalti username ke neeche', async () => {
    createUser.mockRejectedValue({ response: { status: 400, data: { username: ['Ye username pehle se maujood hai.'] } } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Naya user' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Username'), 'mgr');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'Brand#New2026!');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(await within(dialog).findByText('Ye username pehle se maujood hai.')).toBeInTheDocument();
  });

  it('apni edit: role aur "chalu" band, payload mein dono nahi', async () => {
    updateUser.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText('boss');
    await userEvent.click(within(rowOf('boss')).getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Role')).toBeDisabled();
    expect(within(dialog).getByLabelText(/Account chalu hai/)).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(updateUser).toHaveBeenCalledWith(1, { first_name: 'Ali', last_name: 'Raza', email: '', phone: '' });
  });

  it('doosre ki edit: role badal sakte hain, account band kar sakte hain', async () => {
    updateUser.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText('mgr');
    await userEvent.click(within(rowOf('mgr')).getByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'cashier');
    await userEvent.click(within(dialog).getByLabelText(/Account chalu hai/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(updateUser).toHaveBeenCalledWith(2, expect.objectContaining({ role: 'cashier', is_active: false }));
  });

  it('password reset: kamzor reject, mazboot par API aur paigham', async () => {
    resetUserPassword.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText('mgr');
    await userEvent.click(within(rowOf('mgr')).getByRole('button', { name: 'Password reset' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Naya password'), 'short');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Password badlein' }));
    expect(within(dialog).getByText('Kam az kam 8 haroof.')).toBeInTheDocument();
    expect(resetUserPassword).not.toHaveBeenCalled();
    await userEvent.clear(within(dialog).getByLabelText('Naya password'));
    await userEvent.type(within(dialog).getByLabelText('Naya password'), 'Brand#New2026!');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Password badlein' }));
    expect(resetUserPassword).toHaveBeenCalledWith(2, 'Brand#New2026!');
    expect(await screen.findByText(/mgr ka password badal diya gaya/)).toBeInTheDocument();
  });

  it('server band ho to saaf paigham', async () => {
    fetchUsers.mockRejectedValue(new Error('Network Error'));
    renderPage();
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
  });
});