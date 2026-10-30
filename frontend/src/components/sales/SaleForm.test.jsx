import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSale } from '@/api/sales';
import SaleForm from '@/components/sales/SaleForm';
import { nozzleFixture, saleFixture } from '@/test/fixtures';

vi.mock('@/api/sales', () => ({ createSale: vi.fn() }));

const two = [nozzleFixture(), nozzleFixture({ id: 2, name: 'N2', fuel_type: 'diesel', last_reading: 500, current_rate: 225.5 })];

async function typeClosing(value) {
  await userEvent.type(screen.getByLabelText('Closing reading'), value);
}

describe('SaleForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('ek hi nozzle ho to khud chun leta hai, opening aur rate server se', () => {
    render(<SaleForm nozzles={[nozzleFixture()]} onSaved={() => {}} />);
    expect(screen.getByLabelText('Opening reading')).toHaveValue('1000');
    expect(screen.getByLabelText('Opening reading')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Rate (Rs / litre)')).toHaveValue('250');
  });

  it('nozzle chune bagair closing band aur button band', () => {
    render(<SaleForm nozzles={two} onSaved={() => {}} />);
    expect(screen.getByLabelText('Closing reading')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sale darj karein' })).toBeDisabled();
  });

  it('closing likhte hi andaza dikhata hai', async () => {
    render(<SaleForm nozzles={two} onSaved={() => {}} />);
    await userEvent.selectOptions(screen.getByLabelText('Nozzle'), '1');
    await typeClosing('1100');
    expect(screen.getByText('100 L = Rs 25,000.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sale darj karein' })).toBeEnabled();
  });

  it('closing opening se kam ho to ghalti aur button band', async () => {
    render(<SaleForm nozzles={[nozzleFixture()]} onSaved={() => {}} />);
    await typeClosing('900');
    expect(screen.getByText('Closing reading, opening reading se zyada honi chahiye.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sale darj karein' })).toBeDisabled();
  });

  it('3 decimal wala number reject', async () => {
    render(<SaleForm nozzles={[nozzleFixture()]} onSaved={() => {}} />);
    await typeClosing('1100.123');
    expect(screen.getByText(/2 decimal/)).toBeInTheDocument();
  });

  it('sahi payload bhejta hai aur onSaved chalata hai, closing saaf', async () => {
    const sale = saleFixture();
    createSale.mockResolvedValue({ data: sale });
    const onSaved = vi.fn();
    render(<SaleForm nozzles={[nozzleFixture()]} onSaved={onSaved} />);
    await typeClosing('1100');
    await userEvent.click(screen.getByRole('button', { name: 'Sale darj karein' }));
    expect(createSale).toHaveBeenCalledWith({ nozzle: 1, opening_reading: '1000', closing_reading: '1100', rate: '250' });
    expect(onSaved).toHaveBeenCalledWith(sale);
    expect(screen.getByLabelText('Closing reading')).toHaveValue('');
  });

  it('server ki opening wali ghalti dikhata hai aur nozzles dobara mangwata hai', async () => {
    createSale.mockRejectedValue({
      response: { status: 400, data: { opening_reading: ['Is nozzle ka pichla closing reading 1100 hai.'] } },
    });
    const onStale = vi.fn();
    render(<SaleForm nozzles={[nozzleFixture()]} onSaved={() => {}} onStale={onStale} />);
    await typeClosing('1100');
    await userEvent.click(screen.getByRole('button', { name: 'Sale darj karein' }));
    expect(await screen.findByText('Is nozzle ka pichla closing reading 1100 hai.')).toBeInTheDocument();
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('stock kam hone ki ghalti closing ke neeche', async () => {
    createSale.mockRejectedValue({
      response: { status: 400, data: { closing_reading: ['Tank-1 mein sirf 50 litre hai.'] } },
    });
    render(<SaleForm nozzles={[nozzleFixture()]} onSaved={() => {}} />);
    await typeClosing('1100');
    await userEvent.click(screen.getByRole('button', { name: 'Sale darj karein' }));
    expect(await screen.findByText('Tank-1 mein sirf 50 litre hai.')).toBeInTheDocument();
  });

  it('nozzle badalne par closing saaf', async () => {
    render(<SaleForm nozzles={two} onSaved={() => {}} />);
    await userEvent.selectOptions(screen.getByLabelText('Nozzle'), '1');
    await typeClosing('1100');
    await userEvent.selectOptions(screen.getByLabelText('Nozzle'), '2');
    expect(screen.getByLabelText('Closing reading')).toHaveValue('');
    expect(screen.getByLabelText('Opening reading')).toHaveValue('500');
    expect(screen.getByLabelText('Rate (Rs / litre)')).toHaveValue('225.5');
  });

  it('rate set na ho to sale nahi ho sakti', async () => {
    render(<SaleForm nozzles={[nozzleFixture({ current_rate: null })]} onSaved={() => {}} />);
    await typeClosing('1100');
    expect(screen.getByText('Is fuel ka rate set nahi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sale darj karein' })).toBeDisabled();
  });
});