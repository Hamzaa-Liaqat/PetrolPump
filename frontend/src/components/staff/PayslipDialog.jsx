import { useState } from 'react';
import { fetchSalaryPreview, generatePayslip } from '@/api/staff';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { useFetch } from '@/hooks/useFetch';
import { formatHundredths, parseHundredths } from '@/utils/decimal';
import { getErrorMessage, splitApiErrors } from '@/utils/error';
import { formatMoney } from '@/utils/formate';

const FIELDS = ['staff', 'year', 'month', 'deduction', 'deduction_note', 'allow_unmarked'];

export default function PayslipDialog({ staff, period, onClose, onSaved }) {
  const preview = useFetch(() => fetchSalaryPreview(staff.id, { year: period.year, month: period.month }), [staff.id, period.value]);
  const [deduction, setDeduction] = useState('');
  const [note, setNote] = useState('');
  const [allowUnmarked, setAllowUnmarked] = useState(false);
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const data = preview.data;
  const gross = data ? parseHundredths(data.gross_amount) : null;
  const cut = deduction.trim() === '' ? 0n : parseHundredths(deduction);
  const cutError = cut === null ? 'Kaat-chhaant number ho (zyada se zyada 2 decimal).' : cut !== null && gross !== null && cut > gross ? 'Kaat-chhaant tankhwah se zyada nahi ho sakti.' : '';
  const net = gross !== null && cut !== null && !cutError ? formatHundredths(gross - cut) : null;
  const needsConfirm = data && data.unmarked_days > 0;
  const canSubmit = Boolean(data) && net !== null && (!needsConfirm || allowUnmarked);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await generatePayslip({
        staff: staff.id,
        year: period.year,
        month: period.month,
        deduction: deduction.trim() || '0',
        deduction_note: note.trim(),
        allow_unmarked: allowUnmarked,
      });
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={`Payslip: ${staff.name} (${period.label})`} onClose={onClose}>
      {preview.loading ? (
        <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
          <Spinner className="h-5 w-5 text-marigold-600" />
          <span className="text-sm font-semibold">Hisaab aa raha hai...</span>
        </div>
      ) : !data ? (
        <Alert tone="error">{getErrorMessage(preview.error)}</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errors.general && <Alert tone="error">{errors.general}</Alert>}
          <dl className="grid grid-cols-2 gap-2 text-center">
            {[
              ['Din present', data.days_present],
              ['Absent din', data.absent_days],
              ['Baqi (mark nahi)', data.unmarked_days],
              ['Kul tankhwah', formatMoney(data.gross_amount, 2)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-sand-100 px-2 py-2">
                <dt className="text-xs text-ink-soft">{label}</dt>
                <dd className="text-sm font-extrabold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {needsConfirm && (
            <Alert tone="warn">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={allowUnmarked}
                  onChange={(event) => setAllowUnmarked(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-marigold-500"
                />
                <span>{data.unmarked_days} din ki attendance mark nahi. Unhein absent maan kar payslip banayein.</span>
              </label>
            </Alert>
          )}
          <TextField label="Kaat-chhaant / advance (Rs)" value={deduction} onChange={(event) => setDeduction(event.target.value)} inputMode="decimal" error={errors.fields.deduction || cutError} />
          <TextField label="Kaat-chhaant ki wajah" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} error={errors.fields.deduction_note} />
          {net !== null && (
            <p className="rounded-xl bg-lagoon-100 px-3 py-2 text-sm text-lagoon-800" aria-live="polite">
              Net tankhwah: <strong>{formatMoney(net, 2)}</strong>
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={submitting} disabled={!canSubmit}>
              Payslip banayein
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Wapas
            </Button>
          </div>
        </form>
      )}
    </Model>
  );
}