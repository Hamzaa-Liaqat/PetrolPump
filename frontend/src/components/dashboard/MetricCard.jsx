const TONES = {
  marigold: { box: 'bg-marigold-100 ring-marigold-400/40', label: 'text-marigold-800' },
  lagoon: { box: 'bg-lagoon-100 ring-lagoon-500/30', label: 'text-lagoon-800' },
  coral: { box: 'bg-coral-100 ring-coral-500/30', label: 'text-coral-800' },
  periwinkle: { box: 'bg-periwinkle-100 ring-periwinkle-500/30', label: 'text-periwinkle-800' },
};

export default function MetricCard({ label, value, hint, tone = 'marigold' }) {
  const look = TONES[tone];
  return (
    <div className={`rounded-3xl p-5 ring-1 ${look.box}`}>
      <p className={`text-sm font-semibold ${look.label}`}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
      {hint && <p className={`mt-1 text-xs ${look.label}`}>{hint}</p>}
    </div>
  );
}