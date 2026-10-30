import { useState } from 'react';
import { createPurchase } from '@/api/purchases';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { FUEL_LABELS } from '@/config/fuel';
import { parseHundredths } from '@/utils/decimal';
import { isValidISODate, toISODate } from '@/utils/date';
import { splitApiErrors } from '@/utils/error';
import { formatLitres, formatMoney } from '@/utils/formate';
import { previewDelivery } from '@/utils/purchases';

const FIELDS = [
  'tank', 'supplier', 'tanker_number', 'invoice_number', 'litres',
  'received_litres', 'dip_before', 'dip_after', 'invoice_amount', 'date',
];
const NO_ERRORS = { fields: {}, general: '' };
const EMPTY = {
  tank: '', supplier: '', tanker_number: '', invoice_number: '',
  litres: '', invoice_amount: '', useDips: false, dip_before: '', dip_after: '',
};

function validate(form, today) {
  const errors = {};
  if (!form.tank) errors.tank = 'Tank chunein.';
  if (!form.supplier.trim()) errors.supplier = 'Supplier ka naam likhein.';
  if (!form.tanker_number.trim()) errors.tanker_number = 'Tanker number likhein.';
  if (!form.invoice_number.trim()) errors.invoice_number = 'Invoice number likhein.';
  const amount = parseHundredths(form.invoice_amount);
  if (amount === null || amount <= 0n) errors.invoice_amount = 'Invoice ki raqam 0 se zyada number ho.';
  if (!isValidISODate(form.date)) errors.date = 'Tareekh sahi nahi.';
  else if (form.date > today) errors.date = 'Future ki tareekh nahi ho sakti.';
  return errors;
}

export default function PurchaseForm({ tanks, onSaved }) {
  const today = toISODate();
  const [form, setForm] = useState({ ...EMPTY, date: today });
  const [errors, setErrors] = useState(NO_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  const tank = tanks.find((item) => String(item.id) === form.tank) ?? null;
  const preview = tank
    ? previewDelivery({
        litres: form.litres,
        invoiceAmount: form.invoice_amount,
        useDips: form.useDips,
        dipBefore: form.dip_before,
        dipAfter: form.dip_after,
        availableSpace: String(tank.available_space),
      })
    : { ok: false, error: '' };

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!preview.ok || submitting) return;
    const local = validate(form, today);
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors(NO_ERRORS);
    const payload = {
      tank: Number(form.tank),
      supplier: form.supplier.trim(),
      tanker_number: form.tanker_number.trim(),
      invoice_number: form.invoice_number.trim(),
      litres: form.litres.trim(),
      invoice_amount: form.invoice_amount.trim(),
      date: form.date,
    };
    if (form.useDips) {
      payload.dip_before = form.dip_before.trim();
      payload.dip_after = form.dip_after.trim();
    }
    try {
      const { data } = await createPurchase(payload);
      setForm((current) => ({ ...EMPTY, tank: current.tank, supplier: current.supplier, date: current.date }));
      onSaved(data);
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.general && <Alert tone="error">{errors.general}</Alert>}

      <SelectField label="Tank" value={form.tank} onChange={change('tank')} error={errors.fields.tank}>
        <option value="">Tank chunein</option>
        {tanks.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} - {FUEL_LABELS[item.fuel_type] ?? item.fuel_type} (khali {formatLitres(item.available_space)})
          </option>
        ))}
      </SelectField>

      <TextField label="Supplier" value={form.supplier} onChange={change('supplier')} error={errors.fields.supplier} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Tanker number" value={form.tanker_number} onChange={change('tanker_number')} error={errors.fields.tanker_number} />
        <TextField label="Invoice number" value={form.invoice_number} onChange={change('invoice_number')} error={errors.fields.invoice_number} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Invoice ke litres" value={form.litres} onChange={change('litres')} inputMode="decimal" autoComplete="off" error={errors.fields.litres} />
        <TextField label="Invoice ki raqam (Rs)" value={form.invoice_amount} onChange={change('invoice_amount')} inputMode="decimal" autoComplete="off" error={errors.fields.invoice_amount} />
      </div>
      <TextField label="Tareekh" type="date" max={today} value={form.date} onChange={change('date')} error={errors.fields.date} />

      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={form.useDips}
          onChange={(event) => setForm((current) => ({ ...current, useDips: event.target.checked }))}
          className="h-4 w-4 accent-marigold-500"
        />
        Dip reading se asli tel naapna hai
      </label>
      {form.useDips && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Dip pehle (L)" value={form.dip_before} onChange={change('dip_before')} inputMode="decimal" error={errors.fields.dip_before} />
          <TextField label="Dip baad (L)" value={form.dip_after} onChange={change('dip_after')} inputMode="decimal" error={errors.fields.dip_after || errors.fields.received_litres} />
        </div>
      )}
      {preview.error && <p className="text-xs font-semibold text-coral-800">{preview.error}</p>}

      {preview.ok && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${preview.significant ? 'bg-warn-bg text-warn' : 'bg-lagoon-100 text-lagoon-800'}`}
          aria-live="polite"
        >
          <p className="font-semibold">Andaza (asli hisaab server karega)</p>
          <p className="mt-1 text-base font-extrabold text-ink">Asli tel: {formatLitres(preview.received)}</p>
          <p>
            Kami: {formatLitres(preview.shortage)} ({preview.shortagePercent}%)
            {preview.significant && ' - ye 0.5% se zyada hai'}
          </p>
          {preview.costPerLitre && <p>Qeemat: {formatMoney(preview.costPerLitre, 2)} / litre</p>}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!preview.ok}>
        Delivery darj karein
      </Button>
    </form>
  );
}