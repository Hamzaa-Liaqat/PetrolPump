import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { chartSummary, moneyChartOptions, profitLineData } from '@/utils/charts';
import './chartSetup';
import EmptyChart from './EmptyChart';

export default function ProfitTrendChart({ months }) {
  const options = useMemo(() => {
    const base = moneyChartOptions();
    base.scales.y.beginAtZero = false;
    return base;
  }, []);
  if (!months || months.length === 0) return <EmptyChart text="Abhi koi hisaab nahi." />;
  const data = profitLineData(months);
  return (
    <div className="h-64" role="img" aria-label={`Mahine ke hisaab se munafa. ${chartSummary(data.labels, data.datasets[0].data)}`}>
      <Line data={data} options={options} />
    </div>
  );
}