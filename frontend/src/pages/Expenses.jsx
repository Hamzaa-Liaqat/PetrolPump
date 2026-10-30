import { useState } from 'react';
import { fetchExpenses, voidExpense } from '@/api/expenses';
import MetricCard from '@/components/dashboard/MetricCard';
import ExpenseFormDialog from '@/components/expenses/ExpenseFormDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import ReasonDialog from '@/components/ui/ReasonDialog';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { EXPENSE_CATEGORIES, EXPENSE_LABELS } from '@/config/expenses';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { toISODate, monthRangeISO } from '@/utils/date';
import { formatHundredths, sumHundredths } from '@/utils/decimal';
import { getErrorMessage } from '@/utils/error';
import { formatMoney } from '@/utils/formate';
import { parseMonthValue } from '@/utils/periods';

export default function Expenses() {
  const { role } = useAuth();
  const canVoid = can(role, 'expense.void');
  const now = new Date();
  const [month, setMonth] = useState(toISODate(now).slice(0, 7));
  const [category, setCategory] = useState('');
  const [showVoid, setShowVoid] = useState(false);
  const [creating, setCreating] = useState(false);
  const [voiding, setVoiding] = useState(null);

  const period = parseMonthValue(month);
  const range = period ? monthRangeISO(period.year, period.month) : null;
  const expenses = useFetch(
    () =>
      fetchExpenses({
        date_from: range?.from,
        date_to: range?.to,
        category: category || undefined,
        include_void: showVoid ? '1' : undefined,
      }),
    [month, category, showVoid],
  );

  const rows = expenses.data ?? [];
  const active = rows.filter((row) => !row.is_void);
  const total = formatHundredths(sumHundredths(active.map((row) => row.amount)));
  const byCategory = EXPENSE_CATEGORIES.map((key) => ({
    key,
    amount: formatHundredths(sumHundredths(active.filter((row) => row.category === key).map((row) => row.amount))),
  })).filter((row) => row.amount !== '0.00');

  function refresh() {
    expenses.reload();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Expenses</h1>
          <p className="text-sm text-ink-soft">Bijli, kiraya, marammat jaise kharche. Salary alag (Staff mein).</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Naya kharcha
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Kharche ka khulasa">
        <MetricCard label="Is mahine ka kul" value={formatMoney(total, 2)} tone="coral" />
        <MetricCard label="Entries" value={String(active.length)} tone="periwinkle" />
        <MetricCard
          label="Sab se bara kharcha"
          value={byCategory.length ? EXPENSE_LABELS[[...byCategory].sort((a, b) => Number(b.amount) - Number(a.amount))[0].key] : '-'}
          tone="marigold"
        />
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <TextField label="Mahina" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <SelectField label="Qisam" value={category} onChange={(event) => setCategory(event.target.value)} className="w-48">
            <option value="">Sab</option>
            {EXPENSE_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {EXPENSE_LABELS[key]}
              </option>
            ))}
          </SelectField>
          <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={showVoid}
              onChange={(event) => setShowVoid(event.target.checked)}
              className="h-4 w-4 accent-marigold-500"
            />
            Void bhi dikhayein
          </label>
        </div>

        {byCategory.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-2" aria-label="Qisam ke hisaab se">
            {byCategory.map((row) => (
              <li key={row.key} className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-ink">
                {EXPENSE_LABELS[row.key]}: {formatMoney(row.amount, 2)}
              </li>
            ))}
          </ul>
        )}

        {!period ? (
          <Alert tone="warn">Mahina chunein.</Alert>
        ) : expenses.loading ? (
          <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
            <Spinner className="h-5 w-5 text-marigold-600" />
            <span className="text-sm font-semibold">Kharche aa rahe hain...</span>
          </div>
        ) : !expenses.data ? (
          <div className="space-y-3">
            <Alert tone="error">{getErrorMessage(expenses.error)}</Alert>
            <Button onClick={expenses.reload}>Dobara koshish karein</Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Is mahine koi kharcha nahi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-3">Tareekh</th>
                  <th className="py-2 pr-3">Qisam</th>
                  <th className="py-2 pr-3">Note</th>
                  <th className="py-2 pr-3 text-right">Raqam</th>
                  <th className="py-2 text-right">Kaam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {rows.map((row) => (
                  <tr key={row.id} className={row.is_void ? 'opacity-60' : ''}>
                    <td className="py-2.5 pr-3 text-ink-soft">{row.date}</td>
                    <td className="py-2.5 pr-3 font-semibold text-ink">{row.category_label}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {row.note || row.reference || '-'}
                      {row.is_void && <span className="block text-xs text-coral-800">Void: {row.void_reason}</span>}
                    </td>
                    <td className={`py-2.5 pr-3 text-right font-bold text-ink ${row.is_void ? 'line-through' : ''}`}>
                      {formatMoney(row.amount, 2)}
                    </td>
                    <td className="py-2.5 text-right">
                      {canVoid && !row.is_void && (
                        <Button variant="danger" size="sm" onClick={() => setVoiding(row)}>
                          Void
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <ExpenseFormDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}
      {voiding && (
        <ReasonDialog
          title={`Void: ${voiding.category_label} ${formatMoney(voiding.amount, 2)}`}
          description="Kharcha mitaya nahi jata, void ho kar hisaab se nikal jata hai."
          confirmLabel="Void karein"
          onConfirm={(reason) => voidExpense(voiding.id, reason)}
          onClose={() => setVoiding(null)}
          onDone={() => {
            setVoiding(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}