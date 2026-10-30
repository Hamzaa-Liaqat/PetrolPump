import { useState } from 'react';
import { createCreditSale } from '@/api/credit';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { FUEL_LABELS } from '@/config/fuel';
import { previewCreditSale } from '@/utils/credit';
import { splitApiErrors } from '@/utils/error';
import { formatMoney } from '@/utils/formate';

const FIELDS = ['customer', 'fuel_type', 'litres', 'vehicle_number', 'reference', 'note'];

export default function CreditSaleDialog({ customer, rates, onClose, onSaved }) {
  const firstAvailable = rates.find((rate) => rate.rate !== null && rate.rate !== undefined);
  const [form, setForm] = useState({
    fuel_type: firstAvailable?.fuel_type ?? '',
    litres: '',
    vehicle_number: '',
    reference: '',
    note: '',
  });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const rate = rates.find((item) => item.fuel_type === form.fuel_type)?.rate;
  const preview = previewCreditSale({
    litres: form.litres,
    rate: rate === null || rate === undefined ? '' : String(rate),
    balance: String(customer.balance),
    limit: String(customer.credit_limit),
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!preview.ok || submitting) return;
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await createCreditSale({
        customer: customer.id,
        fuel_type: form.fuel_type,
        litres: form.litres.trim(),
        vehicle_number: form.vehicle_number.trim(),
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
    <Model title={`Udhaar: ${customer.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-soft">
          Abhi baqi: <strong className="text-ink">{formatMoney(customer.balance)}</strong> | Limit:{' '}
          <strong className="text-ink">{formatMoney(customer.credit_limit)}</strong>
        </p>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <SelectField label="Fuel" value={form.fuel_type} onChange={change('fuel_type')} error={errors.fields.fuel_type}>
          {rates.map((item) => (
            <option key={item.fuel_type} value={item.fuel_type} disabled={item.rate === null || item.rate === undefined}>
              {FUEL_LABELS[item.fuel_type] ?? item.fuel_type}
              {item.rate === null || item.rate === undefined ? ' (rate set nahi)' : ` - Rs ${item.rate}`}
            </option>
          ))}
        </SelectField>
        <TextField label="Litres" value={form.litres} onChange={change('litres')} inputMode="decimal" autoComplete="off" autoFocus error={errors.fields.litres || preview.error} />
        <TextField label="Gaari number (optional)" value={form.vehicle_number} onChange={change('vehicle_number')} error={errors.fields.vehicle_number} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Slip/reference" value={form.reference} onChange={change('reference')} error={errors.fields.reference} />
          <TextField label="Note" value={form.note} onChange={change('note')} error={errors.fields.note} />
        </div>
        {preview.ok && (
          <div className="rounded-2xl bg-lagoon-100 px-4 py-3 text-sm text-lagoon-800" aria-live="polite">
            <p className="font-semibold">Andaza (asli hisaab server karega)</p>
            <p className="mt-1 text-lg font-extrabold text-ink">{formatMoney(preview.amount, 2)}</p>
            <p>Naya baqi: {formatMoney(preview.newBalance, 2)}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={submitting} disabled={!preview.ok}>
            Udhaar darj karein
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Model>
  );
}