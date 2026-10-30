import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { AuthContext } from '@/context/AuthContext';

function renderGuard(auth, roles) {
  return render(
    <AuthContext.Provider value={{ status: 'anonymous', role: null, retry: () => {}, ...auth }}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<p>LOGIN PAGE</p>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute roles={roles}>
                <p>SECRET DATA</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('login ke bagair login page par bhej deta hai, data nahi dikhata', () => {
    renderGuard({ status: 'anonymous' });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SECRET DATA')).not.toBeInTheDocument();
  });

  it('check hote waqt na data na login page, sirf intezar', () => {
    renderGuard({ status: 'loading' });
    expect(screen.getByRole('status')).toHaveTextContent('Check ho raha hai');
    expect(screen.queryByText('SECRET DATA')).not.toBeInTheDocument();
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
  });

  it('galat role ko ijazat ka paigham, data nahi', () => {
    renderGuard({ status: 'authenticated', role: 'cashier' }, ['owner']);
    expect(screen.getByRole('heading', { name: 'Is page ki ijazat nahi' })).toBeInTheDocument();
    expect(screen.queryByText('SECRET DATA')).not.toBeInTheDocument();
  });

  it('sahi role ko data milta hai', () => {
    renderGuard({ status: 'authenticated', role: 'owner' }, ['owner', 'manager']);
    expect(screen.getByText('SECRET DATA')).toBeInTheDocument();
  });

  it('roles ke bagair sirf login kaafi hai', () => {
    renderGuard({ status: 'authenticated', role: 'cashier' });
    expect(screen.getByText('SECRET DATA')).toBeInTheDocument();
  });

  it('server na mile to logout nahi, retry ka button', async () => {
    const retry = vi.fn();
    renderGuard({ status: 'unreachable', retry });
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dobara koshish karein' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});