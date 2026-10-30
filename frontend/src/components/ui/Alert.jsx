const TONES = {
  error: 'bg-coral-100 text-coral-800 ring-coral-500/30',
  success: 'bg-lagoon-100 text-lagoon-800 ring-lagoon-500/30',
  info: 'bg-periwinkle-100 text-periwinkle-800 ring-periwinkle-500/30',
  warn: 'bg-marigold-100 text-marigold-800 ring-marigold-400/40',
};

export default function Alert({ tone = 'info', children, className = '' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-3 text-sm font-medium ring-1 ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}