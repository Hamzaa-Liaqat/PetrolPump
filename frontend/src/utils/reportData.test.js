import { describe, expect, it } from 'vitest';
import { byFuelSeries, dailySeries, profitTone } from './reportData';

describe('reportData', () => {
  it('byFuelSeries: labels aur numbers alag alag', () => {
    const series = byFuelSeries([
      { label: 'Petrol', amount: '800000.50', litres: 3000 },
      { label: 'Diesel', amount: 450000, litres: '2000' },
    ]);
    expect(series.labels).toEqual(['Petrol', 'Diesel']);
    expect(series.amounts).toEqual([800000.5, 450000]);
    expect(series.litres).toEqual([3000, 2000]);
  });

  it('khali ya na ho to crash nahi', () => {
    expect(byFuelSeries()).toEqual({ labels: [], amounts: [], litres: [] });
    expect(dailySeries(undefined)).toEqual({ labels: [], amounts: [], litres: [] });
  });

  it('dailySeries: tareekh ka sirf "MM-DD" hissa', () => {
    const series = dailySeries([{ period: '2026-10-05', amount: 100, litres: 1 }]);
    expect(series.labels).toEqual(['10-05']);
  });

  it('kharab values 0 ban jati hain', () => {
    expect(byFuelSeries([{ label: 'X', amount: 'abc', litres: null }]).amounts).toEqual([0]);
  });

  it('profitTone: nuqsan coral, munafa lagoon', () => {
    expect(profitTone(100)).toBe('lagoon');
    expect(profitTone(0)).toBe('lagoon');
    expect(profitTone(-1)).toBe('coral');
    expect(profitTone('-386500')).toBe('coral');
  });
});