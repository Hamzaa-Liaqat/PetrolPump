import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCreditSale, createPayment, fetchCreditSummary, fetchCustomers, fetchStatement, reverseTransaction,
} from '@/api/credit';
import { fetchCurrentRates } from '@/api/rates';
import { AuthContext } from '@/context/AuthContext';
import CreditLedger from '@/pages/CreditLedger';
import { customerFixture, ratesFixture, statementFixture } from '@/test/fixtures';

vi.mock('@/api/credit', () => ({
  fetchCustomers: vi.fn(),
  fetchCreditSummary: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  fetchStatement: vi.fn(),
  createCreditSale: vi.fn(),
  createPayment: vi.fn(),
  reverseTransaction: vi.fn(),
}));
vi.mock('@/api/rates', () => ({ fetchCurrentRates: vi.fn() }));

function renderPage(role = 'owner') {
  return render(
    <AuthContext.Provider value={{ user: { id: 1, username: `${role}1`, role }, role, status: 'authenticated' }}>
      <MemoryRouter>
        <CreditLedger />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const rowOf = (name) => screen.getByText(name).closest('tr');
const rowAfterLoad = async (name) => {
  await screen.findByText(name);
  return rowOf(name);
};

describe('CreditLedger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchCustomers.mockResolvedValue({
      data: [
        customerFixture(),
        customerFixture({ id: 2, name: 'Bilal Goods', phone: '03211234567', balance: 0, credit_limit: 50000 }),
      ],
    });
    fetchCreditSummary.mockResolvedValue({ data: { total_due: 6000, customers_with_due: 1, alerts_count: 2 } });
    fetchCurrentRates.mockResolvedValue({ data: ratesFixture() });
  });

  it('customers, baqi aur khulasa dikhata hai', async () => {
    renderPage();
    expect(await screen.findByText('Ali Traders')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Credit' })).toBeInTheDocument();
    expect(within(rowOf('Ali Traders')).getByText('Rs 6,000.00')).toBeInTheDocument();
    expect(screen.getByText('Rs 6,000')).toBeInTheDocument();
  });

  it('client-side search aur "sirf udhaar wale"', async () => {
    renderPage();
    await screen.findByText('Ali Traders');
    await userEvent.type(screen.getByLabelText('Customer dhoondhein'), 'bil');
    expect(screen.queryByText('Ali Traders')).not.toBeInTheDocument();
    expect(screen.getByText('Bilal Goods')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Customer dhoondhein'));
    await userEvent.click(screen.getByLabelText('Sirf udhaar wale'));
    expect(screen.queryByText('Bilal Goods')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Customer dhoondhein'), 'zzz');
    expect(screen.getByText('Koi customer nahi mila.')).toBeInTheDocument();
  });

  it('jis ka udhaar 0 uska Payment button band', async () => {
    renderPage();
    await screen.findByText('Bilal Goods');
    expect(within(rowOf('Bilal Goods')).getByRole('button', { name: 'Payment' })).toBeDisabled();
    expect(within(rowOf('Ali Traders')).getByRole('button', { name: 'Payment' })).toBeEnabled();
  });

  it('udhaar: litres likhte hi andaza, phir sahi payload', async () => {
    createCreditSale.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(within(await rowAfterLoad('Ali Traders')).getByRole('button', { name: 'Udhaar' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Litres'), '100');
    expect(within(dialog).getByText('Rs 25,000.00')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Udhaar darj karein' }));
    expect(createCreditSale).toHaveBeenCalledWith({
      customer: 1, fuel_type: 'petrol', litres: '100', vehicle_number: '', reference: '', note: '',
    });
  });

  it('limit se zyada udhaar par ghalti aur button band', async () => {
    fetchCustomers.mockResolvedValue({ data: [customerFixture({ credit_limit: 10000, balance: 6000 })] });
    renderPage();
    await userEvent.click(within(await rowAfterLoad('Ali Traders')).getByRole('button', { name: 'Udhaar' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Litres'), '100');
    expect(within(dialog).getByText(/Credit limit se zyada/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Udhaar darj karein' })).toBeDisabled();
  });

  it('payment: "Poora baqi" aur payload; baqi se zyada reject', async () => {
    createPayment.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(within(await rowAfterLoad('Ali Traders')).getByRole('button', { name: 'Payment' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Payment (Rs)'), '7000');
    expect(within(dialog).getByText(/baqi udhaar/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Payment darj karein' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Poora baqi' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Payment darj karein' }));
    expect(createPayment).toHaveBeenCalledWith({ customer: 1, amount: '6000', reference: '', note: '' });
  });

  it('credit limit sirf owner badal sakta hai', async () => {
    const { unmount } = renderPage('manager');
    await userEvent.click(await screen.findByRole('button', { name: 'Naya customer' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('Credit limit (Rs)')).toBeDisabled();
    unmount();
    renderPage('owner');
    await userEvent.click(await screen.findByRole('button', { name: 'Naya customer' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('Credit limit (Rs)')).toBeEnabled();
  });

  it('statement: owner ko Reverse, wajah lazmi, phir reverseTransaction', async () => {
    fetchStatement.mockResolvedValue({ data: statementFixture() });
    reverseTransaction.mockResolvedValue({ data: {} });
    renderPage('owner');
    await userEvent.click(within(await rowAfterLoad('Ali Traders')).getByRole('button', { name: 'Statement' }));
    expect(await screen.findByText('Credit sale')).toBeInTheDocument();
    expect(fetchStatement).toHaveBeenCalledWith(1, expect.objectContaining({ date_from: expect.any(String), date_to: expect.any(String) }));
    await userEvent.click(screen.getByRole('button', { name: 'Reverse' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reverse karein' }));
    expect(await screen.findByText('Wajah likhna lazmi hai.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Wajah'), 'Cheque bounce');
    await userEvent.click(screen.getByRole('button', { name: 'Reverse karein' }));
    expect(reverseTransaction).toHaveBeenCalledWith(11, 'Cheque bounce');
  });

  it('statement mein manager ko Reverse nahi, reverse ho chuki entry par bhi nahi', async () => {
    fetchStatement.mockResolvedValue({ data: statementFixture() });
    const { unmount } = renderPage('manager');
    await userEvent.click(within(await rowAfterLoad('Ali Traders')).getByRole('button', { name: 'Statement' }));
    await screen.findByText('Credit sale');
    expect(screen.queryByRole('button', { name: 'Reverse' })).not.toBeInTheDocument();
    unmount();

    const entries = [
      ...statementFixture().entries,
      { ...statementFixture().entries[0], id: 12, type: 'sale_reversal', type_label: 'Credit sale reversed', reversal_of: 11, signed_amount: '-25000.00' },
    ];
    fetchStatement.mockResolvedValue({ data: statementFixture({ entries }) });
    renderPage('owner');
    await userEvent.click(within(await rowAfterLoad('Ali Traders')).getByRole('button', { name: 'Statement' }));
    await screen.findByText('Credit sale reversed');
    expect(screen.queryByRole('button', { name: 'Reverse' })).not.toBeInTheDocument();
  });

  it('server band ho to saaf paigham', async () => {
    fetchCustomers.mockRejectedValue(new Error('Network Error'));
    renderPage();
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
  });
});