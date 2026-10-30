import { useState } from 'react';
import { createPayment } from '@/api/credit';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import TextField from '@/components/ui/TextField';
import { previewPayment } from '@/utils/credit';
import { splitApiErrors } from '@/utils/error';
import { formatMoney } from '@/utils/formate';

const FIELDS = ['customer', 'amount', 'reference', 'note'];

export default function PaymentDialog({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', reference: '', note: '' });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const preview = previewPayment({ amount: form.amount, balance: String(customer.balance) });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!preview.ok || submitting) return;
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await createPayment({
        customer: customer.id,
        amount: form.amount.trim(),
        reference: form.reference.trim(),
        note: form.note.trim(),
      });
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={`Payment: ${customer.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-soft">
          Baqi udhaar: <strong className="text-ink">{formatMoney(customer.balance, 2)}</strong>
        </p>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <div className="flex items-end gap-2">
          <TextField
            className="flex-1"
            label="Payment (Rs)"
            value={form.amount}
            onChange={change('amount')}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            error={errors.fields.amount || preview.error}
          />
          <Button variant="soft" onClick={() => setForm((current) => ({ ...current, amount: String(customer.balance) }))}>
            Poora baqi
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Reference (cheque/slip)" value={form.reference} onChange={change('reference')} error={errors.fields.reference} />
          <TextField label="Note" value={form.note} onChange={change('note')} error={errors.fields.note} />
        </div>
        {preview.ok && (
          <p className="rounded-xl bg-lagoon-100 px-3 py-2 text-sm text-lagoon-800" aria-live="polite">
            Naya baqi: <strong>{formatMoney(preview.newBalance, 2)}</strong>
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={submitting} disabled={!preview.ok}>
            Payment darj karein
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Model>
  );
}