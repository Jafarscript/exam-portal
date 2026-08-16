const LABELS = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  offline: 'Reconnecting…',
  error: 'Save failed — will retry',
};

const COLORS = {
  saving: 'text-primary-600',
  saved: 'text-primary-700',
  offline: 'text-gold-500',
  error: 'text-red-600',
};

export default function SaveStatus({ status }) {
  if (!status || status === 'idle') return null;
  return (
    <span className={`text-xs font-medium ${COLORS[status] || 'text-ink/60'}`}>
      {status === 'saving' && (
        <svg className="inline w-3 h-3 mr-1 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {LABELS[status]}
    </span>
  );
}
