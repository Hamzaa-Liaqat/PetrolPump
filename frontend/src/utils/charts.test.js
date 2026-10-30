import { describe, expect, it } from 'vitest';
import { CHART_COLORS } from '../config/chartColors';
import { chartSummary, compactMoney, dailyBarData, fuelBarData, moneyChartOptions, profitLineData } from './charts';

describe('compactMoney (lakh / crore)', () => {
  it('chhote, hazar, lakh, crore', () => {
    expect(compactMoney(0)).toBe('0');
    expect(compactMoney(950)).toBe('950');
    expect(compactMoney(1500)).toBe('1.5K');
    expect(compactMoney(25000)).toBe('25K');
    expect(compactMoney(250000)).toBe('2.5L');
    expect(compactMoney(1000000)).toBe('10L');
    expect(compactMoney(30000000)).toBe('3Cr');
  });
  it('minus aur kharab values', () => {
    expect(compactMoney(-150000)).toBe('-1.5L');
    expect(compactMoney('abc')).toBe('0');
    expect(compactMoney(null)).toBe('0');
  });
});

describe('fuelBarData', () => {
  it('har fuel ka apna rang, numbers sahi', () => {
    const data = fuelBarData([
      { fuel_type: 'petrol', label: 'Petrol', amount: '800000.50' },
      { fuel_type: 'diesel', label: 'Diesel', amount: 450000 },
      { fuel_type: 'koi_aur', label: 'Aur', amount: 1 },
    ]);
    expect(data.labels).toEqual(['Petrol', 'Diesel', 'Aur']);
    expect(data.datasets[0].data).toEqual([800000.5, 450000, 1]);
    expect(data.datasets[0].backgroundColor).toEqual([CHART_COLORS.marigold, CHART_COLORS.amber, CHART_COLORS.periwinkle]);
  });
  it('khali list par crash nahi', () => {
    expect(fuelBarData().labels).toEqual([]);
    expect(fuelBarData([]).datasets[0].data).toEqual([]);
  });
});

describe('dailyBarData / profitLineData', () => {
  it('daily: MM-DD labels aur amounts', () => {
    const data = dailyBarData([{ period: '2026-10-05', amount: 100, litres: 1 }, { period: '2026-10-06', amount: '250.5', litres: 2 }]);
    expect(data.labels).toEqual(['10-05', '10-06']);
    expect(data.datasets[0].data).toEqual([100, 250.5]);
  });
  it('profit: nuqsan wale point coral, munafa wale lagoon', () => {
    const data = profitLineData([{ period: '2026-01', profit: 500 }, { period: '2026-02', profit: -20 }, { period: '2026-03', profit: 0 }]);
    expect(data.datasets[0].data).toEqual([500, -20, 0]);
    expect(data.datasets[0].pointBackgroundColor).toEqual([CHART_COLORS.lagoon, CHART_COLORS.coral, CHART_COLORS.lagoon]);
  });
});

describe('moneyChartOptions / chartSummary', () => {
  it('tooltip aur y-axis lakh wali shakl mein', () => {
    const options = moneyChartOptions();
    expect(options.plugins.tooltip.callbacks.label({ parsed: { y: 1234567 } })).toBe(' Rs 12,34,567');
    expect(options.scales.y.ticks.callback(250000)).toBe('2.5L');
    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
  });
  it('chartSummary (screen reader ke liye)', () => {
    expect(chartSummary(['Petrol', 'Diesel'], [1000, 2500])).toBe('Petrol: Rs 1,000, Diesel: Rs 2,500');
    expect(chartSummary([], [])).toBe('');
  });
});