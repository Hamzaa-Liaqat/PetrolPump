import {  useState } from 'react';
import { FUEL_CHIP, FUEL_LABELS } from '@/config/fuel';
import { formatDateTime, formatMoney } from '@/utils/formate';

export default function RateHistory({ rates }) {
  const [now] = useState(() => Date.now());

  if (rates.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-soft">Abhi koi rate nahi.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-lg text-left text-sm">
        <thead>
          <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <th className="py-2 pr-3">Kab se</th>
            <th className="py-2 pr-3">Fuel</th>
            <th className="py-2 pr-3 text-right">Rate</th>
            <th className="py-2">Kis ne lagaya</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {rates.map((rate) => (
            <tr key={rate.id}>
              <td className="py-2.5 pr-3 text-ink-soft">
                {formatDateTime(rate.effective_from)}
                {now !== null && new Date(rate.effective_from).getTime() > now && (
                  <span className="ml-2 rounded-full bg-periwinkle-100 px-2 py-0.5 text-xs font-bold text-periwinkle-800">Aanay wala</span>
                )}
              </td>
              <td className="py-2.5 pr-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${FUEL_CHIP[rate.fuel_type] ?? ''}`}>
                  {FUEL_LABELS[rate.fuel_type] ?? rate.fuel_type}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-right font-bold text-ink">{formatMoney(rate.rate, 2)}</td>
              <td className="py-2.5 text-ink-soft">{rate.created_by_name ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}