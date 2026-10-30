import { useState } from 'react';
import { cancelPayslip, fetchPayrollSummary, fetchPayslips, fetchStaff, markPayslipPaid } from '@/api/staff';
import MetricCard from '@/components/dashboard/MetricCard';
import PayslipDialog from '@/components/staff/PayslipDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage, splitApiErrors } from '@/utils/error';
import { formatMoney } from '@/utils/formate';
import { monthOptions } from '@/utils/periods';

const OPTIONS = monthOptions(12, new Date(), { includeCurrent: false });

export default function SalaryPanel() {
  const [value, setValue] = useState(OPTIONS[0].value);
  const [dialog, setDialog] = useState(null);
  const [error, setError] = useState('');
  const period = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  const staff = useFetch(fetchStaff, []);
  const payslips = useFetch(() => fetchPayslips({ year: period.year, month: period.month }), [value]);
  const summary = useFetch(() => fetchPayrollSummary({ year: period.year, month: period.month }), [value]);

  const slipByStaff = new Map((payslips.data ?? []).map((slip) => [slip.staff, slip]));
  const rows = (staff.data ?? []).filter((member) => member.is_active || slipByStaff.has(member.id));

  function refresh() {
    payslips.reload();
    summary.reload();
  }

  async function run(action) {
    setError('');
    try {
      await action();
      refresh();
    } catch (err) {
      setError(splitApiErrors(err, []).general);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SelectField label="Mahina" value={value} onChange={(event) => setValue(event.target.value)} className="w-56">
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <p className="text-xs text-ink-soft">Payslip sirf mukammal ho chuke mahine ki banti hai.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Tankhwah ka khulasa">
        <MetricCard label="Kul net tankhwah" value={formatMoney(summary.data?.net ?? 0, 2)} tone="periwinkle" />
        <MetricCard label="Ada ho chuki" value={formatMoney(summary.data?.paid ?? 0, 2)} tone="lagoon" />
        <MetricCard label="Baqi dena hai" value={formatMoney(summary.data?.unpaid ?? 0, 2)} tone="coral" />
      </section>

      {error && <Alert tone="error">{error}</Alert>}

      {staff.loading || payslips.loading ? (
        <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
          <Spinner className="h-5 w-5 text-marigold-600" />
          <span className="text-sm font-semibold">Tankhwah ka hisaab aa raha hai...</span>
        </div>
      ) : !staff.data || !payslips.data ? (
        <Alert tone="error">{getErrorMessage(staff.error || payslips.error)}</Alert>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">Abhi koi staff nahi.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-152 text-left text-sm">
            <thead>
              <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-3">Staff</th>
                <th className="py-2 pr-3 text-right">Din</th>
                <th className="py-2 pr-3 text-right">Net</th>
                <th className="py-2 pr-3">Haalat</th>
                <th className="py-2 text-right">Kaam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {rows.map((member) => {
                const slip = slipByStaff.get(member.id);
                return (
                  <tr key={member.id}>
                    <td className="py-2.5 pr-3 font-semibold text-ink">{member.name}</td>
                    <td className="py-2.5 pr-3 text-right">{slip ? slip.days_present : '-'}</td>
                    <td className="py-2.5 pr-3 text-right font-bold text-ink">{slip ? formatMoney(slip.net_amount, 2) : '-'}</td>
                    <td className="py-2.5 pr-3">
                      {!slip ? (
                        <span className="text-ink-soft">Payslip nahi bani</span>
                      ) : slip.is_paid ? (
                        <span className="rounded-full bg-lagoon-100 px-2 py-0.5 text-xs font-bold text-lagoon-800">Ada ({slip.paid_on})</span>
                      ) : (
                        <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-bold text-warn">Baqi</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        {!slip && (
                          <Button variant="soft" size="sm" onClick={() => setDialog({ staff: member })}>
                            Payslip banayein
                          </Button>
                        )}
                        {slip && !slip.is_paid && (
                          <>
                            <Button variant="soft" size="sm" onClick={() => run(() => markPayslipPaid(slip.id))}>
                              Ada ho gayi
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => run(() => cancelPayslip(slip.id))}>
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <PayslipDialog
          staff={dialog.staff}
          period={period}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}