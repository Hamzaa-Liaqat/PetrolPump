import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTank, fetchStockMovements, fetchTanks, reconcileTank } from '@/api/inventory';
import { AuthContext } from '@/context/AuthContext';
import Inventory from '@/pages/Inventory';
import { movementFixture, tankFixture } from '@/test/fixtures';
import { fetchNozzles } from '@/api/sales';
vi.mock('@/api/inventory', () => ({
  fetchTanks: vi.fn(),
  createTank: vi.fn(),
  updateTank: vi.fn(),
  reconcileTank: vi.fn(),
  fetchStockMovements: vi.fn(),
}));

vi.mock('@/api/sales', () => ({
  fetchNozzles: vi.fn().mockResolvedValue({ data: [] }),
  createNozzle: vi.fn(),
  updateNozzle: vi.fn(),
}));

function renderPage(role) {
  return render(
    <AuthContext.Provider value={{ user: { id: 1, username: `${role}1`, role }, role, status: 'authenticated' }}>
      <MemoryRouter>
        <Inventory />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('Inventory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchNozzles.mockResolvedValue({ data: [] });
    fetchTanks.mockResolvedValue({
      data: [
        tankFixture(),
        tankFixture({ id: 2, name: 'Tank-2', fuel_type: 'diesel', current_stock: 500, is_low: true, fill_percent: 5 }),
      ],
    });
    fetchStockMovements.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [movementFixture()] },
    });
  });

  it('tanks, kam stock ka nishan aur ledger dikhata hai', async () => {
    renderPage('owner');
    expect(await screen.findByRole('heading', { name: 'Tank-2' })).toBeInTheDocument();
    expect(screen.getByText('Kam stock')).toBeInTheDocument();
    expect(await screen.findByText('Purchase (delivery)')).toBeInTheDocument();
    expect(screen.getByText('+5,000 L')).toBeInTheDocument();
  });

  it('owner ko Naya tank aur Edit, manager ko sirf Dip check', async () => {
    const { unmount } = renderPage('owner');
    await screen.findByRole('heading', { name: 'Tank-2' });
    expect(screen.getByRole('button', { name: 'Naya tank' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    unmount();
    renderPage('manager');
    await screen.findByRole('heading', { name: 'Tank-2' });
    expect(screen.queryByRole('button', { name: 'Naya tank' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Dip check' })).toHaveLength(2);
  });

  it('dip check: farq ka andaza, phir server ko sahi payload', async () => {
    reconcileTank.mockResolvedValue({
      data: {
        tank: tankFixture({ current_stock: 4900 }),
        variance_litres: -100,
        variance_percent: '-2.00',
        is_significant: true,
        tolerance_percent: 0.5,
        movement: { id: 9 },
      },
    });
    renderPage('manager');
    await userEvent.click((await screen.findAllByRole('button', { name: 'Dip check' }))[0]);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Naapa hua stock (L)'), '4900');
    expect(within(dialog).getByText(/-100 L/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stock theek karein' }));
    expect(await within(dialog).findByText('Wajah/note likhna lazmi hai (jaise "Shaam ki dip").')).toBeInTheDocument();
    expect(reconcileTank).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText('Note'), 'Evening dip');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stock theek karein' }));
    expect(reconcileTank).toHaveBeenCalledWith(1, { measured_litres: '4900', note: 'Evening dip' });
    expect(await screen.findByText(/Ye 0.5% se zyada hai/)).toBeInTheDocument();
  });

  it('capacity se zyada dip reject', async () => {
    renderPage('owner');
    await userEvent.click((await screen.findAllByRole('button', { name: 'Dip check' }))[0]);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Naapa hua stock (L)'), '10001');
    expect(within(dialog).getByText('Naapa hua stock tank ki capacity se zyada nahi ho sakta.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Stock theek karein' })).toBeDisabled();
  });

  it('naya tank: khali form par ghalti, API nahi', async () => {
    renderPage('owner');
    await userEvent.click(await screen.findByRole('button', { name: 'Naya tank' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(within(dialog).getByText('Tank ka naam likhein.')).toBeInTheDocument();
    expect(within(dialog).getByText('Capacity 0 se zyada number honi chahiye.')).toBeInTheDocument();
    expect(createTank).not.toHaveBeenCalled();
  });

  it('naya tank: reorder level capacity se zyada reject, sahi form par payload', async () => {
    createTank.mockResolvedValue({ data: tankFixture({ id: 3 }) });
    renderPage('owner');
    await userEvent.click(await screen.findByRole('button', { name: 'Naya tank' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Naam'), 'Tank-3');
    await userEvent.type(within(dialog).getByLabelText('Capacity (L)'), '500');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(within(dialog).getByText('Reorder level capacity se zyada nahi ho sakta.')).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText('Reorder level (L)'));
    await userEvent.type(within(dialog).getByLabelText('Reorder level (L)'), '100');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mehfooz karein' }));
    expect(createTank).toHaveBeenCalledWith({ name: 'Tank-3', fuel_type: 'petrol', capacity: '500', reorder_level: '100' });
  });

  it('server band ho to saaf paigham', async () => {
    fetchTanks.mockRejectedValue(new Error('Network Error'));
    renderPage('owner');
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
  });
});