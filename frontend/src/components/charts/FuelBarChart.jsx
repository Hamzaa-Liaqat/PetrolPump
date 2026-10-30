import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { chartSummary, fuelBarData, moneyChartOptions } from '@/utils/charts';
import { byFuelSeries } from '@/utils/reportData';
import './chartSetup';
import EmptyChart from './EmptyChart';

export default function FuelBarChart({ byFuel }) {
  const options = useMemo(() => moneyChartOptions(), []);
  if (!byFuel || byFuel.length === 0) return <EmptyChart text="Is mahine koi sale nahi." />;
  const series = byFuelSeries(byFuel);
  return (
    <div className="h-64" role="img" aria-label={`Fuel ke hisaab se sales. ${chartSummary(series.labels, series.amounts)}`}>
      <Bar data={fuelBarData(byFuel)} options={options} />
    </div>
  );
}