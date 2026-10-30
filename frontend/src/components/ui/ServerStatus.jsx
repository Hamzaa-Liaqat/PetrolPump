import { useServerStatus } from '@/hooks/useServerStatus';

const LOOK = {
  checking: { dot: 'bg-sand-300 animate-pulse', label: 'Check ho raha hai', text: 'text-ink-soft' },
  online: { dot: 'bg-lagoon-500', label: 'Server online', text: 'text-lagoon-800' },
  degraded: { dot: 'bg-marigold-500', label: 'Database ka masla', text: 'text-marigold-800' },
  offline: { dot: 'bg-coral-500', label: 'Server offline', text: 'text-coral-800' },
};

export default function ServerStatus() {
  const { status } = useServerStatus();
  const look = LOOK[status];
  return (
    <span
      role="status"
      aria-live="polite"
      title={look.label}
      className={`inline-flex items-center gap-2 text-xs font-semibold ${look.text}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${look.dot}`} />
      <span className="hidden sm:inline">{look.label}</span>
    </span>
  );
}