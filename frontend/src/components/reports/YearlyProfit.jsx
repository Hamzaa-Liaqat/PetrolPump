import { fetchProfitLoss } from '@/api/report';
import ProfitTrendChart from '@/components/charts/ProfitTrendCharts';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import { formatMoney, toNumber } from '@/utils/formate';

const COLUMNS = [
  ['sales', 'Sales'],
  ['purchases', 'Kharid'],
  ['expenses', 'Kharche'],
  ['salaries', 'Tankhwah'],
  ['profit', 'Munafa'],
];

export default function YearlyProfit({ year }) {
  const result = useFetch(() => fetchProfitLoss({ year }), [year]);

  if (result.loading) {
    return (
      <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
        <Spinner className="h-5 w-5 text-marigold-600" />
        <span className="text-sm font-semibold">Saal ka hisaab aa raha hai...</span>
      </div>
    );
  }
  if (!result.data) {
    return (
      <div className="space-y-3">
        <Alert tone="error">{getErrorMessage(result.error)}</Alert>
        <Button onClick={result.reload}>Dobara koshish karein</Button>
      </div>
    );
  }

  const { months, year_totals: totals } = result.data;
  return (
    <div className="space-y-4">
      <ProfitTrendChart months={months} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead>
            <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
              <th className="py-2 pr-3">Mahina</th>
              {COLUMNS.map(([key, label]) => (
                <th key={key} className="py-2 pr-3 text-right">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {months.map((month) => (
              <tr key={month.period}>
                <td className="py-2 pr-3 font-semibold text-ink">{month.period}</td>
                {COLUMNS.map(([key]) => (
                  <td
                    key={key}
                    className={`py-2 pr-3 text-right ${key === 'profit' ? (toNumber(month.profit) < 0 ? 'font-bold text-coral-800' : 'font-bold text-lagoon-700') : ''}`}
                  >
                    {formatMoney(month[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-sand-300 font-extrabold text-ink">
              <td className="py-2 pr-3">Saal ka kul</td>
              {COLUMNS.map(([key]) => (
                <td key={key} className="py-2 pr-3 text-right">{formatMoney(totals[key])}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}