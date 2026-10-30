import Spinner from './Spinner';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS = {
  primary: 'bg-marigold-500 text-ink shadow-sm hover:bg-marigold-400 active:bg-marigold-600',
  soft: 'bg-lagoon-100 text-lagoon-800 hover:bg-lagoon-500/25',
  ghost: 'text-ink-soft hover:bg-sand-100 hover:text-ink',
  danger: 'bg-coral-100 text-coral-800 hover:bg-coral-500/25',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}