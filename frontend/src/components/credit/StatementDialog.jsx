import { useState } from 'react';
import { fetchStatement } from '@/api/credit';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { useFetch } from '@/hooks/useFetch';
import { reversedIds } from '@/utils/credit';
import { daysAgoISO, toISODate } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { formatDateTime, formatLitres, formatMoney } from '@/utils/formate';

export default function StatementDialog({ customer, canReverse, onReverse, onClose }) {
  const today = toISODate();
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(today);
  const statement = useFetch(
    () => fetchStatement(customer.id, { date_from: from, date_to: to }),
    [customer.id, from, to],
  );
  const data = statement.data;
  const entries = data?.entries ?? [];
  const reversed = reversedIds(entries);

  return (
    <Model title={`Statement: ${customer.name}`} onClose={onClose} wide>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <TextField label="Se" type="date" max={to} value={from} onChange={(event) => setFrom(event.target.value)} />
        <TextField label="Tak" type="date" max={today} value={to} onChange={(event) => setTo(event.target.value)} />
      </div>

      {statement.loading ? (
        <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
          <Spinner className="h-5 w-5 text-marigold-600" />
          <span className="text-sm font-semibold">Statement aa raha hai...</span>
        </div>
      ) : !data ? (
        <div className="space-y-3">
          <Alert tone="error">{getErrorMessage(statement.error)}</Alert>
          <Button onClick={statement.reload}>Dobara koshish karein</Button>
        </div>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[
              ['Shuru ka baqi', data.opening_balance],
              ['Udhaar (+)', data.total_debits],
              ['Payment (-)', data.total_credits],
              ['Aakhir ka baqi', data.closing_balance],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-sand-100 px-2 py-2">
                <dt className="text-xs text-ink-soft">{label}</dt>
                <dd className="text-sm font-extrabold text-ink">{formatMoney(value, 2)}</dd>
              </div>
            ))}
          </dl>

          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-soft">Is muddat mein koi entry nahi.</p>
          ) : (
            <div className="max-h-80 overflow-auto">
              <table className="w-full min-w-136 text-left text-sm">
                <thead>
                  <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-3">Waqt</th>
                    <th className="py-2 pr-3">Qisam</th>
                    <th className="py-2 pr-3 text-right">Raqam</th>
                    <th className="py-2 pr-3 text-right">Baqi</th>
                    <th className="py-2 text-right">Kaam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {entries.map((entry) => {
                    const signed = Number(entry.signed_amount);
                    const canUndo = canReverse && ['sale', 'payment'].includes(entry.type) && !reversed.has(entry.id);
                    return (
                      <tr key={entry.id}>
                        <td className="py-2 pr-3 text-ink-soft">{formatDateTime(entry.timestamp)}</td>
                        <td className="py-2 pr-3">
                          <span className="font-semibold text-ink">{entry.type_label}</span>
                          <span className="block text-xs text-ink-soft">
                            {entry.litres ? `${formatLitres(entry.litres)} ` : ''}
                            {entry.vehicle_number || entry.reference || entry.note || ''}
                          </span>
                        </td>
                        <td className={`py-2 pr-3 text-right font-bold ${signed >= 0 ? 'text-coral-800' : 'text-lagoon-700'}`}>
                          {signed >= 0 ? '+' : '-'}
                          {formatMoney(Math.abs(signed), 2)}
                        </td>
                        <td className="py-2 pr-3 text-right">{formatMoney(entry.balance_after, 2)}</td>
                        <td className="py-2 text-right">
                          {canUndo && (
                            <Button variant="danger" size="sm" onClick={() => onReverse(entry)}>
                              Reverse
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Model>
  );
}