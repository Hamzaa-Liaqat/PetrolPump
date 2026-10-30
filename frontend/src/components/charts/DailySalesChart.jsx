import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { chartSummary, dailyBarData, moneyChartOptions } from '@/utils/charts';
import { dailySeries } from '@/utils/reportData';
import './chartSetup';
import EmptyChart from './EmptyChart';

export default function DailySalesChart({ daily }) {
  const options = useMemo(() => moneyChartOptions(), []);
  const hasSales = (daily ?? []).some((point) => Number(point.amount) > 0);
  if (!hasSales) return <EmptyChart text="Is mahine koi sale nahi." />;
  const series = dailySeries(daily);
  return (
    <div className="h-64" role="img" aria-label={`Roz ki sales. ${chartSummary(series.labels, series.amounts)}`}>
      <Bar data={dailyBarData(daily)} options={options} />
    </div>
  );
}