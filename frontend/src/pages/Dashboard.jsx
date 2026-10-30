import { Link } from 'react-router';
import { fetchDashboard } from '@/api/dashboard';
import MetricCard from '@/components/dashboard/MetricCard';
import TankBar from '@/components/inventory/TankBar';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import AlertsPanel from '@/components/alerts/AlertsPanel';
import { UseAlerts } from '@/hooks/UseAlerts';
import { formatLitres, formatMoney } from '@/utils/formate';

const STAFF_LABELS = [
  ['present', 'Present'],
  ['half_day', 'Aadha din'],
  ['absent', 'Absent'],
  ['unmarked', 'Baqi'],
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(fetchDashboard, [], 60000);
    const alertState = UseAlerts();
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || user?.username;

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-10 text-ink-soft" role="status">
        <Spinner className="h-6 w-6 text-marigold-600" />
        <span className="font-semibold">Dashboard load ho raha hai...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-extrabold text-ink">Dashboard</h1>
        <Alert tone="error">{getErrorMessage(error)}</Alert>
        <Button onClick={reload}>Dobara koshish karein</Button>
      </div>
    );
  }

  const lowTanks = data.low_stock_tanks ?? [];
  const debtors = data.credit?.top_debtors ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft">
            {name}, {data.date} ka hisaab
          </p>
        </div>
        <Button variant="soft" size="sm" onClick={reload}>
          Taza karein
        </Button>
      </header>

      {error && (
        <Alert tone="warn">Taza data nahi mil saka ({getErrorMessage(error)}). Purana data dikh raha hai.</Alert>
      )}
      {lowTanks.length > 0 && (
        <Alert tone="warn">Kam stock: {lowTanks.map((tank) => tank.name).join(', ')}</Alert>
      )}
      {alertState.alerts.length > 0 && (
        <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300" aria-label="Alerts">
          <h2 className="mb-3 text-lg font-extrabold text-ink">Alerts</h2>
          <AlertsPanel alerts={alertState.alerts} limit={5} />
        </section>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Aaj ke numbers">
        <MetricCard
          label="Aaj ki sales"
          value={formatMoney(data.today_sales)}
          hint={`${data.sale_entries} entries`}
          tone="marigold"
        />
        <MetricCard label="Litres bika" value={formatLitres(data.litres_sold)} tone="lagoon" />
        <MetricCard
          label="Cash collected"
          value={formatMoney(data.cash_collected)}
          hint="Sales - udhaar + payments"
          tone="periwinkle"
        />
        <MetricCard
          label="Udhaar baqi"
          value={formatMoney(data.credit_due_total)}
          hint={`Aaj ka udhaar ${formatMoney(data.credit_sales_today)}`}
          tone="coral"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-ink">Tanks ka stock</h2>
            <Link to="/tanks" className="text-sm font-semibold text-lagoon-700 underline">
              Sab tanks
            </Link>
          </div>
          {data.tanks.length === 0 ? (
            <p className="text-sm text-ink-soft">Abhi koi tank nahi.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {data.tanks.map((tank) => (
                <TankBar key={tank.id ?? tank.name} tank={tank} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
            <h2 className="text-lg font-extrabold text-ink">Fuel ke hisaab se aaj</h2>
            {data.by_fuel_today.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Aaj abhi koi sale nahi.</p>
            ) : (
              <ul className="mt-3 divide-y divide-sand-200">
                {data.by_fuel_today.map((row) => (
                  <li key={row.fuel_type} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold text-ink">{row.label}</span>
                    <span className="text-ink-soft">
                      {formatLitres(row.litres)} · {formatMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
            <h2 className="text-lg font-extrabold text-ink">Staff aaj</h2>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {STAFF_LABELS.map(([key, label]) => (
                <div key={key} className="rounded-xl bg-sand-100 py-2">
                  <dd className="text-lg font-extrabold text-ink">{data.staff_today?.[key] ?? 0}</dd>
                  <dt className="text-xs text-ink-soft">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Sab se zyada udhaar</h2>
              <Link to="/credit" className="text-sm font-semibold text-lagoon-700 underline">
                Credit
              </Link>
            </div>
            {debtors.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Koi udhaar baqi nahi.</p>
            ) : (
              <ul className="mt-3 divide-y divide-sand-200">
                {debtors.map((debtor) => (
                  <li key={debtor.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold text-ink">{debtor.name}</span>
                    <span className="text-coral-800">{formatMoney(debtor.balance)}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.alerts_count > 0 && (
              <p className="mt-3 text-xs font-semibold text-warn">{data.alerts_count} alerts ka dhyan dein</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}