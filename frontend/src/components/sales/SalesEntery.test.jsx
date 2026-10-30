import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSale, fetchNozzles, fetchTodaySales, voidSale } from '@/api/sales';
import { AuthContext } from '@/context/AuthContext';
import SalesEntery from '@/components/sales/SalesEntery';
import { nozzleFixture, saleFixture } from '@/test/fixtures';

vi.mock('@/api/sales', () => ({
  fetchNozzles: vi.fn(),
  fetchTodaySales: vi.fn(),
  createSale: vi.fn(),
  voidSale: vi.fn(),
}));

function renderPage(role) {
  return render(
    <AuthContext.Provider value={{ user: { id: 1, username: `${role}1`, role }, role, status: 'authenticated' }}>
      <MemoryRouter>
        <SalesEntery />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('SalesEntery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchNozzles.mockResolvedValue({ data: [nozzleFixture(), nozzleFixture({ id: 3, name: 'Band', is_active: false })] });
    fetchTodaySales.mockResolvedValue({ data: [saleFixture()] });
  });

  it('aaj ki entries aur jama dikhata hai, band nozzle nahi', async () => {
    renderPage('cashier');
    expect(await screen.findByText('RCP-000007')).toBeInTheDocument();
    expect(screen.getAllByText('Rs 25,000.00')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Band/ })).not.toBeInTheDocument();
  });

  it('cashier ko Void ka button nahi, manager ko hai', async () => {
    const { unmount } = renderPage('cashier');
    await screen.findByText('RCP-000007');
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
    unmount();
    renderPage('manager');
    expect(await screen.findByRole('button', { name: 'Void' })).toBeInTheDocument();
  });

  it('sale ke baad receipt dikhti hai aur dono list dobara aati hain', async () => {
    createSale.mockResolvedValue({ data: saleFixture({ id: 8, receipt_no: 'RCP-000008' }) });
    renderPage('cashier');
    await userEvent.type(await screen.findByLabelText('Closing reading'), '1100');
    await userEvent.click(screen.getByRole('button', { name: 'Sale darj karein' }));
    expect(await screen.findByRole('dialog', { name: 'Receipt' })).toBeInTheDocument();
    expect(screen.getByText('RCP-000008')).toBeInTheDocument();
    expect(fetchTodaySales.mock.calls.length).toBeGreaterThan(1);
    expect(fetchNozzles.mock.calls.length).toBeGreaterThan(1);
  });

  it('void: wajah lazmi, phir voidSale chalta hai', async () => {
    voidSale.mockResolvedValue({ data: {} });
    renderPage('owner');
    await userEvent.click(await screen.findByRole('button', { name: 'Void' }));
    await userEvent.click(screen.getByRole('button', { name: 'Void karein' }));
    expect(await screen.findByText('Wajah likhna lazmi hai.')).toBeInTheDocument();
    expect(voidSale).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Wajah'), 'Typo');
    await userEvent.click(screen.getByRole('button', { name: 'Void karein' }));
    expect(voidSale).toHaveBeenCalledWith(7, 'Typo');
  });

  it('nozzle na mile to dobara koshish ka button', async () => {
    fetchNozzles.mockRejectedValue(new Error('Network Error'));
    renderPage('cashier');
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dobara koshish karein' })).toBeInTheDocument();
  });
});