import { useState } from 'react';
import { downloadReport } from '@/api/report';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { filenameFromDisposition, saveBlob } from '@/utils/download';
import { getErrorMessage } from '@/utils/error';

export default function ExportButtons({ year, month }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function download(file) {
    setBusy(file);
    setError('');
    try {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const response = await downloadReport({ year, month, file });
      const fallback = `petrol-pump-report-${period}.${file}`;
      saveBlob(response.data, filenameFromDisposition(response.headers?.['content-disposition'], fallback));
    } catch (err) {
      setError(getErrorMessage(err, 'File download nahi ho saki. Dobara koshish karein.'));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="soft" size="sm" loading={busy === 'pdf'} disabled={Boolean(busy)} onClick={() => download('pdf')}>
          PDF download
        </Button>
        <Button variant="soft" size="sm" loading={busy === 'xlsx'} disabled={Boolean(busy)} onClick={() => download('xlsx')}>
          Excel download
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}