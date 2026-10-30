import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api, { API_URL } from '@/api/axios';
import { fetchHealth, fetchMe } from '@/api/auth';
import Button from '@/components/ui/Button';
import { ROLES } from '@/config/role';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/error';

function statusOf(error) {
  return error?.response?.status ?? 'koi jawab nahi';
}

function buildChecks(role) {
  const checks = [
    {
      key: 'health',
      label: 'Server aur database chal rahe hain',
      run: async () => {
        const { data } = await fetchHealth();
        return { ok: data.status === 'ok' && data.database === 'ok', detail: `Database: ${data.database}` };
      },
    },
    {
      key: 'me',
      label: 'Aap ka login token sahi hai',
      run: async () => {
        const { data } = await fetchMe();
        return { ok: true, detail: `${data.username} (${data.role})` };
      },
    },
    {
      key: 'anonymous',
      label: 'Bina token ke data band hai',
      run: async () => {
        try {
          await axios.get(`${API_URL}auth/me/`, { timeout: 8000 });
          return { ok: false, detail: 'Bina login ke jawab mil gaya! Backend ki permissions check karein.' };
        } catch (error) {
          return { ok: statusOf(error) === 401, detail: `Server ka jawab: ${statusOf(error)}` };
        }
      },
    },
  ];

  if (role === ROLES.CASHIER) {
    checks.push({
      key: 'role-gate',
      label: 'Cashier ke liye dashboard band hai',
      run: async () => {
        try {
          await api.get('dashboard/summary/');
          return { ok: false, detail: 'Cashier ko dashboard mil gaya! Backend ki permissions check karein.' };
        } catch (error) {
          return { ok: statusOf(error) === 403, detail: `Server ka jawab: ${statusOf(error)}` };
        }
      },
    });
  } else {
    checks.push({
      key: 'role-gate',
      label: 'Dashboard ka data milta hai',
      run: async () => {
        await api.get('dashboard/summary/');
        return { ok: true, detail: 'Ijazat theek hai' };
      },
    });
  }
  return checks;
}

const ICON = {
  pending: { symbol: '...', style: 'bg-sand-100 text-ink-soft', text: 'Ho raha hai' },
  pass: { symbol: 'OK', style: 'bg-lagoon-100 text-lagoon-800', text: 'Theek' },
  fail: { symbol: '!', style: 'bg-coral-100 text-coral-800', text: 'Masla' },
};

export default function ConnectionChecks() {
  const { role } = useAuth();
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults({});
    for (const check of buildChecks(role)) {
      setResults((current) => ({ ...current, [check.key]: { state: 'pending' } }));
      try {
        const outcome = await check.run();
        setResults((current) => ({
          ...current,
          [check.key]: { state: outcome.ok ? 'pass' : 'fail', detail: outcome.detail },
        }));
      } catch (error) {
        setResults((current) => ({
          ...current,
          [check.key]: { state: 'fail', detail: getErrorMessage(error) },
        }));
      }
    }
    setRunning(false);
  }, [role]);

  useEffect(() => {
    runAll();
  }, [runAll]);

  return (
    <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Backend se rabte ki jaanch</h2>
          <p className="text-sm text-ink-soft">Ye hissa sirf test ke liye hai, baad mein hata dein.</p>
        </div>
        <Button variant="soft" size="sm" onClick={runAll} loading={running}>
          Dobara check
        </Button>
      </div>
      <ul className="mt-4 divide-y divide-sand-200">
        {buildChecks(role).map((check) => {
          const result = results[check.key] ?? { state: 'pending' };
          const icon = ICON[result.state];
          return (
            <li key={check.key} className="flex items-start gap-3 py-3">
              <span
                className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-extrabold ${icon.style}`}
                title={icon.text}
              >
                {icon.symbol}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{check.label}</p>
                {result.detail && <p className="text-xs text-ink-soft">{result.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}