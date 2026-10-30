import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPurchase } from '@/api/purchases';
import PurchaseForm from '@/components/purchases/PurchaseForm';
import { purchaseFixture, tankFixture } from '@/test/fixtures';
import { toISODate } from '@/utils/date';

vi.mock('@/api/purchases', () => ({ createPurchase: vi.fn() }));

const tanks = [tankFixture({ available_space: 10000 })];

async function fillBasics({ litres = '5000', amount = '1500000' } = {}) {
  await userEvent.selectOptions(screen.getByLabelText('Tank'), '1');
  await userEvent.type(screen.getByLabelText('Supplier'), 'PSO');
  await userEvent.type(screen.getByLabelText('Tanker number'), 'LEA-1234');
  await userEvent.type(screen.getByLabelText('Invoice number'), 'INV-1');
  await userEvent.type(screen.getByLabelText('Invoice ke litres'), litres);
  await userEvent.type(screen.getByLabelText('Invoice ki raqam (Rs)'), amount);
}

const submit = () => screen.getByRole('button', { name: 'Delivery darj karein' });

describe('PurchaseForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shuru mein button band, tareekh aaj ki', () => {
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    expect(submit()).toBeDisabled();
    expect(screen.getByLabelText('Tareekh')).toHaveValue(toISODate());
  });

  it('andaza: asli tel aur qeemat per litre', async () => {
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    await fillBasics();
    expect(screen.getByText('Asli tel: 5,000 L')).toBeInTheDocument();
    expect(screen.getByText(/Rs 300.00 \/ litre/)).toBeInTheDocument();
    expect(submit()).toBeEnabled();
  });

  it('sahi payload bhejta hai aur onSaved chalata hai', async () => {
    const saved = purchaseFixture();
    createPurchase.mockResolvedValue({ data: saved });
    const onSaved = vi.fn();
    render(<PurchaseForm tanks={tanks} onSaved={onSaved} />);
    await fillBasics();
    await userEvent.click(submit());
    expect(createPurchase).toHaveBeenCalledWith({
      tank: 1, supplier: 'PSO', tanker_number: 'LEA-1234', invoice_number: 'INV-1',
      litres: '5000', invoice_amount: '1500000', date: toISODate(),
    });
    expect(onSaved).toHaveBeenCalledWith(saved);
    expect(screen.getByLabelText('Invoice number')).toHaveValue('');
    expect(screen.getByLabelText('Supplier')).toHaveValue('PSO');
  });

  it('dip reading: asli tel dip se, kami ka ilaan aur dip payload mein', async () => {
    createPurchase.mockResolvedValue({ data: purchaseFixture() });
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    await fillBasics();
    await userEvent.click(screen.getByLabelText('Dip reading se asli tel naapna hai'));
    await userEvent.type(screen.getByLabelText('Dip pehle (L)'), '1000');
    await userEvent.type(screen.getByLabelText('Dip baad (L)'), '5950');
    expect(screen.getByText('Asli tel: 4,950 L')).toBeInTheDocument();
    expect(screen.getByText(/ye 0.5% se zyada hai/)).toBeInTheDocument();
    await userEvent.click(submit());
    expect(createPurchase).toHaveBeenCalledWith(expect.objectContaining({ dip_before: '1000', dip_after: '5950' }));
  });

  it('tank mein jagah se zyada tel par ghalti aur button band', async () => {
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    await fillBasics({ litres: '20000' });
    expect(screen.getByText(/Tank mein sirf 10000.00 litre jagah hai/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('supplier khali ho to local ghalti, API nahi', async () => {
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    await fillBasics();
    await userEvent.clear(screen.getByLabelText('Supplier'));
    await userEvent.click(submit());
    expect(screen.getByText('Supplier ka naam likhein.')).toBeInTheDocument();
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it('wohi invoice dobara: server ki ghalti dikhati hai', async () => {
    createPurchase.mockRejectedValue({
      response: { status: 400, data: { non_field_errors: ['The fields supplier, invoice_number must make a unique set.'] } },
    });
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    await fillBasics();
    await userEvent.click(submit());
    expect(await screen.findByText(/must make a unique set/)).toBeInTheDocument();
  });

  it('future ki tareekh reject (local)', async () => {
    render(<PurchaseForm tanks={tanks} onSaved={() => {}} />);
    await fillBasics();
    const date = screen.getByLabelText('Tareekh');
    await userEvent.clear(date);
    await userEvent.type(date, '2999-01-01');
    await userEvent.click(submit());
    expect(screen.getByText('Future ki tareekh nahi ho sakti.')).toBeInTheDocument();
    expect(createPurchase).not.toHaveBeenCalled();
  });
});