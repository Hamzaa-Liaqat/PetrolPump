import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPayrollSummary, fetchPayslips, fetchSalaryPreview, fetchSheet, fetchStaff,
  generatePayslip, markDay, patchAttendance,
} from '@/api/staff';
import { AuthContext } from '@/context/AuthContext';
import StaffAttendance from '@/pages/StaffAttendance';
import { sheetFixture, staffFixture } from '@/test/fixtures';
import { toISODate } from '@/utils/date';

vi.mock('@/api/staff', () => ({
  fetchSheet: vi.fn(),
  markDay: vi.fn(),
  patchAttendance: vi.fn(),
  fetchStaff: vi.fn(),
  createStaff: vi.fn(),
  updateStaff: vi.fn(),
  fetchSalaryPreview: vi.fn(),
  fetchPayslips: vi.fn(),
  fetchPayrollSummary: vi.fn(),
  generatePayslip: vi.fn(),
  markPayslipPaid: vi.fn(),
  cancelPayslip: vi.fn(),
}));

function renderPage(role = 'manager') {
  return render(
    <AuthContext.Provider
      value={{ user: { id: 1, username: `${role}1`, role }, role, status: 'authenticated' }}
    >
      <MemoryRouter>
        <StaffAttendance />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('StaffAttendance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchSheet.mockResolvedValue({ data: sheetFixture() });
    markDay.mockResolvedValue({ data: {} });
    patchAttendance.mockResolvedValue({ data: {} });
  });

  it('manager ko sirf Attendance tab, owner ko teeno', async () => {
    const { unmount } = renderPage('manager');
    await screen.findByText('Ahmed');
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    unmount();
    renderPage('owner');
    await screen.findByText('Ahmed');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Attendance', 'Staff list', 'Tankhwah']);
  });

  it('sheet: staff, maujooda haalat aur ginti', async () => {
    renderPage();
    expect(await screen.findByText('Ahmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bilal: Present' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ahmed: Present' })).toHaveAttribute('aria-pressed', 'false');
    const summary = screen.getByLabelText('Aaj ka khulasa');
    expect(within(summary).getByText('Baqi').previousSibling).toHaveTextContent('1');
  });

  it('abhi mark na hui row par tap: markDay sahi tareekh aur entry ke saath', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Ahmed: Present' }));
    expect(markDay).toHaveBeenCalledWith(toISODate(), [{ staff: 1, status: 'present' }]);
    expect(patchAttendance).not.toHaveBeenCalled();
  });

  it('mark ho chuki row par tap: PATCH us attendance par', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Bilal: Absent' }));
    expect(patchAttendance).toHaveBeenCalledWith(5, 'absent');
    expect(markDay).not.toHaveBeenCalled();
  });

  it('wohi haalat dobara dabane par koi call nahi', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Bilal: Present' }));
    expect(patchAttendance).not.toHaveBeenCalled();
  });

  it('server mana kare (mahina lock) to ghalti dikhe aur purani haalat wapas', async () => {
    patchAttendance.mockRejectedValue({
      response: { status: 400, data: { detail: 'Is mahine ki payslip ban chuki hai, attendance ab nahi badal sakti.' } },
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Bilal: Absent' }));
    expect(await screen.findByText(/payslip ban chuki hai/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bilal: Present' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Bilal: Absent' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('"Baqi sab present" sirf unmarked staff ko bhejta hai', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Baqi sab present' }));
    expect(markDay).toHaveBeenCalledWith(toISODate(), [{ staff: 1, status: 'present' }]);
  });

  it('owner: tankhwah tab, payslip ke liye unmarked din ki ijazat lazmi', async () => {
    fetchStaff.mockResolvedValue({ data: [staffFixture()] });
    fetchPayslips.mockResolvedValue({ data: [] });
    fetchPayrollSummary.mockResolvedValue({ data: { net: 0, paid: 0, unpaid: 0 } });
    fetchSalaryPreview.mockResolvedValue({
      data: { staff: 1, name: 'Ahmed', unmarked_days: 27, absent_days: 1, days_present: '1.5', gross_amount: 2250 },
    });
    generatePayslip.mockResolvedValue({ data: {} });
    renderPage('owner');
    await userEvent.click(await screen.findByRole('tab', { name: 'Tankhwah' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Payslip banayein' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Rs 2,250.00', { selector: 'strong' })).toBeInTheDocument();
    const create = within(dialog).getByRole('button', { name: 'Payslip banayein' });
    expect(create).toBeDisabled();
    await userEvent.click(within(dialog).getByLabelText(/27 din ki attendance mark nahi/));
    await userEvent.type(within(dialog).getByLabelText('Kaat-chhaant / advance (Rs)'), '250');
    expect(within(dialog).getByText('Rs 2,000.00')).toBeInTheDocument();
    await userEvent.click(create);
    expect(generatePayslip).toHaveBeenCalledWith(
      expect.objectContaining({ staff: 1, deduction: '250', deduction_note: '', allow_unmarked: true }),
    );
  });

  it('kaat-chhaant tankhwah se zyada ho to reject', async () => {
    fetchStaff.mockResolvedValue({ data: [staffFixture()] });
    fetchPayslips.mockResolvedValue({ data: [] });
    fetchPayrollSummary.mockResolvedValue({ data: {} });
    fetchSalaryPreview.mockResolvedValue({
      data: { staff: 1, name: 'Ahmed', unmarked_days: 0, absent_days: 0, days_present: '2', gross_amount: 3000 },
    });
    renderPage('owner');
    await userEvent.click(await screen.findByRole('tab', { name: 'Tankhwah' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Payslip banayein' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(await within(dialog).findByLabelText('Kaat-chhaant / advance (Rs)'), '5000');
    expect(within(dialog).getByText('Kaat-chhaant tankhwah se zyada nahi ho sakti.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Payslip banayein' })).toBeDisabled();
  });
});