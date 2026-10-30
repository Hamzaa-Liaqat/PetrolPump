import { useState } from 'react';
import { fetchStaff } from '@/api/staff';
import StaffFormDialog from '@/components/staff/StaffFormDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { POSITION_LABELS, SHIFT_LABELS } from '@/config/staff';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import { formatMoney } from '@/utils/formate';

export default function StaffManager() {
  const staff = useFetch(fetchStaff, []);
  const [dialog, setDialog] = useState(null);
  const rows = staff.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialog({ staff: null })}>
          Naya staff
        </Button>
      </div>
      {staff.loading ? (
        <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
          <Spinner className="h-5 w-5 text-marigold-600" />
          <span className="text-sm font-semibold">Staff aa raha hai...</span>
        </div>
      ) : !staff.data ? (
        <div className="space-y-3">
          <Alert tone="error">{getErrorMessage(staff.error)}</Alert>
          <Button onClick={staff.reload}>Dobara koshish karein</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">Abhi koi staff nahi.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-3">Naam</th>
                <th className="py-2 pr-3">Kaam</th>
                <th className="py-2 pr-3">Shift</th>
                <th className="py-2 pr-3 text-right">Roz ki tankhwah</th>
                <th className="py-2 text-right">Kaam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {rows.map((member) => (
                <tr key={member.id} className={member.is_active ? '' : 'opacity-60'}>
                  <td className="py-2.5 pr-3 font-semibold text-ink">
                    {member.name}
                    {!member.is_active && (
                      <span className="ml-2 rounded-full bg-sand-200 px-2 py-0.5 text-xs font-bold text-ink-soft">Band</span>
                    )}
                    <span className="block text-xs font-normal text-ink-soft">{member.phone}</span>
                  </td>
                  <td className="py-2.5 pr-3">{POSITION_LABELS[member.position] ?? member.position}</td>
                  <td className="py-2.5 pr-3">{SHIFT_LABELS[member.shift] ?? member.shift}</td>
                  <td className="py-2.5 pr-3 text-right">{formatMoney(member.daily_rate, 2)}</td>
                  <td className="py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDialog({ staff: member })}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && (
        <StaffFormDialog
          staff={dialog.staff}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            staff.reload();
          }}
        />
      )}
    </div>
  );
}