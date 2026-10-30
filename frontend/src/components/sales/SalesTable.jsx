import Button from '@/components/ui/Button';
import { FUEL_CHIP, FUEL_LABELS } from '@/config/fuel';
import { formatLitres, formatMoney, formatTime } from '@/utils/formate';

export default function SalesTable({ sales, canVoid, onVoid, onReceipt }) {
  if (sales.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-soft">Aaj abhi koi entry nahi.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="stack w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <th className="py-2 pr-3">Waqt</th>
            <th className="py-2 pr-3">Receipt</th>
            <th className="py-2 pr-3">Nozzle</th>
            <th className="py-2 pr-3 text-right">Litres</th>
            <th className="py-2 pr-3 text-right">Rate</th>
            <th className="py-2 pr-3 text-right">Amount</th>
            <th className="py-2 text-right">Kaam</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td data-label="Waqt" className="py-2.5 pr-3 text-ink-soft">{formatTime(sale.timestamp)}</td>
              <td data-label="Receipt" className="py-2.5 pr-3 font-semibold text-ink">{sale.receipt_no}</td>
              <td data-label="Nozzle" className="py-2.5 pr-3">
                <span className="font-semibold text-ink">{sale.nozzle_name}</span>{' '}
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${FUEL_CHIP[sale.fuel_type] ?? ''}`}>
                  {FUEL_LABELS[sale.fuel_type] ?? sale.fuel_type}
                </span>
              </td>
              <td data-label="Litres" className="py-2.5 pr-3 text-right">{formatLitres(sale.litres)}</td>
              <td data-label="Rate" className="py-2.5 pr-3 text-right">{formatMoney(sale.rate, 2)}</td>
              <td data-label="Amount" className="py-2.5 pr-3 text-right font-bold text-ink">{formatMoney(sale.amount, 2)}</td>
              <td data-label="Kaam" className="py-2.5 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onReceipt(sale)}>
                    Receipt
                  </Button>
                  {canVoid && (
                    <Button variant="danger" size="sm" onClick={() => onVoid(sale)}>
                      Void
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}