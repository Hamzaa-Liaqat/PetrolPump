import { useState } from 'react';
import { createNozzle, updateNozzle } from '@/api/sales';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { FUEL_LABELS } from '@/config/fuel';
import { splitApiErrors } from '@/utils/error';
import { buildCreatePayload, buildUpdatePayload, validateNozzleForm } from '@/utils/nozzles';

const FIELDS = ['name', 'fuel_type', 'tank', 'initial_reading', 'is_active'];

export default function NozzleFormDialog({ nozzle, tanks, onClose, onSaved }) {
  const editing = Boolean(nozzle);
  const [form, setForm] = useState({
    name: nozzle?.name ?? '',
    tankId: nozzle ? String(nozzle.tank) : '',
    initialReading: '',
    isActive: nozzle?.is_active ?? true,
  });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const tank = tanks.find((item) => String(item.id) === form.tankId) ?? null;
  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validateNozzleForm(form, { editing });
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      if (editing) await updateNozzle(nozzle.id, buildUpdatePayload(form));
      else await createNozzle(buildCreatePayload({ name: form.name, tank, initialReading: form.initialReading }));
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={editing ? `${nozzle.name} edit karein` : 'Naya nozzle'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField label="Nozzle ka naam" value={form.name} onChange={change('name')} maxLength={30} autoFocus error={errors.fields.name} hint="Jaise N1, N2" />

        {editing ? (
          <>
            <TextField label="Tank" value={nozzle.tank_name} readOnly hint="Banne ke baad tank nahi badal sakte" />
            <TextField label="Fuel" value={FUEL_LABELS[nozzle.fuel_type] ?? nozzle.fuel_type} readOnly />
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 accent-marigold-500"
              />
              Nozzle chalu hai
            </label>
            {errors.fields.is_active && <p className="text-xs font-semibold text-coral-800">{errors.fields.is_active}</p>}
            <p className="text-xs text-ink-soft">Band nozzle se naya bill nahi banta. Purani sales ka hisaab mehfooz rehta hai.</p>
          </>
        ) : (
          <>
            <SelectField label="Tank" value={form.tankId} onChange={change('tankId')} error={errors.fields.tank || errors.fields.fuel_type}>
              <option value="">Tank chunein</option>
              {tanks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {FUEL_LABELS[item.fuel_type] ?? item.fuel_type}
                </option>
              ))}
            </SelectField>
            <TextField label="Fuel" value={tank ? FUEL_LABELS[tank.fuel_type] ?? tank.fuel_type : ''} readOnly hint="Tank ke fuel se khud tay hota hai" />
            <TextField
              label="Meter ki abhi ki reading"
              value={form.initialReading}
              onChange={change('initialReading')}
              inputMode="decimal"
              autoComplete="off"
              error={errors.fields.initial_reading}
              hint="Nozzle ke meter par jo reading abhi likhi hai. Pehli sale isi se shuru hogi."
            />
          </>
        )}

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