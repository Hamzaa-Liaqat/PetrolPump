import { useState } from 'react';
import { createRate } from '@/api/rates';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { FUEL_LABELS, FUEL_TYPES } from '@/config/fuel';
import { splitApiErrors } from '@/utils/error';
import { toIsoOrUndefined, validateRateForm } from '@/utils/rates';

const FIELDS = ['fuel_type', 'rate', 'effective_from'];
const NO_ERRORS = { fields: {}, general: '' };

export default function RateForm({ onSaved }) {
  const [form, setForm] = useState({ fuelType: 'petrol', rate: '', effectiveFrom: '' });
  const [errors, setErrors] = useState(NO_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validateRateForm(form);
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors(NO_ERRORS);
    try {
      await createRate({
        fuel_type: form.fuelType,
        rate: form.rate.trim(),
        effective_from: toIsoOrUndefined(form.effectiveFrom),
      });
      setForm((current) => ({ ...current, rate: '', effectiveFrom: '' }));
      onSaved(form.fuelType);
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.general && <Alert tone="error">{errors.general}</Alert>}
      <SelectField label="Fuel" value={form.fuelType} onChange={change('fuelType')} error={errors.fields.fuel_type}>
        {FUEL_TYPES.map((type) => (
          <option key={type} value={type}>
            {FUEL_LABELS[type]}
          </option>
        ))}
      </SelectField>
      <TextField label="Naya rate (Rs / litre)" value={form.rate} onChange={change('rate')} inputMode="decimal" autoComplete="off" error={errors.fields.rate} />
      <TextField
        label="Kab se lagu"
        type="datetime-local"
        value={form.effectiveFrom}
        onChange={change('effectiveFrom')}
        error={errors.fields.effective_from}
        hint="Khali chhodein to abhi se. Zyada se zyada 7 din aage ki."
      />
      <Button type="submit" loading={submitting} className="w-full">
        Rate lagayein
      </Button>
    </form>
  );
}