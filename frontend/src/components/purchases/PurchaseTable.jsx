import { formatLitres, formatMoney } from '@/utils/formate';

export default function PurchaseTable({ purchases }) {
  if (purchases.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-soft">Is muddat mein koi delivery nahi.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="stack w-full min-w-200 text-left text-sm">
        <thead>
          <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
            <th className="py-2 pr-3">Tareekh</th>
            <th className="py-2 pr-3">Tank</th>
            <th className="py-2 pr-3">Supplier</th>
            <th className="py-2 pr-3">Invoice</th>
            <th className="py-2 pr-3 text-right">Invoice L</th>
            <th className="py-2 pr-3 text-right">Mila L</th>
            <th className="py-2 pr-3 text-right">Kami</th>
            <th className="py-2 pr-3 text-right">Raqam</th>
            <th className="py-2 text-right">Rs/L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {purchases.map((purchase) => {
            const shortage = Number(purchase.shortage_litres);
            return (
              <tr key={purchase.id}>
                <td data-label="Tareekh" className="py-2.5 pr-3 text-ink-soft">{purchase.date}</td>
                <td data-label="Tank" className="py-2.5 pr-3 font-semibold text-ink">{purchase.tank_name}</td>
                <td data-label="Supplier" className="py-2.5 pr-3">
                  {purchase.supplier}
                  <span className="block text-xs text-ink-soft">{purchase.tanker_number}</span>
                </td>
                <td data-label="Invoice" className="py-2.5 pr-3">{purchase.invoice_number}</td>
                <td data-label="Invoice L" className="py-2.5 pr-3 text-right">{formatLitres(purchase.litres)}</td>
                <td data-label="Mila L" className="py-2.5 pr-3 text-right">{formatLitres(purchase.received_litres)}</td>
                <td data-label="Kami" className="py-2.5 pr-3 text-right">
                  {shortage > 0 ? (
                    <span className="rounded-full bg-warn-bg px-2 py-0.5 text-xs font-bold text-warn">
                      {formatLitres(shortage)}
                    </span>
                  ) : (
                    <span className="text-ink-soft">-</span>
                  )}
                </td>
                <td data-label="Raqam" className="py-2.5 pr-3 text-right font-bold text-ink">{formatMoney(purchase.invoice_amount)}</td>
                <td data-label="Rs/L" className="py-2.5 text-right">{formatMoney(purchase.cost_per_litre, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}