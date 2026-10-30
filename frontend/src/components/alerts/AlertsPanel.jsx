import { Link } from 'react-router';
import { ALERT_LINKS, SEVERITY_STYLE } from '@/config/alerts';

export default function AlertsPanel({ alerts, limit, onNavigate }) {
  const shown = limit ? alerts.slice(0, limit) : alerts;
  if (shown.length === 0) {
    return <p className="py-4 text-center text-sm text-ink-soft">Koi alert nahi. Sab theek hai.</p>;
  }
  return (
    <ul className="space-y-2">
      {shown.map((alert, index) => {
        const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info;
        const target = ALERT_LINKS[alert.type];
        return (
          <li key={`${alert.type}-${index}`} className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${style.box}`}>
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{alert.title}</p>
              <p className="text-xs">{alert.message}</p>
            </div>
            {target && (
              <Link to={target} onClick={onNavigate} className="shrink-0 text-xs font-bold underline">
                Dekhein
              </Link>
            )}
          </li>
        );
      })}
      {limit && alerts.length > limit && (
        <li className="text-center text-xs text-ink-soft">Aur {alerts.length - limit} alerts</li>
      )}
    </ul>
  );
}