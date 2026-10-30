import Button from '@/components/ui/Button';
import { FUEL_CHIP, FUEL_LABELS } from '@/config/fuel';
import { formatLitres } from '@/utils/formate';
import TankBar from './TankBar';

export default function TankCard({ tank, canEdit, canReconcile, onEdit, onReconcile }) {
  return (
    <article className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-sand-300">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-ink">{tank.name}</h3>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${FUEL_CHIP[tank.fuel_type] ?? ''}`}>
            {FUEL_LABELS[tank.fuel_type] ?? tank.fuel_type}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {tank.is_low && (
            <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-bold text-warn">Kam stock</span>
          )}
          {!tank.is_active && (
            <span className="rounded-full bg-sand-200 px-2.5 py-0.5 text-xs font-bold text-ink-soft">Band</span>
          )}
        </div>
      </header>

      <div className="mt-4">
        <TankBar tank={tank} hideName />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-sand-100 px-3 py-2">
          <dt className="text-ink-soft">Khali jagah</dt>
          <dd className="font-bold text-ink">{formatLitres(tank.available_space)}</dd>
        </div>
        <div className="rounded-xl bg-sand-100 px-3 py-2">
          <dt className="text-ink-soft">Reorder level</dt>
          <dd className="font-bold text-ink">{formatLitres(tank.reorder_level)}</dd>
        </div>
      </dl>

      {(canEdit || canReconcile) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canReconcile && (
            <Button variant="soft" size="sm" onClick={() => onReconcile(tank)}>
              Dip check
            </Button>
          )}
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(tank)}>
              Edit
            </Button>
          )}
        </div>
      )}
    </article>
  );
}