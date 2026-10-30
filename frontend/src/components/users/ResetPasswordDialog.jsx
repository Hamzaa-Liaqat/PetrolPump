import { useState } from 'react';
import { resetUserPassword } from '@/api/users';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import TextField from '@/components/ui/TextField';
import { splitApiErrors } from '@/utils/error';
import { validateNewPassword } from '@/utils/validators';

export default function ResetPasswordDialog({ user, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const local = validateNewPassword(password, user.username);
    if (local) {
      setErrors({ fields: { new_password: local }, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await resetUserPassword(user.id, password);
      onDone(`${user.username} ka password badal diya gaya. Wo sab jagah se logout ho gaya.`);
    } catch (error) {
      setErrors(splitApiErrors(error, ['new_password']));
      setSubmitting(false);
    }
  }

  return (
    <Model title={`Password reset: ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-soft">Naya password khud us shakhs ko bata dein. Wo login ke baad apna password badal sakta hai.</p>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField
          label="Naya password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          autoFocus
          error={errors.fields.new_password}
        />
        <div className="flex gap-2">
          <Button type="submit" variant="danger" loading={submitting}>
            Password badlein
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Model>
  );
}