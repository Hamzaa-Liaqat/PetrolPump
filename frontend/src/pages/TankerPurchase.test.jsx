import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTanks } from '@/api/inventory';
import { createPurchase, fetchPurchases } from '@/api/purchases';
import TankerPurchase from '@/pages/TankerPurchase';
import { purchaseFixture, tankFixture } from '@/test/fixtures';

vi.mock('@/api/inventory', () => ({ fetchTanks: vi.fn() }));
vi.mock('@/api/purchases', () => ({ fetchPurchases: vi.fn(), createPurchase: vi.fn() }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <TankerPurchase />
    </MemoryRouter>,
  );

describe('TankerPurchase', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchTanks.mockResolvedValue({ data: [tankFixture({ available_space: 10000 })] });
    fetchPurchases.mockResolvedValue({
      data: [
        purchaseFixture(),
        purchaseFixture({
          id: 2, supplier: 'Shell', invoice_number: 'INV-2', tanker_number: 'ABC-9', litres: '2000.00',
          received_litres: '2000.00', shortage_litres: '0.00', invoice_amount: '600000.00', cost_per_litre: '300.00',
        }),
      ],
    });
  });

  it('deliveries, jama aur kami ka nishan dikhata hai', async () => {
    renderPage();
    expect(await screen.findByText('INV-1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Deliveries' })).toBeInTheDocument();
    expect(screen.getByText('6,950 L')).toBeInTheDocument();
    expect(screen.getByText('Rs 21,00,000')).toBeInTheDocument();
    expect(screen.getAllByText('50 L').length).toBeGreaterThan(0);
  });

  it('supplier se client-side search', async () => {
    renderPage();
    await screen.findByText('INV-1');
    await userEvent.type(screen.getByLabelText('Dhoondhein'), 'shell');
    expect(screen.queryByText('INV-1')).not.toBeInTheDocument();
    expect(screen.getByText('INV-2')).toBeInTheDocument();
  });

  it('tank ka filter API ko bhejta hai', async () => {
    renderPage();
    await screen.findByText('INV-1');
    await userEvent.selectOptions(screen.getAllByLabelText('Tank')[1], '1');
    expect(fetchPurchases).toHaveBeenLastCalledWith(expect.objectContaining({ tank: '1' }));
  });

  it('delivery darj hone par notice aur dono list dobara', async () => {
    createPurchase.mockResolvedValue({ data: purchaseFixture({ invoice_number: 'INV-9' }) });
    renderPage();
    await screen.findByText('INV-1');
    await userEvent.selectOptions(screen.getAllByLabelText('Tank')[0], '1');
    await userEvent.type(screen.getByLabelText('Supplier'), 'PSO');
    await userEvent.type(screen.getByLabelText('Tanker number'), 'LEA-1');
    await userEvent.type(screen.getByLabelText('Invoice number'), 'INV-9');
    await userEvent.type(screen.getByLabelText('Invoice ke litres'), '1000');
    await userEvent.type(screen.getByLabelText('Invoice ki raqam (Rs)'), '300000');
    await userEvent.click(screen.getByRole('button', { name: 'Delivery darj karein' }));
    expect(await screen.findByText(/Delivery darj ho gayi: INV-9/)).toBeInTheDocument();
    expect(fetchPurchases.mock.calls.length).toBeGreaterThan(1);
    expect(fetchTanks.mock.calls.length).toBeGreaterThan(1);
  });

  it('koi chalu tank na ho to pehle tank banane ka paigham', async () => {
    fetchTanks.mockResolvedValue({ data: [tankFixture({ is_active: false })] });
    renderPage();
    expect(await screen.findByText('Pehle Tanks page par tank banayein.')).toBeInTheDocument();
  });

  it('server band ho to saaf paigham', async () => {
    fetchPurchases.mockRejectedValue(new Error('Network Error'));
    renderPage();
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
  });
});