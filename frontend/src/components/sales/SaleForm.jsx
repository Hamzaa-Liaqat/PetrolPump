import { useMemo, useState } from 'react';
import { createSale } from '@/api/sales';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { FUEL_LABELS } from '@/config/fuel';
import { previewSale } from '@/utils/billing';
import { splitApiErrors } from '@/utils/error';
import { formatLitres, formatMoney } from '@/utils/formate';

const FIELDS = ['nozzle', 'opening_reading', 'closing_reading', 'rate'];
const NO_ERRORS = { fields: {}, general: '' };

export default function SaleForm({ nozzles, onSaved, onStale }) {
  const [nozzleId, setNozzleId] = useState('');
  const [closing, setClosing] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState(NO_ERRORS);

  const selectedNozzleId = nozzleId || (nozzles.length === 1 ? String(nozzles[0].id) : '');

  const nozzle = useMemo(
    () => nozzles.find((item) => String(item.id) === selectedNozzleId) ?? null,
    [nozzles, selectedNozzleId],
  );
  const opening = nozzle ? String(nozzle.last_reading) : '';
  const rate = nozzle && nozzle.current_rate !== null && nozzle.current_rate !== undefined ? String(nozzle.current_rate) : '';
  const preview = nozzle ? previewSale({ opening, closing, rate }) : { ok: false, error: '' };

  function chooseNozzle(event) {
    setNozzleId(event.target.value);
    setClosing('');
    setErrors(NO_ERRORS);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!preview.ok || submitting) return;
    setSubmitting(true);
    setErrors(NO_ERRORS);
    try {
      const { data } = await createSale({
        nozzle: nozzle.id,
        opening_reading: opening,
        closing_reading: closing.trim(),
        rate,
      });
      setClosing('');
      onSaved(data);
    } catch (error) {
      const parsed = splitApiErrors(error, FIELDS);
      setErrors(parsed);
      if (parsed.fields.opening_reading || parsed.fields.rate || parsed.fields.nozzle) onStale?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.general && <Alert tone="error">{errors.general}</Alert>}

      <SelectField label="Nozzle" value={selectedNozzleId} onChange={chooseNozzle} error={errors.fields.nozzle}>
        <option value="">Nozzle chunein</option>
        {nozzles.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} - {FUEL_LABELS[item.fuel_type] ?? item.fuel_type}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Opening reading"
        value={opening}
        readOnly
        error={errors.fields.opening_reading}
        hint="Pichla closing reading (server se, badal nahi sakte)"
      />
      <TextField
        label="Closing reading"
        value={closing}
        onChange={(event) => setClosing(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        disabled={!nozzle}
        error={errors.fields.closing_reading || preview.error}
      />
      <TextField
        label="Rate (Rs / litre)"
        value={rate}
        readOnly
        error={errors.fields.rate}
        hint="Maujooda rate, server tay karta hai"
      />

      {preview.ok && (
        <div className="rounded-2xl bg-lagoon-100 px-4 py-3 text-sm text-lagoon-800" aria-live="polite">
          <p className="font-semibold">Andaza (asli hisaab server karega)</p>
          <p className="mt-1 text-lg font-extrabold text-ink">
            {formatLitres(preview.litres)} = {formatMoney(preview.amount, 2)}
          </p>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!preview.ok}>
        Sale darj karein
      </Button>
    </form>
  );
}