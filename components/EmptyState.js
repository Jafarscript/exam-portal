export default function EmptyState({ title, message, action }) {
  return (
    <div className="text-center py-16 px-4 border border-dashed border-primary-200 rounded-xl bg-white/60">
      <p className="font-display text-xl text-ink mb-1">{title}</p>
      {message && <p className="text-sm text-ink/60 max-w-md mx-auto">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
