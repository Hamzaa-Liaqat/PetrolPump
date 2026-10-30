import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadReport } from '@/api/report';
import ExportButtons from '@/components/reports/ExportButtons';
import { saveBlob } from '@/utils/download';

vi.mock('@/api/report', () => ({ downloadReport: vi.fn() }));
vi.mock('@/utils/download', async (importOriginal) => ({ ...(await importOriginal()), saveBlob: vi.fn() }));

describe('ExportButtons', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('PDF: sahi parameters aur server ke diye hue naam se save', async () => {
    const blob = new Blob(['%PDF-']);
    downloadReport.mockResolvedValue({ data: blob, headers: { 'content-disposition': 'attachment; filename="petrol-pump-report-2026-10.pdf"' } });
    render(<ExportButtons year={2026} month={10} />);
    await userEvent.click(screen.getByRole('button', { name: 'PDF download' }));
    expect(downloadReport).toHaveBeenCalledWith({ year: 2026, month: 10, file: 'pdf' });
    expect(saveBlob).toHaveBeenCalledWith(blob, 'petrol-pump-report-2026-10.pdf');
  });

  it('Excel: header na mile (CORS) to khud ka naam', async () => {
    const blob = new Blob(['PK']);
    downloadReport.mockResolvedValue({ data: blob, headers: {} });
    render(<ExportButtons year={2026} month={3} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excel download' }));
    expect(downloadReport).toHaveBeenCalledWith({ year: 2026, month: 3, file: 'xlsx' });
    expect(saveBlob).toHaveBeenCalledWith(blob, 'petrol-pump-report-2026-03.xlsx');
  });

  it('ghalti par paigham, aur button dobara chal jata hai', async () => {
    downloadReport.mockRejectedValue({ response: { status: 403, data: new Blob(['x']) } });
    render(<ExportButtons year={2026} month={10} />);
    await userEvent.click(screen.getByRole('button', { name: 'PDF download' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ijazat');
    expect(saveBlob).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'PDF download' })).toBeEnabled();
  });

  it('server band ho to network ka paigham', async () => {
    downloadReport.mockRejectedValue(new Error('Network Error'));
    render(<ExportButtons year={2026} month={10} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excel download' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server se rabta nahi');
  });
});