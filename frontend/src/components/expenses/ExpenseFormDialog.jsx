import { useState } from 'react';
import { createExpense } from '@/api/expenses';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { EXPENSE_CATEGORIES, EXPENSE_LABELS } from '@/config/expenses';
import { isValidISODate, toISODate } from '@/utils/date';
import { parseHundredths } from '@/utils/decimal';
import { splitApiErrors } from '@/utils/error';

const FIELDS = ['category', 'amount', 'date', 'note', 'reference'];

function validate(form, today) {
  const errors = {};
  const amount = parseHundredths(form.amount);
  if (amount === null || amount <= 0n) errors.amount = 'Raqam 0 se zyada number ho (zyada se zyada 2 decimal).';
  if (!isValidISODate(form.date)) errors.date = 'Tareekh sahi nahi.';
  else if (form.date > today) errors.date = 'Future ki tareekh nahi ho sakti.';
  if (form.category === 'other' && !form.note.trim()) errors.note = 'Other category mein note likhna lazmi hai.';
  return errors;
}

export default function ExpenseFormDialog({ onClose, onSaved }) {
  const today = toISODate();
  const [form, setForm] = useState({ category: 'electricity', amount: '', date: today, note: '', reference: '' });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validate(form, today);
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await createExpense({
        category: form.category,
        amount: form.amount.trim(),
        date: form.date,
        note: form.note.trim(),
        reference: form.reference.trim(),
      });
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title="Naya kharcha" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-xs text-ink-soft">Salary yahan nahi likhni, wo Staff ki payslip se khud ginti hai.</p>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <SelectField label="Qisam" value={form.category} onChange={change('category')} error={errors.fields.category}>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {EXPENSE_LABELS[category]}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Raqam (Rs)" value={form.amount} onChange={change('amount')} inputMode="decimal" autoComplete="off" autoFocus error={errors.fields.amount} />
          <TextField label="Tareekh" type="date" max={today} value={form.date} onChange={change('date')} error={errors.fields.date} />
        </div>
        <TextField label="Note" value={form.note} onChange={change('note')} maxLength={200} error={errors.fields.note} />
        <TextField label="Bill/reference (optional)" value={form.reference} onChange={change('reference')} maxLength={50} error={errors.fields.reference} />
        <div className="flex gap-2">
          <Button type="submit" loading={submitting}>
            Mehfooz karein
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Model>
  );
}