import { useState } from 'react';
import { fetchSheet, markDay, patchAttendance } from '@/api/staff';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { ATTENDANCE_STATUSES, POSITION_LABELS, SHIFT_LABELS, STATUS_LABELS } from '@/config/staff';
import { useFetch } from '@/hooks/useFetch';
import { toISODate, isValidISODate } from '@/utils/date';
import { getErrorMessage, splitApiErrors } from '@/utils/error';

const ACTIVE_STYLE = {
  present: 'bg-lagoon-500 text-ink',
  half_day: 'bg-marigold-400 text-ink',
  absent: 'bg-coral-500 text-ink',
};

export default function AttendanceSheet() {
  const today = toISODate();
  const [date, setDate] = useState(today);
  const [overrideState, setOverrideState] = useState({ data: null, values: {} });
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const sheet = useFetch(() => fetchSheet(date), [date]);

  const rows = sheet.data?.rows ?? [];
  const overrides = overrideState.data === sheet.data ? overrideState.values : {};
  const statusOf = (row) => overrides[row.staff] ?? row.status;

  function updateOverrides(update) {
    setOverrideState((current) => ({
      data: sheet.data,
      values: update(current.data === sheet.data ? current.values : {}),
    }));
  }
  const counts = { present: 0, half_day: 0, absent: 0, unmarked: 0 };
  for (const row of rows) counts[statusOf(row) ?? 'unmarked'] += 1;

  async function change(row, status) {
    if (busy[row.staff] || statusOf(row) === status) return;
    setError('');
    updateOverrides((current) => ({ ...current, [row.staff]: status }));
    setBusy((current) => ({ ...current, [row.staff]: true }));
    try {
      if (row.attendance_id) await patchAttendance(row.attendance_id, status);
      else await markDay(date, [{ staff: row.staff, status }]);
      sheet.reload();
    } catch (err) {
      setOverrideState((current) => {
        if (current.data !== sheet.data) return current;
        const values = { ...current.values };
        delete values[row.staff];
        return { data: current.data, values };
      });
      setError(splitApiErrors(err, []).general);
    } finally {
      setBusy((current) => ({ ...current, [row.staff]: false }));
    }
  }

  async function markRestPresent() {
    const pending = rows.filter((row) => !statusOf(row));
    if (pending.length === 0) return;
    setError('');
    try {
      await markDay(date, pending.map((row) => ({ staff: row.staff, status: 'present' })));
      sheet.reload();
    } catch (err) {
      setError(splitApiErrors(err, []).general);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TextField
          label="Tareekh"
          type="date"
          max={today}
          value={date}
          onChange={(event) => isValidISODate(event.target.value) && setDate(event.target.value)}
        />
        <dl className="flex gap-2 text-center text-xs" aria-label="Aaj ka khulasa">
          {[
            ['present', 'Present'],
            ['half_day', 'Aadha din'],
            ['absent', 'Absent'],
            ['unmarked', 'Baqi'],
          ].map(([key, label]) => (
            <div key={key} className="rounded-xl bg-sand-100 px-3 py-1.5">
              <dd className="text-base font-extrabold text-ink">{counts[key]}</dd>
              <dt className="text-ink-soft">{label}</dt>
            </div>
          ))}
        </dl>
        <Button variant="soft" size="sm" onClick={markRestPresent} disabled={counts.unmarked === 0}>
          Baqi sab present
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {sheet.loading ? (
        <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
          <Spinner className="h-5 w-5 text-marigold-600" />
          <span className="text-sm font-semibold">Attendance sheet aa rahi hai...</span>
        </div>
      ) : !sheet.data ? (
        <div className="space-y-3">
          <Alert tone="error">{getErrorMessage(sheet.error)}</Alert>
          <Button onClick={sheet.reload}>Dobara koshish karein</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">Abhi koi chalu staff nahi.</p>
      ) : (
        <ul className="divide-y divide-sand-200">
          {rows.map((row) => (
            <li key={row.staff} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-ink">{row.name}</p>
                <p className="text-xs text-ink-soft">
                  {POSITION_LABELS[row.position] ?? row.position} · {SHIFT_LABELS[row.shift ?? row.default_shift] ?? ''}
                </p>
              </div>
              <div className="flex gap-1" role="group" aria-label={`${row.name} ki attendance`}>
                {ATTENDANCE_STATUSES.map((status) => {
                  const selected = statusOf(row) === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${row.name}: ${STATUS_LABELS[status]}`}
                      disabled={busy[row.staff]}
                      onClick={() => change(row, status)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                        selected ? ACTIVE_STYLE[status] : 'bg-sand-100 text-ink-soft hover:bg-sand-200'
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}