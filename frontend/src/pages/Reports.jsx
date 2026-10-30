import { useState } from 'react';
import { fetchReportSummary } from '@/api/report';
import DailySalesChart from '@/components/charts/DailySalesChart';
import FuelBarChart from '@/components/charts/FuelBarChart';
import MetricCard from '@/components/dashboard/MetricCard';
import YearlyProfit from '@/components/reports/YearlyProfit';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import ExportButtons from '@/components/reports/ExportButtons';
import { FUEL_CHIP } from '@/config/fuel';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import { formatLitres, formatMoney, toNumber } from '@/utils/formate';
import { monthOptions } from '@/utils/periods';
import { profitTone } from '@/utils/reportData';

const OPTIONS = monthOptions(12);
const moneyOrDash = (value) => (value === null || value === undefined ? '-' : formatMoney(value, 2));

function Section({ title, children }) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
      <h2 className="mb-4 text-lg font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function Reports() {
  const [value, setValue] = useState(OPTIONS[0].value);
  const [showYear, setShowYear] = useState(false);
  const period = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];
  const report = useFetch(() => fetchReportSummary({ year: period.year, month: period.month }), [value]);
  const data = report.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Reports</h1>
          <p className="text-sm text-ink-soft">Mahine ka poora hisaab: sales, kharid, kharche, tankhwah aur munafa.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField label="Mahina" value={value} onChange={(event) => setValue(event.target.value)} className="w-56">
            {OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
           <ExportButtons year={period.year} month={period.month} />
        </div>
      </header>

      {report.loading ? (
        <div className="flex items-center gap-3 py-10 text-ink-soft" role="status">
          <Spinner className="h-6 w-6 text-marigold-600" />
          <span className="font-semibold">Report aa rahi hai...</span>
        </div>
      ) : !data ? (
        <div className="max-w-md space-y-3">
          <Alert tone="error">{getErrorMessage(report.error)}</Alert>
          <Button onClick={report.reload}>Dobara koshish karein</Button>
        </div>
      ) : (
        <>
          {report.error && <Alert tone="warn">Taza data nahi mil saka. Purana data dikh raha hai.</Alert>}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Mahine ka khulasa">
            <MetricCard label="Sales" value={formatMoney(data.totals.sales)} hint={`${formatLitres(data.totals.litres)} bika`} tone="marigold" />
            <MetricCard label="Fuel ki kharid" value={formatMoney(data.totals.purchases)} tone="periwinkle" />
            <MetricCard label="Kharche" value={formatMoney(data.totals.expenses)} tone="coral" />
            <MetricCard
              label="Tankhwah"
              value={formatMoney(data.totals.salaries)}
              hint={data.totals.salaries_is_estimate ? 'Andaza (payslip abhi nahi bani)' : 'Payslip ke mutabiq'}
              tone="periwinkle"
            />
            <MetricCard label="Munafa" value={formatMoney(data.totals.profit)} hint="Sales - kharid - kharche - tankhwah" tone={profitTone(data.totals.profit)} />
          </section>

          <Alert tone="info">
            Is mahine ka bacha hua tel bhi "kharid" mein ginta hai, is liye bare tanker wale mahine munafa kam dikh sakta
            hai. Asal faida dekhne ke liye neeche "Margin / litre" dekhein.
          </Alert>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Fuel ke hisaab se sales">
              <FuelBarChart byFuel={data.by_fuel} />
            </Section>
            <Section title="Roz ki sales">
              <DailySalesChart daily={data.daily} />
            </Section>
          </div>

          <Section title="Fuel ka hisaab">
            {data.by_fuel.length === 0 ? (
              <p className="text-sm text-ink-soft">Is mahine koi sale nahi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-left text-sm">
                  <thead>
                    <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      <th className="py-2 pr-3">Fuel</th>
                      <th className="py-2 pr-3 text-right">Litres</th>
                      <th className="py-2 pr-3 text-right">Sales</th>
                      <th className="py-2 pr-3 text-right">Ausat rate</th>
                      <th className="py-2 pr-3 text-right">Kharid / litre</th>
                      <th className="py-2 text-right">Margin / litre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-200">
                    {data.by_fuel.map((row) => (
                      <tr key={row.fuel_type}>
                        <td className="py-2.5 pr-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${FUEL_CHIP[row.fuel_type] ?? ''}`}>{row.label}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-right">{formatLitres(row.litres)}</td>
                        <td className="py-2.5 pr-3 text-right font-bold text-ink">{formatMoney(row.amount)}</td>
                        <td className="py-2.5 pr-3 text-right">{moneyOrDash(row.avg_rate)}</td>
                        <td className="py-2.5 pr-3 text-right">{moneyOrDash(row.cost_per_litre)}</td>
                        <td className={`py-2.5 text-right font-bold ${toNumber(row.margin_per_litre) < 0 ? 'text-coral-800' : 'text-lagoon-700'}`}>
                          {moneyOrDash(row.margin_per_litre)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Nozzle ke hisaab se">
              {data.by_nozzle.length === 0 ? (
                <p className="text-sm text-ink-soft">Is mahine koi sale nahi.</p>
              ) : (
                <ul className="divide-y divide-sand-200">
                  {data.by_nozzle.map((row) => (
                    <li key={row.nozzle} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold text-ink">{row.name}</span>
                      <span className="text-ink-soft">
                        {formatLitres(row.litres)} · {formatMoney(row.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Kharche (qisam ke hisaab se)">
              {data.expenses.by_category.length === 0 ? (
                <p className="text-sm text-ink-soft">Is mahine koi kharcha nahi.</p>
              ) : (
                <ul className="divide-y divide-sand-200">
                  {data.expenses.by_category.map((row) => (
                    <li key={row.category} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold text-ink">{row.label}</span>
                      <span className="text-coral-800">{formatMoney(row.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Tanker deliveries">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-ink-soft">Deliveries</dt><dd className="font-bold text-ink">{data.purchases.count}</dd></div>
                <div><dt className="text-ink-soft">Raqam</dt><dd className="font-bold text-ink">{formatMoney(data.purchases.cost)}</dd></div>
                <div><dt className="text-ink-soft">Invoice ke litres</dt><dd className="font-bold text-ink">{formatLitres(data.purchases.litres_invoiced)}</dd></div>
                <div><dt className="text-ink-soft">Asli tel mila</dt><dd className="font-bold text-ink">{formatLitres(data.purchases.litres_received)}</dd></div>
                <div className="col-span-2">
                  <dt className="text-ink-soft">Kami</dt>
                  <dd className={`font-bold ${toNumber(data.purchases.shortage_litres) > 0 ? 'text-warn' : 'text-ink'}`}>
                    {formatLitres(data.purchases.shortage_litres)}
                  </dd>
                </div>
              </dl>
            </Section>

            <Section title="Udhaar">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-ink-soft">Is mahine ka udhaar</dt><dd className="font-bold text-ink">{formatMoney(data.credit.credit_sales)}</dd></div>
                <div><dt className="text-ink-soft">Is mahine ki payments</dt><dd className="font-bold text-ink">{formatMoney(data.credit.credit_payments)}</dd></div>
                <div className="col-span-2">
                  <dt className="text-ink-soft">Abhi kul udhaar baqi</dt>
                  <dd className="font-bold text-coral-800">{formatMoney(data.credit.outstanding_now)}</dd>
                </div>
              </dl>
            </Section>
          </div>

          <Section title={`Saal ${period.year} ka hisaab`}>
            {showYear ? (
              <YearlyProfit year={period.year} />
            ) : (
              <Button variant="soft" onClick={() => setShowYear(true)}>
                Saal ka hisaab dikhayein
              </Button>
            )}
          </Section>
        </>
      )}
    </div>
  );
}