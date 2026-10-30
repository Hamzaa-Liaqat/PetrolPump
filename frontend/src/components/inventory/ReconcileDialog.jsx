import { useState } from 'react';
import { reconcileTank } from '@/api/inventory';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Model';
import TextField from '@/components/ui/TextField';
import { splitApiErrors } from '@/utils/error';
import { formatLitres } from '@/utils/formate';
import { previewVariance } from '@/utils/inventory';

export default function ReconcileDialog({ tank, onClose, onDone }) {
  const [measured, setMeasured] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({ fields: {}, general: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const preview = previewVariance({
    current: String(tank.current_stock),
    measured,
    capacity: String(tank.capacity),
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!note.trim()) {
      setErrors({ fields: { note: 'Wajah/note likhna lazmi hai (jaise "Shaam ki dip").' }, general: '' });
      return;
    }
    if (!preview.ok) return;
    setSubmitting(true);
    setErrors({ fields: {}, general: '' });
    try {
      const { data } = await reconcileTank(tank.id, { measured_litres: measured.trim(), note: note.trim() });
      setResult(data);
    } catch (error) {
      setErrors(splitApiErrors(error, ['measured_litres', 'note']));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const significant = result.is_significant;
    return (
      <Modal title="Dip check mukammal" onClose={onDone}>
        <Alert tone={significant ? 'warn' : 'success'}>
          {result.movement === null
            ? 'Koi farq nahi, system stock bilkul sahi hai.'
            : `Farq: ${formatLitres(result.variance_litres)}${
                result.variance_percent === null ? '' : ` (${result.variance_percent}%)`
              }. ${significant ? `Ye ${result.tolerance_percent}% se zyada hai, wajah dhoondhein.` : 'Maamooli farq hai.'}`}
        </Alert>
        <p className="mt-3 text-sm text-ink-soft">
          Naya stock: <strong className="text-ink">{formatLitres(result.tank.current_stock)}</strong>
        </p>
        <Button className="mt-4" onClick={onDone}>
          Theek hai
        </Button>
      </Modal>
    );
  }

  return (
    <Modal title={`Dip check: ${tank.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-soft">
          System ke mutabiq stock: <strong className="text-ink">{formatLitres(tank.current_stock)}</strong>. Dip stick se
          jo naapa wo likhein.
        </p>
        {errors.general && <Alert tone="error">{errors.general}</Alert>}
        <TextField
          label="Naapa hua stock (L)"
          value={measured}
          onChange={(event) => setMeasured(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          error={errors.fields.measured_litres || preview.error}
        />
        {preview.ok && (
          <p className="rounded-xl bg-sand-100 px-3 py-2 text-sm text-ink" aria-live="polite">
            Farq: <strong>{formatLitres(preview.variance)}</strong>
            {preview.percent !== null && ` (${preview.percent}%)`}
          </p>
        )}
        <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} error={errors.fields.note} />
        <div className="flex gap-2">
          <Button type="submit" loading={submitting} disabled={!preview.ok}>
            Stock theek karein
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Wapas
          </Button>
        </div>
      </form>
    </Modal>
  );
}