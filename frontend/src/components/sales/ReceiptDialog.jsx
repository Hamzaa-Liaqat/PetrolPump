import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import Model from '@/components/ui/Model';
import { FUEL_LABELS } from '@/config/fuel';
import { formatDateTime, formatLitres, formatMoney } from '@/utils/formate';

function Row({ label, children, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-sand-300 py-2 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={strong ? 'text-lg font-extrabold text-ink' : 'font-semibold text-ink'}>{children}</dd>
    </div>
  );
}

export default function ReceiptDialog({ sale, onClose }) {
  return (
    <Model title="Receipt" onClose={onClose} className="print-area">
      <div className="mb-3 flex justify-center">
        <Logo />
      </div>
      <dl>
        <Row label="Receipt no">{sale.receipt_no}</Row>
        <Row label="Waqt">{formatDateTime(sale.timestamp)}</Row>
        <Row label="Nozzle">{sale.nozzle_name}</Row>
        <Row label="Fuel">{FUEL_LABELS[sale.fuel_type] ?? sale.fuel_type}</Row>
        <Row label="Opening">{sale.opening_reading}</Row>
        <Row label="Closing">{sale.closing_reading}</Row>
        <Row label="Litres">{formatLitres(sale.litres)}</Row>
        <Row label="Rate">{formatMoney(sale.rate, 2)}</Row>
        <Row label="Amount" strong>
          {formatMoney(sale.amount, 2)}
        </Row>
        <Row label="Cashier">{sale.cashier_name ?? '-'}</Row>
      </dl>
      <div className="no-print mt-5 flex gap-2">
        <Button onClick={() => window.print()}>Print</Button>
        <Button variant="ghost" onClick={onClose}>
          Band karein
        </Button>
      </div>
    </Model>
  );
}