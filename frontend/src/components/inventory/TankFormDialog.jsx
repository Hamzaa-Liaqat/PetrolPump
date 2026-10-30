import { useState } from 'react';
import { createTank, updateTank } from '@/api/inventory';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { FUEL_LABELS, FUEL_TYPES } from '@/config/fuel';
import { parseHundredths } from '@/utils/decimal';
import { splitApiErrors } from '@/utils/error';

const FIELDS = ['name', 'fuel_type', 'capacity', 'reorder_level', 'is_active'];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Tank ka naam likhein.';
  const capacity = parseHundredths(form.capacity);
  if (capacity === null || capacity <= 0n) errors.capacity = 'Capacity 0 se zyada number honi chahiye.';
  const reorder = parseHundredths(form.reorder_level);
  if (reorder === null) errors.reorder_level = 'Reorder level number hona chahiye.';
  else if (capacity !== null && reorder > capacity) errors.reorder_level = 'Reorder level capacity se zyada nahi ho sakta.';
  return errors;
}

export default function TankFormDialog({ tank, onClose, onSaved }) {
  const editing = Boolean(tank);
  const [form, setForm] = useState({
    name: tank?.name ?? '',
    fuel_type: tank?.fuel_type ?? 'petrol',
    capacity: tank ? String(tank.capacity) : '',
    reorder_level: tank ? String(tank.reorder_level) : '1000',
    is_active: tank?.is_active ?? true,
  });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validate(form);
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    const payload = {
      name: form.name.trim(),
      fuel_type: form.fuel_type,
      capacity: form.capacity.trim(),
      reorder_level: form.reorder_level.trim(),
    };
    try {
      if (editing) await updateTank(tank.id, { ...payload, is_active: form.is_active });
      else await createTank(payload);
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={editing ? `${tank.name} edit karein` : 'Naya tank'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField label="Naam" value={form.name} onChange={change('name')} error={errors.fields.name} autoFocus />
        <SelectField label="Fuel" value={form.fuel_type} onChange={change('fuel_type')} error={errors.fields.fuel_type}>
          {FUEL_TYPES.map((type) => (
            <option key={type} value={type}>
              {FUEL_LABELS[type]}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Capacity (L)" value={form.capacity} onChange={change('capacity')} inputMode="decimal" error={errors.fields.capacity} />
          <TextField label="Reorder level (L)" value={form.reorder_level} onChange={change('reorder_level')} inputMode="decimal" error={errors.fields.reorder_level} hint="Is se kam stock par alert" />
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="h-4 w-4 accent-marigold-500"
            />
            Tank chalu hai
          </label>
        )}
        {!editing && (
          <p className="text-xs text-ink-soft">Tank banne ke baad "Dip check" se opening stock darj karein.</p>
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