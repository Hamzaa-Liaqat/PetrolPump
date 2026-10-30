import { useState } from 'react';
import AttendanceSheet from '@/components/staff/AttendanceSheet';
import SalaryPanel from '@/components/staff/SalaryPanel';
import StaffManager from '@/components/staff/StaffManager';
import { can } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';

const TABS = [
  { key: 'attendance', label: 'Attendance', ownerOnly: false },
  { key: 'staff', label: 'Staff list', ownerOnly: true },
  { key: 'salary', label: 'Tankhwah', ownerOnly: true },
];

export default function StaffAttendance() {
  const { role } = useAuth();
  const isOwner = can(role, 'staff.manage');
  const tabs = TABS.filter((tab) => isOwner || !tab.ownerOnly);
  const [active, setActive] = useState('attendance');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-ink">Staff</h1>
        <p className="text-sm text-ink-soft">Roz ki attendance{isOwner ? ', staff ki maloomat aur tankhwah.' : '.'}</p>
      </header>

      <div role="tablist" aria-label="Staff ke hisse" className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              active === tab.key
                ? 'bg-marigold-100 text-marigold-800 ring-1 ring-marigold-400'
                : 'text-ink-soft hover:bg-sand-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300" role="tabpanel">
        {active === 'attendance' && <AttendanceSheet />}
        {active === 'staff' && isOwner && <StaffManager />}
        {active === 'salary' && isOwner && <SalaryPanel />}
      </section>
    </div>
  );
}