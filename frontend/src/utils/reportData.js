import { toNumber } from './formate';

// Chart.js ke liye data tayar karta hai (Day 16 mein istemal hoga).
export function byFuelSeries(byFuel = []) {
  return {
    labels: byFuel.map((row) => row.label),
    amounts: byFuel.map((row) => toNumber(row.amount)),
    litres: byFuel.map((row) => toNumber(row.litres)),
  };
}

export function dailySeries(daily = []) {
  return {
    labels: daily.map((point) => String(point.period).slice(5)),
    amounts: daily.map((point) => toNumber(point.amount)),
    litres: daily.map((point) => toNumber(point.litres)),
  };
}

export function profitTone(profit) {
  return toNumber(profit) >= 0 ? 'lagoon' : 'coral';
}