import { useState } from 'react';
import { createCustomer, updateCustomer } from '@/api/credit';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import TextField from '@/components/ui/TextField';
import { parseHundredths } from '@/utils/decimal';
import { splitApiErrors } from '@/utils/error';
import { validatePhone } from '@/utils/validators';

const FIELDS = ['name', 'phone', 'address', 'credit_limit', 'is_active'];

function validate(form, isOwner) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Customer ka naam likhein.';
  if (!form.phone.trim()) errors.phone = 'Phone likhein.';
  else {
    const phoneError = validatePhone(form.phone.trim());
    if (phoneError) errors.phone = phoneError;
  }
  if (isOwner && parseHundredths(form.credit_limit) === null) errors.credit_limit = 'Limit number honi chahiye (0 ya zyada).';
  return errors;
}

export default function CustomerFormDialog({ customer, isOwner, onClose, onSaved }) {
  const editing = Boolean(customer);
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
    credit_limit: customer ? String(customer.credit_limit) : '0',
    is_active: customer?.is_active ?? true,
  });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validate(form, isOwner);
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    const payload = { name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() };
    if (isOwner) payload.credit_limit = form.credit_limit.trim();
    if (editing) payload.is_active = form.is_active;
    try {
      if (editing) await updateCustomer(customer.id, payload);
      else await createCustomer(payload);
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={editing ? `${customer.name} edit karein` : 'Naya customer'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField label="Naam" value={form.name} onChange={change('name')} error={errors.fields.name} autoFocus />
        <TextField label="Phone" type="tel" value={form.phone} onChange={change('phone')} error={errors.fields.phone} hint="Jaise 03001234567" />
        <TextField label="Pata" value={form.address} onChange={change('address')} error={errors.fields.address} />
        <TextField
          label="Credit limit (Rs)"
          value={form.credit_limit}
          onChange={change('credit_limit')}
          inputMode="decimal"
          disabled={!isOwner}
          error={errors.fields.credit_limit}
          hint={isOwner ? '0 matlab udhaar nahi' : 'Credit limit sirf owner tay ya badal sakta hai'}
        />
        {editing && (
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="h-4 w-4 accent-marigold-500"
            />
            Customer chalu hai
          </label>
        )}
        {errors.fields.is_active && <p className="text-xs font-semibold text-coral-800">{errors.fields.is_active}</p>}
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