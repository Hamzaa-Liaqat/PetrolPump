import { useState } from 'react';
import { createUser, updateUser } from '@/api/users';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import SelectField from '@/components/ui/SelectField';
import TextField from '@/components/ui/TextField';
import { ROLE_LABELS, ROLE_LIST } from '@/config/role';
import { splitApiErrors } from '@/utils/error';
import { validateEmail, validateNewPassword, validatePhone, validateUsername } from '@/utils/validators';

const FIELDS = ['username', 'password', 'first_name', 'last_name', 'email', 'role', 'phone', 'is_active'];

function validate(form, editing) {
  const errors = {};
  if (!editing) {
    const usernameError = validateUsername(form.username);
    if (usernameError) errors.username = usernameError;
    const passwordError = validateNewPassword(form.password, form.username);
    if (passwordError) errors.password = passwordError;
  }
  const phoneError = validatePhone(form.phone.trim());
  if (phoneError) errors.phone = phoneError;
  const emailError = validateEmail(form.email.trim());
  if (emailError) errors.email = emailError;
  return errors;
}

export default function UserFormDialog({ user, isSelf, onClose, onSaved }) {
  const editing = Boolean(user);
  const [form, setForm] = useState({
    username: user?.username ?? '',
    password: '',
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'cashier',
    phone: user?.phone ?? '',
    is_active: user?.is_active ?? true,
  });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validate(form, editing);
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    const common = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    try {
      if (editing) {
        const payload = { ...common };
        if (!isSelf) {
          payload.role = form.role;
          payload.is_active = form.is_active;
        }
        await updateUser(user.id, payload);
      } else {
        await createUser({ ...common, username: form.username.trim(), password: form.password, role: form.role });
      }
      onSaved();
    } catch (error) {
      setErrors(splitApiErrors(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Model title={editing ? `${user.username} edit karein` : 'Naya user'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        {!editing && (
          <>
            <TextField label="Username" value={form.username} onChange={change('username')} autoComplete="off" autoFocus error={errors.fields.username} />
            <TextField label="Password" type="password" value={form.password} onChange={change('password')} autoComplete="new-password" error={errors.fields.password} hint="Kam az kam 8 haroof, sirf digits nahi" />
          </>
        )}
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Pehla naam" value={form.first_name} onChange={change('first_name')} error={errors.fields.first_name} />
          <TextField label="Aakhri naam" value={form.last_name} onChange={change('last_name')} error={errors.fields.last_name} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Email" type="email" value={form.email} onChange={change('email')} error={errors.fields.email} />
          <TextField label="Phone" type="tel" value={form.phone} onChange={change('phone')} error={errors.fields.phone} />
        </div>
        <SelectField
          label="Role"
          value={form.role}
          onChange={change('role')}
          disabled={isSelf}
          error={errors.fields.role}
          hint={isSelf ? 'Aap apna role khud nahi badal sakte' : undefined}
        >
          {ROLE_LIST.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </SelectField>
        {editing && (
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              disabled={isSelf}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="h-4 w-4 accent-marigold-500"
            />
            Account chalu hai
            {isSelf && <span className="text-xs font-normal text-ink-soft">(apna account band nahi kar sakte)</span>}
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