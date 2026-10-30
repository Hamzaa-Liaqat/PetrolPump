import { formatLitres, percentOf, toNumber } from '@/utils/formate';

export default function TankBar({ tank, hideName = false }) {
  const percent = percentOf(tank.current_stock, tank.capacity);
  const isLow = tank.is_low ?? toNumber(tank.current_stock) < toNumber(tank.reorder_level);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        {hideName ? <span /> : <span className="font-semibold text-ink">{tank.name}</span>}
        <span className={isLow ? 'font-bold text-warn' : 'text-ink-soft'}>{percent}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-sand-200"
        role="progressbar"
        aria-label={`${tank.name} ka stock`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full ${isLow ? 'bg-warn' : 'bg-lagoon-500'}`}
        />
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {formatLitres(tank.current_stock)} / {formatLitres(tank.capacity)}
      </p>
    </div>
  );
}