import { useState } from 'react';
import { fetchNozzles, fetchTodaySales } from '@/api/sales';
import MetricCard from '@/components/dashboard/MetricCard';
import ReceiptDialog from '@/components/sales/ReceiptDialog';
import SaleForm from '@/components/sales/SaleForm';
import SalesTable from '@/components/sales/SalesTable';
import VoidDialog from '@/components/sales/VoidDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { sumSales } from '@/utils/billing';
import { getErrorMessage } from '@/utils/error';
import { formatLitres, formatMoney } from '@/utils/formate';

export default function SalesEntry() {
  const { role } = useAuth();
  const nozzles = useFetch(fetchNozzles, []);
  const sales = useFetch(fetchTodaySales, [], 60000);
  const [receipt, setReceipt] = useState(null);
  const [voiding, setVoiding] = useState(null);

  const activeNozzles = (nozzles.data ?? []).filter((nozzle) => nozzle.is_active);
  const todaySales = sales.data ?? [];
  const totals = sumSales(todaySales);
  const canVoid = can(role, 'sale.void');

  function handleSaved(sale) {
    setReceipt(sale);
    nozzles.reload();
    sales.reload();
  }

  function handleVoided() {
    setVoiding(null);
    nozzles.reload();
    sales.reload();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Billing</h1>
        <p className="text-sm text-ink-soft">Nozzle ki closing reading likhein, baqi hisaab server karta hai.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
          <h2 className="mb-4 text-lg font-extrabold text-ink">Nayi sale</h2>
          {nozzles.loading ? (
            <div className="flex items-center gap-3 text-ink-soft" role="status">
              <Spinner className="h-5 w-5 text-marigold-600" />
              <span className="text-sm font-semibold">Nozzles aa rahe hain...</span>
            </div>
          ) : !nozzles.data ? (
            <div className="space-y-3">
              <Alert tone="error">{getErrorMessage(nozzles.error)}</Alert>
              <Button onClick={nozzles.reload}>Dobara koshish karein</Button>
            </div>
          ) : activeNozzles.length === 0 ? (
            <Alert tone="info">Abhi koi nozzle nahi. Owner se nozzle banwayein.</Alert>
          ) : (
            <SaleForm nozzles={activeNozzles} onSaved={handleSaved} onStale={nozzles.reload} />
          )}
        </section>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Aaj ki entries" value={String(todaySales.length)} tone="periwinkle" />
            <MetricCard label="Litres" value={formatLitres(totals.litres)} tone="lagoon" />
            <MetricCard label="Amount" value={formatMoney(totals.amount, 2)} tone="marigold" />
          </div>

          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Aaj ki entries</h2>
              <Button variant="soft" size="sm" onClick={sales.reload}>
                Taza karein
              </Button>
            </div>
            {sales.error && !sales.data ? (
              <Alert tone="error">{getErrorMessage(sales.error)}</Alert>
            ) : (
              <SalesTable sales={todaySales} canVoid={canVoid} onVoid={setVoiding} onReceipt={setReceipt} />
            )}
          </section>
        </div>
      </div>

      {receipt && <ReceiptDialog sale={receipt} onClose={() => setReceipt(null)} />}
      {voiding && <VoidDialog sale={voiding} onClose={() => setVoiding(null)} onDone={handleVoided} />}
    </div>
  );
}