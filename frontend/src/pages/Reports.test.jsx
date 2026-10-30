import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProfitLoss, fetchReportSummary } from '@/api/report';
import Reports from '@/pages/Reports';
import { profitLossFixture, reportFixture } from '@/test/fixtures';
import { monthOptions } from '@/utils/periods';

vi.mock('@/api/report', () => ({ fetchReportSummary: vi.fn(), fetchProfitLoss: vi.fn(), downloadReport: vi.fn() }));
// jsdom mein canvas nahi hota: chart ki jagah uska data text ban kar dikhta hai
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }) => <div data-testid="bar-chart">{JSON.stringify(data.labels)}</div>,
  Line: ({ data }) => <div data-testid="line-chart">{JSON.stringify(data.labels)}</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>,
  );

describe('Reports', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchReportSummary.mockResolvedValue({ data: reportFixture() });
  });

  it('maujooda mahine ki report mangta hai (saal ke saath) aur khulasa dikhata hai', async () => {
    renderPage();
    expect(await screen.findByText('Rs 12,50,000')).toBeInTheDocument();
    const current = monthOptions(12)[0];
    expect(fetchReportSummary).toHaveBeenCalledWith({ year: current.year, month: current.month });
    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByText('Rs 1,80,000')).toBeInTheDocument();
    expect(screen.getByText(/Andaza \(payslip abhi nahi bani\)/)).toBeInTheDocument();
  });

  it('nuqsan ho to minus ke saath dikhta hai', async () => {
    fetchReportSummary.mockResolvedValue({
      data: reportFixture({ totals: { ...reportFixture().totals, profit: -386500 } }),
    });
    renderPage();
    expect(await screen.findByText('Rs -3,86,500')).toBeInTheDocument();
  });

  it('charts ko fuel aur din ka data milta hai', async () => {
    renderPage();
    await screen.findByText('Rs 12,50,000');
    const charts = screen.getAllByTestId('bar-chart');
    expect(charts[0]).toHaveTextContent('["Petrol","Diesel"]');
    expect(charts[1]).toHaveTextContent('["10-01","10-02"]');
    expect(screen.getByRole('img', { name: /Fuel ke hisaab se sales\. Petrol: Rs 8,00,000, Diesel: Rs 4,50,000/ })).toBeInTheDocument();
  });

  it('fuel table: margin aur jahan kharid nahi wahan "-"', async () => {
    renderPage();
    await screen.findByText('Rs 12,50,000');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Rs 16.67')).toBeInTheDocument();
    expect(within(table).getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('mahina badalne par naye mahine ki report', async () => {
    renderPage();
    await screen.findByText('Rs 12,50,000');
    const previous = monthOptions(12)[1];
    await userEvent.selectOptions(screen.getByLabelText('Mahina'), previous.value);
    expect(fetchReportSummary).toHaveBeenLastCalledWith({ year: previous.year, month: previous.month });
  });

  it('koi sale na ho to charts ki jagah saaf paigham', async () => {
    fetchReportSummary.mockResolvedValue({
      data: reportFixture({ by_fuel: [], by_nozzle: [], daily: [{ period: '2026-10-01', litres: 0, amount: 0, entries: 0 }] }),
    });
    renderPage();
    expect((await screen.findAllByText('Is mahine koi sale nahi.')).length).toBeGreaterThan(1);
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('saal ka hisaab tabhi mangta hai jab button dabaya jaye', async () => {
    fetchProfitLoss.mockResolvedValue({ data: profitLossFixture() });
    renderPage();
    await screen.findByText('Rs 12,50,000');
    expect(fetchProfitLoss).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Saal ka hisaab dikhayein' }));
    expect(await screen.findByText('Saal ka kul')).toBeInTheDocument();
    expect(fetchProfitLoss).toHaveBeenCalledWith({ year: monthOptions(12)[0].year });
    expect(screen.getByTestId('line-chart')).toHaveTextContent('["2026-09","2026-10"]');
  });

  it('server band ho to saaf paigham aur dobara koshish', async () => {
    fetchReportSummary.mockRejectedValueOnce(new Error('Network Error'));
    renderPage();
    expect(await screen.findByText(/Server se rabta nahi/)).toBeInTheDocument();
    fetchReportSummary.mockResolvedValue({ data: reportFixture() });
    await userEvent.click(screen.getByRole('button', { name: 'Dobara koshish karein' }));
    expect(await screen.findByText('Rs 12,50,000')).toBeInTheDocument();
  });
});