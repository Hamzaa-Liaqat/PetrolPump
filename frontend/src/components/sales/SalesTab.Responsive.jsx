import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SalesTable from '@/components/sales/SalesTable';

const sale = {
  id: 1, receipt_no: 'RC-1', timestamp: '2026-10-11T10:05:00Z', nozzle_name: 'N1', fuel_type: 'petrol',
  litres: '100.40', rate: '250.00', amount: '25100.00',
};

describe('SalesTable: chhoti screen ke liye', () => {
  it('table par "stack" class hai', () => {
    render(<SalesTable sales={[sale]} canVoid onVoid={() => {}} onReceipt={() => {}} />);
    expect(screen.getByRole('table')).toHaveClass('stack');
  });

  it('har cell par us ke header ka naam data-label mein hai', () => {
    render(<SalesTable sales={[sale, { ...sale, id: 2 }]} canVoid={false} onVoid={() => {}} onReceipt={() => {}} />);
    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    const rows = screen.getAllByRole('row').slice(1);
    for (const row of rows) {
      const labels = within(row).getAllByRole('cell').map((cell) => cell.getAttribute('data-label'));
      expect(labels).toEqual(headers);
    }
  });
});