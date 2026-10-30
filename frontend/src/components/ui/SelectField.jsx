import { useId } from 'react';

export default function SelectField({ label, error, hint, className = '', children, ...selectProps }) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`w-full rounded-xl border bg-card px-3.5 py-2.5 text-ink outline-none focus:ring-2 ${
          error
            ? 'border-coral-500 focus:ring-coral-500/30'
            : 'border-sand-300 focus:border-marigold-500 focus:ring-marigold-400/40'
        }`}
        {...selectProps}
      >
        {children}
      </select>
      {message && (
        <p id={messageId} className={`mt-1 text-xs ${error ? 'font-semibold text-coral-800' : 'text-ink-soft'}`}>
          {message}
        </p>
      )}
    </div>
  );
}