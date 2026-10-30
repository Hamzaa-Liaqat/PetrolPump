import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from '@/components/ui/AppLayout';

vi.mock('./Navbar', () => ({ default: () => <nav>NAV</nav> }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/billing" element={<p>b</p>} />
          <Route path="/reports" element={<p>r</p>} />
          <Route path="*" element={<p>x</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout: page ka title', () => {
  it('har page par browser tab ka title badalta hai', () => {
    const { unmount } = renderAt('/billing');
    expect(document.title).toBe('Billing - FuelTrack');
    unmount();
    renderAt('/reports');
    expect(document.title).toBe('Reports - FuelTrack');
  });

  it('anjaan page par sirf brand', () => {
    renderAt('/kuch-aur');
    expect(document.title).toBe('FuelTrack');
  });
});