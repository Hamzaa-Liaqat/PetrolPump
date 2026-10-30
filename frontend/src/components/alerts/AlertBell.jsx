import { useEffect, useRef, useState } from 'react';
import AlertsPanel from '@/components/alerts/AlertsPanel';
import { UseAlerts } from '@/hooks/UseAlerts';

export default function AlertBell() {
  const { alerts, count } = UseAlerts();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onClick = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Alerts (${count})`}
        className="relative grid h-9 w-9 place-items-center rounded-xl text-ink hover:bg-sand-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 19a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-coral-500 px-1 text-[0.65rem] font-extrabold text-ink">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="region"
          aria-label="Alerts"
          className="absolute right-0 z-40 mt-2 max-h-[70vh] w-80 max-w-[90vw] overflow-auto rounded-3xl bg-card p-3 shadow-xl ring-1 ring-sand-300"
        >
          <AlertsPanel alerts={alerts} limit={8} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}