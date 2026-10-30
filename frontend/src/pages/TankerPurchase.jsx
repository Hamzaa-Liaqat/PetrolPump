import { useState } from 'react';
import { fetchTanks } from '@/api/inventory';
import { fetchPurchases } from '@/api/purchases';
import MetricCard from '@/components/dashboard/MetricCard';
import PurchaseForm from '@/components/purchases/PurchaseForm';
import PurchaseTable from '@/components/purchases/PurchaseTable';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { useFetch } from '@/hooks/useFetch';
import { daysAgoISO, toISODate } from '@/utils/date';
import { formatHundredths, sumHundredths } from '@/utils/decimal';
import { getErrorMessage } from '@/utils/error';
import { formatLitres, formatMoney } from '@/utils/formate';

export default function TankerPurchase() {
  const today = toISODate();
  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(today);
  const [tankFilter, setTankFilter] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const tanks = useFetch(fetchTanks, []);
  const purchases = useFetch(
    () => fetchPurchases({ date_from: from, date_to: to, tank: tankFilter || undefined }),
    [from, to, tankFilter],
  );

  const activeTanks = (tanks.data ?? []).filter((tank) => tank.is_active);
  const query = search.trim().toLowerCase();
  const rows = (purchases.data ?? []).filter(
    (purchase) =>
      !query ||
      purchase.supplier.toLowerCase().includes(query) ||
      purchase.invoice_number.toLowerCase().includes(query) ||
      purchase.tanker_number.toLowerCase().includes(query),
  );
  const receivedTotal = formatHundredths(sumHundredths(rows.map((row) => row.received_litres)));
  const costTotal = formatHundredths(sumHundredths(rows.map((row) => row.invoice_amount)));
  const rangeInvalid = from > to;

  function handleSaved(purchase) {
    setNotice(`Delivery darj ho gayi: ${purchase.invoice_number}. Tank ka stock barh gaya.`);
    purchases.reload();
    tanks.reload();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Deliveries</h1>
        <p className="text-sm text-ink-soft">Tanker aaye to yahan darj karein. Tank ka stock khud barh jata hai.</p>
      </header>

      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
          <h2 className="mb-4 text-lg font-extrabold text-ink">Nayi delivery</h2>
          {tanks.loading ? (
            <div className="flex items-center gap-3 text-ink-soft" role="status">
              <Spinner className="h-5 w-5 text-marigold-600" />
              <span className="text-sm font-semibold">Tanks aa rahe hain...</span>
            </div>
          ) : !tanks.data ? (
            <div className="space-y-3">
              <Alert tone="error">{getErrorMessage(tanks.error)}</Alert>
              <Button onClick={tanks.reload}>Dobara koshish karein</Button>
            </div>
          ) : activeTanks.length === 0 ? (
            <Alert tone="info">Pehle Tanks page par tank banayein.</Alert>
          ) : (
            <PurchaseForm tanks={activeTanks} onSaved={handleSaved} />
          )}
        </section>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Deliveries" value={String(rows.length)} tone="periwinkle" />
            <MetricCard label="Asli tel mila" value={formatLitres(receivedTotal)} tone="lagoon" />
            <MetricCard label="Kul raqam" value={formatMoney(costTotal)} tone="marigold" />
          </div>

          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextField label="Se" type="date" max={to} value={from} onChange={(event) => setFrom(event.target.value)} />
              <TextField label="Tak" type="date" max={today} value={to} onChange={(event) => setTo(event.target.value)} />
              <SelectField label="Tank" value={tankFilter} onChange={(event) => setTankFilter(event.target.value)}>
                <option value="">Sab tanks</option>
                {(tanks.data ?? []).map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </SelectField>
              <TextField label="Dhoondhein" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Supplier / invoice / tanker" />
            </div>
            {rangeInvalid && <Alert tone="warn" className="mb-3">"Se" ki tareekh "Tak" se pehle ki honi chahiye.</Alert>}
            {purchases.error && !purchases.data ? (
              <Alert tone="error">{getErrorMessage(purchases.error)}</Alert>
            ) : purchases.loading ? (
              <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
                <Spinner className="h-5 w-5 text-marigold-600" />
                <span className="text-sm font-semibold">Deliveries aa rahi hain...</span>
              </div>
            ) : (
              <PurchaseTable purchases={rows} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}