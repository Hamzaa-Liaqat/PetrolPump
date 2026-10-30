import { useState } from 'react';
import { fetchStockMovements, fetchTanks } from '@/api/inventory';
import ReconcileDialog from '@/components/inventory/ReconcileDialog';
import TankCard from '@/components/inventory/TankCard';
import TankFormDialog from '@/components/inventory/TankFormDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import NozzleSection from '@/components/inventory/NozzleSection';
import { formatDateTime, formatLitres, toNumber } from '@/utils/formate';

const PAGE_SIZE = 10;

export default function Inventory() {
  const { role } = useAuth();
  const canEdit = can(role, 'tank.edit');
  const canReconcile = can(role, 'tank.reconcile');

  const tanks = useFetch(fetchTanks, [], 30000);
  const [ledgerTank, setLedgerTank] = useState('');
  const [page, setPage] = useState(1);
  const ledger = useFetch(
    () => fetchStockMovements({ tank: ledgerTank || undefined, page, page_size: PAGE_SIZE }),
    [ledgerTank, page],
  );
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [reconciling, setReconciling] = useState(null);

  const tankList = tanks.data ?? [];
  const movements = ledger.data?.results ?? [];
  const totalPages = Math.max(1, Math.ceil((ledger.data?.count ?? 0) / PAGE_SIZE));

  function refreshAll() {
    tanks.reload();
    ledger.reload();
  }

  function chooseLedgerTank(event) {
    setLedgerTank(event.target.value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
            <NozzleSection />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Tanks</h1>
          <p className="text-sm text-ink-soft">Har tank ka asli stock. Delivery se barhta hai, sale se ghatta hai.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" size="sm" onClick={refreshAll}>
            Taza karein
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => setCreating(true)}>
              Naya tank
            </Button>
          )}
        </div>
      </header>

      {tanks.loading ? (
        <div className="flex items-center gap-3 py-6 text-ink-soft" role="status">
          <Spinner className="h-6 w-6 text-marigold-600" />
          <span className="font-semibold">Tanks aa rahe hain...</span>
        </div>
      ) : !tanks.data ? (
        <div className="max-w-md space-y-3">
          <Alert tone="error">{getErrorMessage(tanks.error)}</Alert>
          <Button onClick={tanks.reload}>Dobara koshish karein</Button>
        </div>
      ) : tankList.length === 0 ? (
        <Alert tone="info">Abhi koi tank nahi. {canEdit ? '"Naya tank" se pehla tank banayein.' : 'Owner se tank banwayein.'}</Alert>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tanks">
          {tankList.map((tank) => (
            <TankCard
              key={tank.id}
              tank={tank}
              canEdit={canEdit}
              canReconcile={canReconcile && tank.is_active}
              onEdit={setEditing}
              onReconcile={setReconciling}
            />
          ))}
        </section>
      )}

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink">Stock ka hisaab (ledger)</h2>
          <SelectField label="Tank" value={ledgerTank} onChange={chooseLedgerTank} className="w-48">
            <option value="">Sab tanks</option>
            {tankList.map((tank) => (
              <option key={tank.id} value={tank.id}>
                {tank.name}
              </option>
            ))}
          </SelectField>
        </div>

        {ledger.error && !ledger.data ? (
          <Alert tone="error">{getErrorMessage(ledger.error)}</Alert>
        ) : movements.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Abhi koi entry nahi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-3">Waqt</th>
                  <th className="py-2 pr-3">Tank</th>
                  <th className="py-2 pr-3">Qisam</th>
                  <th className="py-2 pr-3 text-right">Tabdeeli</th>
                  <th className="py-2 pr-3 text-right">Baad ka stock</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {movements.map((move) => {
                  const change = toNumber(move.litres_change);
                  return (
                    <tr key={move.id}>
                      <td className="py-2.5 pr-3 text-ink-soft">{formatDateTime(move.created_at)}</td>
                      <td className="py-2.5 pr-3 font-semibold text-ink">{move.tank_name}</td>
                      <td className="py-2.5 pr-3">{move.movement_label}</td>
                      <td className={`py-2.5 pr-3 text-right font-bold ${change >= 0 ? 'text-lagoon-700' : 'text-coral-800'}`}>
                        {change >= 0 ? '+' : ''}
                        {formatLitres(change)}
                      </td>
                      <td className="py-2.5 pr-3 text-right">{formatLitres(move.balance_after)}</td>
                      <td className="py-2.5 text-ink-soft">{move.note || move.reference || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span>
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={!ledger.data?.previous} onClick={() => setPage((value) => value - 1)}>
              Pichla
            </Button>
            <Button variant="ghost" size="sm" disabled={!ledger.data?.next} onClick={() => setPage((value) => value + 1)}>
              Agla
            </Button>
          </div>
        </div>
      </section>

      {(creating || editing) && (
        <TankFormDialog
          tank={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refreshAll();
          }}
        />
      )}
      {reconciling && (
        <ReconcileDialog
          tank={reconciling}
          onClose={() => setReconciling(null)}
          onDone={() => {
            setReconciling(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}