import { useState } from 'react';
import { createStaff, updateStaff } from '@/api/staff';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { POSITIONS, POSITION_LABELS, SHIFTS, SHIFT_LABELS } from '@/config/staff';
import { parseHundredths } from '@/utils/decimal';
import { splitApiErrors } from '@/utils/error';
import { validatePhone } from '@/utils/validators';

const FIELDS = ['name', 'phone', 'position', 'shift', 'daily_rate', 'is_active'];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Naam likhein.';
  const phoneError = validatePhone(form.phone.trim());
  if (phoneError) errors.phone = phoneError;
  const rate = parseHundredths(form.daily_rate);
  if (rate === null || rate <= 0n) errors.daily_rate = 'Roz ki tankhwah 0 se zyada number ho.';
  return errors;
}

export default function StaffFormDialog({ staff, onClose, onSaved }) {
  const editing = Boolean(staff);
  const [form, setForm] = useState({
    name: staff?.name ?? '',
    phone: staff?.phone ?? '',
    position: staff?.position ?? 'attendant',
    shift: staff?.shift ?? 'morning',
    daily_rate: staff ? String(staff.daily_rate) : '',
    is_active: staff?.is_active ?? true,
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
      phone: form.phone.trim(),
      position: form.position,
      shift: form.shift,
      daily_rate: form.daily_rate.trim(),
    };
    if (editing) payload.is_active = form.is_active;
    try {
      if (editing) await updateStaff(staff.id, payload);
      else await createStaff(payload);
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={editing ? `${staff.name} edit karein` : 'Naya staff'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField label="Naam" value={form.name} onChange={change('name')} error={errors.fields.name} autoFocus />
        <TextField label="Phone (optional)" type="tel" value={form.phone} onChange={change('phone')} error={errors.fields.phone} />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Kaam" value={form.position} onChange={change('position')} error={errors.fields.position}>
            {POSITIONS.map((value) => (
              <option key={value} value={value}>
                {POSITION_LABELS[value]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Shift" value={form.shift} onChange={change('shift')} error={errors.fields.shift}>
            {SHIFTS.map((value) => (
              <option key={value} value={value}>
                {SHIFT_LABELS[value]}
              </option>
            ))}
          </SelectField>
        </div>
        <TextField label="Roz ki tankhwah (Rs)" value={form.daily_rate} onChange={change('daily_rate')} inputMode="decimal" error={errors.fields.daily_rate} hint="Badalne se purani attendance ki tankhwah nahi badalti" />
        {editing && (
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="h-4 w-4 accent-marigold-500"
            />
            Staff chalu hai
          </label>
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