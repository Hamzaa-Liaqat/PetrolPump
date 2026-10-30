export default function Logo({ size = 32, withText = true }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M16 2C16 2 6 13 6 20a10 10 0 0 0 20 0C26 13 16 2 16 2Z"
          fill="#efa220"
        />
        <path
          d="M11.5 21a4.5 4.5 0 0 0 4.5 4.5"
          stroke="#fffbf4"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="22" cy="9" r="3" fill="#35b5a6" />
      </svg>
      {withText && (
        <span className="text-lg font-extrabold tracking-tight text-ink">
          Fuel<span className="text-lagoon-700">Track</span>
        </span>
      )}
    </span>
  );
}