import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '@/components/ErrorBoundary';

function Boom() {
  throw new Error('phat gaya');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('theek component par kuch nahi badalta', () => {
    render(<ErrorBoundary><p>sab theek</p></ErrorBoundary>);
    expect(screen.getByText('sab theek')).toBeInTheDocument();
  });

  it('crash par saaf paigham aur reload ka button, safed screen nahi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Kuch ghalat ho gaya');
    expect(screen.getByRole('button', { name: 'Dobara load karein' })).toBeInTheDocument();
  });
});