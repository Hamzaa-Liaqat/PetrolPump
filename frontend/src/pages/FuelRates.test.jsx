import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRate, fetchCurrentRates, fetchRates } from '@/api/rates';
import { AuthContext } from '@/context/AuthContext';
import FuelRates from '@/pages/FuelRates';
import { rateHistoryFixture, ratesFixture } from '@/test/fixtures';

vi.mock('@/api/rates', () => ({ fetchCurrentRates: vi.fn(), fetchRates: vi.fn(), createRate: vi.fn() }));

function renderPage(role = 'owner') {
  return render(
    <AuthContext.Provider value={{ user: { id: 1, username: `${role}1`, role }, role, status: 'authenticated' }}>
      <MemoryRouter>
        <FuelRates />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('FuelRates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchCurrentRates.mockResolvedValue({ data: ratesFixture() });
    fetchRates.mockResolvedValue({ data: rateHistoryFixture() });
  });

  it('har fuel ka maujooda rate, jis ka rate nahi usay saaf likha', async () => {
    renderPage();
    const section = await screen.findByLabelText('Maujooda rates');
    expect(await within(section).findByText('Rs 250.00')).toBeInTheDocument();
    expect(within(section).getAllByText('Rate set nahi')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Fuel rates' })).toBeInTheDocument();
  });

  it('pichle rate se farq dikhata hai', async () => {
    renderPage();
    expect(await screen.findByText(/Pichla Rs 262.00 \(\+3.50\)/)).toBeInTheDocument();
  });

  it('sirf owner ko naya rate ka form', async () => {
    const { unmount } = renderPage('owner');
    expect(await screen.findByRole('button', { name: 'Rate lagayein' })).toBeInTheDocument();
    unmount();
    renderPage('manager');
    await screen.findByLabelText('Maujooda rates');
    expect(screen.queryByRole('button', { name: 'Rate lagayein' })).not.toBeInTheDocument();
    expect(screen.getByText('Naya rate sirf owner laga sakta hai.')).toBeInTheDocument();
  });

  it('khali ya ghalat rate par API nahi', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Rate lagayein' }));
    expect(screen.getByText(/Rate 0 se zyada number ho/)).toBeInTheDocument();
    expect(createRate).not.toHaveBeenCalled();
  });

  it('7 din se zyada aage ki tareekh local reject', async () => {
    renderPage();
    await userEvent.type(await screen.findByLabelText('Naya rate (Rs / litre)'), '270');
    await userEvent.type(screen.getByLabelText('Kab se lagu'), '2999-01-01T10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Rate lagayein' }));
    expect(screen.getByText(/7 din se zyada aage ka nahi/)).toBeInTheDocument();
    expect(createRate).not.toHaveBeenCalled();
  });

  it('sahi rate: payload, notice aur dono list dobara', async () => {
    createRate.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.selectOptions((await screen.findAllByLabelText('Fuel'))[0], 'diesel');
    await userEvent.type(screen.getByLabelText('Naya rate (Rs / litre)'), '255.5');
    await userEvent.click(screen.getByRole('button', { name: 'Rate lagayein' }));
    expect(createRate).toHaveBeenCalledWith({ fuel_type: 'diesel', rate: '255.5', effective_from: undefined });
    expect(await screen.findByText('Diesel ka naya rate lag gaya.')).toBeInTheDocument();
    expect(fetchCurrentRates.mock.calls.length).toBeGreaterThan(1);
    expect(fetchRates.mock.calls.length).toBeGreaterThan(1);
  });

  it('server ki "purani tareekh" wali ghalti dikhati hai', async () => {
    createRate.mockRejectedValue({
      response: { status: 400, data: { effective_from: ['Is fuel ka rate 2026-10-10 10:00 se naya hona chahiye.'] } },
    });
    renderPage();
    await userEvent.type(await screen.findByLabelText('Naya rate (Rs / litre)'), '270');
    await userEvent.click(screen.getByRole('button', { name: 'Rate lagayein' }));
    expect(await screen.findByText(/se naya hona chahiye/)).toBeInTheDocument();
  });

  it('history ka fuel filter', async () => {
    renderPage();
    await screen.findByText('Rate ki history');
    const filter = screen.getAllByLabelText('Fuel')[1];
    await userEvent.selectOptions(filter, 'diesel');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Rs 250.00')).toBeInTheDocument();
  });
});