import { useState } from 'react';
import { changePasswordRequest, fetchMe, updateMeRequest } from '@/api/auth';
import ConnectionCheck from '@/components/diognostics/ConnectionCheck';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { ROLE_BADGE, ROLE_LABELS } from '@/config/role';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { splitApiErrors } from '@/utils/error';
import { setFlash } from '@/utils/flash';
import { validateEmail, validatePasswordChange, validatePhone } from '@/utils/validators';

const PROFILE_FIELDS = ['first_name', 'last_name', 'email', 'phone'];
const PASSWORD_FIELDS = ['old_password', 'new_password'];

function ProfileForm({ initial }) {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
  });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setSaved(false);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const local = {};
    const phoneError = validatePhone(form.phone.trim());
    const emailError = validateEmail(form.email.trim());
    if (phoneError) local.phone = phoneError;
    if (emailError) local.email = emailError;
    if (Object.keys(local).length > 0) {
      setErrors({ fields: local, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await updateMeRequest({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      await refreshUser();
      setSaved(true);
    } catch (error) {
      setErrors(splitApiErrors(error, PROFILE_FIELDS));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="text-lg font-extrabold text-ink">Meri maloomat</h2>
      {errors.general && <Alert tone="error">{errors.general}</Alert>}
      {saved && <Alert tone="success">Maloomat mehfooz ho gayi.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Pehla naam" value={form.first_name} onChange={change('first_name')} error={errors.fields.first_name} autoComplete="given-name" />
        <TextField label="Aakhri naam" value={form.last_name} onChange={change('last_name')} error={errors.fields.last_name} autoComplete="family-name" />
        <TextField label="Email" type="email" value={form.email} onChange={change('email')} error={errors.fields.email} autoComplete="email" />
        <TextField label="Phone" type="tel" value={form.phone} onChange={change('phone')} error={errors.fields.phone} hint="Jaise 03001234567 ya +923001234567" autoComplete="tel" />
      </div>
      <Button type="submit" loading={submitting}>
        Mehfooz karein
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { logout } = useAuth();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validatePasswordChange(form);
    if (Object.keys(local).length > 0) {
      setErrors({
        fields: {
          old_password: local.oldPassword,
          new_password: local.newPassword,
          confirm_password: local.confirmPassword,
        },
        general: '',
      });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await changePasswordRequest(form.oldPassword, form.newPassword);
      setFlash('Password badal gaya. Naye password se dobara login karein.');
      await logout();
    } catch (error) {
      setErrors(splitApiErrors(error, PASSWORD_FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="text-lg font-extrabold text-ink">Password badlein</h2>
      <p className="text-sm text-ink-soft">Badalne ke baad aap sab jagah se logout ho jayenge.</p>
      {errors.general && <Alert tone="error">{errors.general}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Purana password" type="password" value={form.oldPassword} onChange={change('oldPassword')} error={errors.fields.old_password} autoComplete="current-password" />
        <TextField label="Naya password" type="password" value={form.newPassword} onChange={change('newPassword')} error={errors.fields.new_password} autoComplete="new-password" />
        <TextField label="Naya password dobara" type="password" value={form.confirmPassword} onChange={change('confirmPassword')} error={errors.fields.confirm_password} autoComplete="new-password" />
      </div>
      <Button type="submit" variant="soft" loading={submitting}>
        Password badlein
      </Button>
    </form>
  );
}

export default function Profile() {
  const { user, role } = useAuth();
  const me = useFetch(fetchMe, []);
  const profile = me.data ?? user;
  const lastLogin = profile?.last_login ? new Date(profile.last_login).toLocaleString() : '-';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        <h1 className="text-xl font-extrabold text-ink">My account</h1>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold text-ink-soft">Username</dt>
            <dd className="mt-0.5 font-semibold text-ink">{user?.username}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-soft">Role</dt>
            <dd className="mt-0.5">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_BADGE[role] ?? ''}`}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-soft">Aakhri login</dt>
            <dd className="mt-0.5 font-semibold text-ink">{lastLogin}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        {me.loading ? (
          <div className="flex items-center gap-3 text-ink-soft" role="status">
            <Spinner className="h-5 w-5 text-marigold-600" />
            <span className="text-sm font-semibold">Maloomat aa rahi hain...</span>
          </div>
        ) : (
          <ProfileForm initial={profile} />
        )}
      </section>
      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        <PasswordForm />
      </section>
      <ConnectionCheck />
    </div>
  );
}