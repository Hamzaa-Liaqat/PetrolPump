import { CHART_COLORS, colorForFuel } from '../config/chartColors';
import { formatMoney, toNumber } from './formate';
import { dailySeries } from './reportData';

// 1500 -> "1.5K", 250000 -> "2.5L" (lakh), 30000000 -> "3Cr" (crore)
export function compactMoney(value) {
  const number = toNumber(value);
  const abs = Math.abs(number);
  const trim = (n) => n.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1e7) return `${trim(number / 1e7)}Cr`;
  if (abs >= 1e5) return `${trim(number / 1e5)}L`;
  if (abs >= 1e3) return `${trim(number / 1e3)}K`;
  return String(Math.round(number));
}

export function fuelBarData(byFuel = []) {
  return {
    labels: byFuel.map((row) => row.label),
    datasets: [
      {
        label: 'Sales (Rs)',
        data: byFuel.map((row) => toNumber(row.amount)),
        backgroundColor: byFuel.map((row) => colorForFuel(row.fuel_type)),
        borderRadius: 10,
        maxBarThickness: 56,
      },
    ],
  };
}

export function dailyBarData(daily = []) {
  const series = dailySeries(daily);
  return {
    labels: series.labels,
    datasets: [
      {
        label: 'Sales (Rs)',
        data: series.amounts,
        backgroundColor: CHART_COLORS.marigoldSoft,
        hoverBackgroundColor: CHART_COLORS.marigold,
        borderRadius: 6,
      },
    ],
  };
}

export function profitLineData(months = []) {
  const profits = months.map((month) => toNumber(month.profit));
  return {
    labels: months.map((month) => month.period),
    datasets: [
      {
        label: 'Munafa (Rs)',
        data: profits,
        borderColor: CHART_COLORS.lagoon,
        backgroundColor: `${CHART_COLORS.lagoon}33`,
        pointBackgroundColor: profits.map((value) => (value >= 0 ? CHART_COLORS.lagoon : CHART_COLORS.coral)),
        fill: true,
        tension: 0.3,
      },
    ],
  };
}

export function moneyChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => ` ${formatMoney(context.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: CHART_COLORS.inkSoft } },
      y: {
        beginAtZero: true,
        grid: { color: CHART_COLORS.grid },
        ticks: { color: CHART_COLORS.inkSoft, callback: (value) => compactMoney(value) },
      },
    },
  };
}

export function chartSummary(labels, values) {
  return labels.map((label, index) => `${label}: ${formatMoney(values[index])}`).join(', ');
}