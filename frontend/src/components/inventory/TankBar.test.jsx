import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TankBar from '@/components/inventory/TankBar.jsx';
import { tankFixture } from '@/test/fixtures';

const bar = () => screen.getByRole('progressbar', { name: 'Tank-1 ka stock' });

describe('TankBar', () => {
  it('percent aur litres dikhata hai', () => {
    render(<TankBar tank={tankFixture()} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/5,000 L \/ 10,000 L/)).toBeInTheDocument();
    expect(bar()).toHaveAttribute('aria-valuenow', '50');
  });

  it('theek stock lagoon rang mein, kam stock warn rang mein', () => {
    const { unmount } = render(<TankBar tank={tankFixture()} />);
    expect(bar().firstChild).toHaveClass('bg-lagoon-500');
    unmount();
    render(<TankBar tank={tankFixture({ current_stock: 500, is_low: true })} />);
    expect(bar().firstChild).toHaveClass('bg-warn');
  });

  it('is_low na aaye to reorder level se khud pehchanta hai', () => {
    render(<TankBar tank={tankFixture({ is_low: undefined, current_stock: 900 })} />);
    expect(bar().firstChild).toHaveClass('bg-warn');
  });

  it('percent kabhi 0-100 se bahar nahi', () => {
    const { unmount } = render(<TankBar tank={tankFixture({ current_stock: 20000 })} />);
    expect(bar()).toHaveAttribute('aria-valuenow', '100');
    unmount();
    render(<TankBar tank={tankFixture({ capacity: 0 })} />);
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
  });

  it('hideName par naam nahi dikhta', () => {
    render(<TankBar tank={tankFixture()} hideName />);
    expect(screen.queryByText('Tank-1')).not.toBeInTheDocument();
  });
});