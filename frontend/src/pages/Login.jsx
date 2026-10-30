import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import Logo from '@/components/ui/Logo';
import ServerStatus from '@/components/ui/ServerStatus';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { canAccess, homePathFor } from '@/config/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/error';
import { clearFlash, peekFlash } from '@/utils/flash';

function loginErrorMessage(error) {
  if (error?.response?.status === 401) return 'Username ya password ghalat hai.';
  return getErrorMessage(error);
}

const HIGHLIGHTS = [
  'Har litre ka hisaab: tank se nozzle tak',
  'Udhaar aur payment, bina ghalti ke',
  'Roz, hafta aur mahine ki report ek click mein',
];

export default function Login() {
  const { status, role, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [notice] = useState(() => peekFlash());
  useEffect(() => {
    clearFlash();
  }, []);

  if (status === 'authenticated') {
    const from = location.state?.from?.pathname;
    const target = from && canAccess(role, from) ? from : homePathFor(role);
    return <Navigate to={target} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
      setPassword('');
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-sand-50 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-marigold-100 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-marigold-400/40" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-lagoon-100" />
        <div className="absolute bottom-40 right-16 h-24 w-24 rounded-full bg-coral-100" />
        <div className="relative">
          <Logo size={40} />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight text-ink">
            Pump ka poora hisaab, <span className="text-lagoon-700">ek jagah.</span>
          </h2>
          <ul className="mt-6 space-y-3">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-ink">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral-500" />
                <span className="font-medium">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-marigold-800">FuelTrack - Petrol Pump Management</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size={36} />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Login</h1>
          <p className="mt-1 text-sm text-ink-soft">Apna username aur password likhein.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {notice && !error && <Alert tone="success">{notice}</Alert>}
            {error && <Alert tone="error">{error}</Alert>}

            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-semibold text-ink">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-card px-3.5 py-2.5 text-ink outline-none placeholder:text-ink-soft/60 focus:border-marigold-500 focus:ring-2 focus:ring-marigold-400/40"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-sand-300 bg-card py-2.5 pl-3.5 pr-16 text-ink outline-none focus:border-marigold-500 focus:ring-2 focus:ring-marigold-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-lagoon-700 hover:bg-lagoon-100"
                >
                  {showPassword ? 'Chhupayein' : 'Dikhayein'}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={submitting}
              disabled={!username.trim() || !password}
            >
              {submitting ? 'Login ho raha hai...' : 'Login karein'}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-ink-soft">
            <span>Account chahiye? Owner se rabta karein.</span>
            <ServerStatus />
          </div>
        </div>
      </main>
    </div>
  );
}