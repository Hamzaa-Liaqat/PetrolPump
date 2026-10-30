import { useState } from 'react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import TextField from '@/components/ui/TextField';
import { splitApiErrors } from '@/utils/error';

// Void / reverse jaise kaamon ke liye: wajah lazmi, phir onConfirm(wajah).
export default function ReasonDialog({ title, description, confirmLabel, onConfirm, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ fields: {}, general: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setErrors({ fields: { reason: 'Wajah likhna lazmi hai.' }, general: '' });
      return;
    }
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await onConfirm(reason.trim());
      onDone();
    } catch (error) {
      setErrors(splitApiErrors(error, ['reason']));
      setSubmitting(false);
    }
  }

  return (
    <Model title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {description && <p className="text-sm text-ink-soft">{description}</p>}
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField
          label="Wajah"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={180}
          error={errors.fields.reason}
          autoFocus
        />
        <div className="flex gap-2">
          <Button type="submit" variant="danger" loading={submitting}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Model>
  );
}