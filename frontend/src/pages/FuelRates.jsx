import { useState } from 'react';
import { fetchCurrentRates, fetchRates } from '@/api/rates';
import RateForm from '@/components/rates/RateForm';
import RateHistory from '@/components/rates/RateHistory';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import { FUEL_CHIP, FUEL_LABELS, FUEL_TYPES } from '@/config/fuel';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import { formatMoney } from '@/utils/formate';
import { priceChange } from '@/utils/rates';

export default function FuelRates() {
  const { role } = useAuth();
  const canCreate = can(role, 'rate.create');
  const current = useFetch(fetchCurrentRates, []);
  const history = useFetch(fetchRates, []);
  const [fuelFilter, setFuelFilter] = useState('');
  const [notice, setNotice] = useState('');

  const rows = (history.data ?? []).filter((rate) => !fuelFilter || rate.fuel_type === fuelFilter);

  function handleSaved(fuelType) {
    setNotice(`${FUEL_LABELS[fuelType] ?? fuelType} ka naya rate lag gaya.`);
    current.reload();
    history.reload();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Fuel rates</h1>
        <p className="text-sm text-ink-soft">
          Har sale aur udhaar isi rate se banta hai. Naya rate lagane se purani sales nahi badalti.
        </p>
      </header>

      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Maujooda rates">
        {current.loading ? (
          <div className="flex items-center gap-3 text-ink-soft sm:col-span-3" role="status">
            <Spinner className="h-5 w-5 text-marigold-600" />
            <span className="text-sm font-semibold">Rates aa rahe hain...</span>
          </div>
        ) : !current.data ? (
          <div className="space-y-3 sm:col-span-3">
            <Alert tone="error">{getErrorMessage(current.error)}</Alert>
            <Button onClick={current.reload}>Dobara koshish karein</Button>
          </div>
        ) : (
          FUEL_TYPES.map((type) => {
            const item = current.data.find((entry) => entry.fuel_type === type);
            const rate = item?.rate;
            const change = priceChange(history.data ?? [], type);
            return (
              <article key={type} className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-sand-300">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${FUEL_CHIP[type]}`}>{FUEL_LABELS[type]}</span>
                {rate === null || rate === undefined ? (
                  <p className="mt-3 text-lg font-extrabold text-coral-800">Rate set nahi</p>
                ) : (
                  <p className="mt-3 text-2xl font-extrabold text-ink">{formatMoney(rate, 2)}</p>
                )}
                {change && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Pichla {formatMoney(change.from, 2)} ({change.same ? 'koi farq nahi' : `${change.up ? '+' : ''}${change.diff}`})
                  </p>
                )}
              </article>
            );
          })
        )}
      </section>

      <div className={canCreate ? 'grid gap-6 lg:grid-cols-[22rem_1fr]' : ''}>
        {canCreate ? (
          <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
            <h2 className="mb-4 text-lg font-extrabold text-ink">Naya rate</h2>
            <RateForm onSaved={handleSaved} />
          </section>
        ) : (
          <Alert tone="info">Naya rate sirf owner laga sakta hai.</Alert>
        )}

        <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-extrabold text-ink">Rate ki history</h2>
            <SelectField label="Fuel" value={fuelFilter} onChange={(event) => setFuelFilter(event.target.value)} className="w-44">
              <option value="">Sab</option>
              {FUEL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FUEL_LABELS[type]}
                </option>
              ))}
            </SelectField>
          </div>
          {history.loading ? (
            <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
              <Spinner className="h-5 w-5 text-marigold-600" />
              <span className="text-sm font-semibold">History aa rahi hai...</span>
            </div>
          ) : !history.data ? (
            <Alert tone="error">{getErrorMessage(history.error)}</Alert>
          ) : (
            <RateHistory rates={rows} />
          )}
        </section>
      </div>
    </div>
  );
}