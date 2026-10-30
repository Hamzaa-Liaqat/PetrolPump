import { useState } from 'react';
import { fetchTanks } from '@/api/inventory';
import { fetchNozzles } from '@/api/sales';
import NozzleFormDialog from '@/components/inventory/NozzleFormDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { FUEL_CHIP, FUEL_LABELS } from '@/config/fuel';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import { formatMoney } from '@/utils/formate';

// Tanks page par: sab nozzles dikhte hain, owner naya nozzle bana aur badal sakta hai.
export default function NozzleSection() {
  const { role } = useAuth();
  const canEdit = can(role, 'nozzle.manage');
  const nozzles = useFetch(fetchNozzles, []);
  const tanks = useFetch(fetchTanks, []);
  const [dialog, setDialog] = useState(null);
  const activeTanks = (tanks.data ?? []).filter((tank) => tank.is_active);
  const rows = nozzles.data ?? [];

  function finish() {
    setDialog(null);
    nozzles.reload();
  }

  return (
    <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300" aria-label="Nozzles">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Nozzles</h2>
          <p className="text-xs text-ink-soft">Billing mein sirf chalu nozzles nazar aate hain.</p>
        </div>
        {canEdit && (
          <Button size="sm" disabled={activeTanks.length === 0} onClick={() => setDialog({ nozzle: null })}>
            Naya nozzle
          </Button>
        )}
      </div>

      {canEdit && activeTanks.length === 0 && <Alert tone="info" className="mb-4">Nozzle banane se pehle ek chalu tank banayein.</Alert>}

      {nozzles.loading ? (
        <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
          <Spinner className="h-5 w-5 text-marigold-600" />
          <span className="text-sm font-semibold">Nozzles aa rahe hain...</span>
        </div>
      ) : !nozzles.data ? (
        <div className="space-y-3">
          <Alert tone="error">{getErrorMessage(nozzles.error)}</Alert>
          <Button onClick={nozzles.reload}>Dobara koshish karein</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">
          Abhi koi nozzle nahi. {canEdit ? '"Naya nozzle" se banayein (pehle tank aur us fuel ka rate chahiye).' : 'Owner se nozzle banwayein.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-3">Nozzle</th>
                <th className="py-2 pr-3">Fuel</th>
                <th className="py-2 pr-3">Tank</th>
                <th className="py-2 pr-3 text-right">Meter</th>
                <th className="py-2 pr-3 text-right">Rate</th>
                <th className="py-2 pr-3">Haalat</th>
                {canEdit && <th className="py-2 text-right">Kaam</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {rows.map((nozzle) => (
                <tr key={nozzle.id} className={nozzle.is_active ? '' : 'opacity-60'}>
                  <td className="py-2.5 pr-3 font-semibold text-ink">{nozzle.name}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${FUEL_CHIP[nozzle.fuel_type] ?? ''}`}>
                      {FUEL_LABELS[nozzle.fuel_type] ?? nozzle.fuel_type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">{nozzle.tank_name}</td>
                  <td className="py-2.5 pr-3 text-right">{nozzle.last_reading}</td>
                  <td className="py-2.5 pr-3 text-right">
                    {nozzle.current_rate === null || nozzle.current_rate === undefined ? (
                      <span className="font-semibold text-coral-800">Rate set nahi</span>
                    ) : (
                      formatMoney(nozzle.current_rate, 2)
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {nozzle.is_active ? (
                      <span className="rounded-full bg-lagoon-100 px-2 py-0.5 text-xs font-bold text-lagoon-800">Chalu</span>
                    ) : (
                      <span className="rounded-full bg-sand-200 px-2 py-0.5 text-xs font-bold text-ink-soft">Band</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ nozzle })}>
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && <NozzleFormDialog nozzle={dialog.nozzle} tanks={activeTanks} onClose={() => setDialog(null)} onSaved={finish} />}
    </section>
  );
}