import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PurchaseTable from '@/components/purchases/PurchaseTable';
import { purchaseFixture } from '@/test/fixtures';

describe('PurchaseTable: chhoti screen ke liye', () => {
  it('table par "stack" class hai', () => {
    render(<PurchaseTable purchases={[purchaseFixture()]} />);
    expect(screen.getByRole('table')).toHaveClass('stack');
  });

  it('har cell par us ke header ka naam data-label mein hai (kami wali aur bina kami wali row)', () => {
    render(<PurchaseTable purchases={[purchaseFixture(), purchaseFixture({ id: 2, shortage_litres: '0.00' })]} />);
    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    for (const row of screen.getAllByRole('row').slice(1)) {
      const labels = within(row).getAllByRole('cell').map((cell) => cell.getAttribute('data-label'));
      expect(labels).toEqual(headers);
    }
  });
});