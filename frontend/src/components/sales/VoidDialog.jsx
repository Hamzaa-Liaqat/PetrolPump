import { useState } from 'react';
import { voidSale } from '@/api/sales';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import TextField from '@/components/ui/TextField';
import { splitApiErrors } from '@/utils/error';

export default function VoidDialog({ sale, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setErrors({ fields: { reason: 'Wajah likhna lazmi hai.' }, general: '' });
      return;
    }

    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      await voidSale(sale.id, reason.trim());
      onDone();
    } catch (error) {
      setErrors(splitApiErrors(error, ['reason']));
      setSubmitting(false);
    }
  }

  return (
    <Model title="Sale void karein" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-soft">
          Receipt <strong className="text-ink">{sale.receipt_no}</strong> void ho jayegi.
        </p>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField
          label="Wajah"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          autoFocus
          error={errors.fields.reason}
        />
        <div className="flex gap-2">
          <Button type="submit" loading={submitting}>
            Void karein
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Model>
  );
}
