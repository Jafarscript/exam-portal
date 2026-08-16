import { useEffect, useState } from 'react';

// Purely cosmetic countdown - the backend independently enforces expiresAt,
// so a paused tab or clock skew on the client can never grant extra time.
export default function Timer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - new Date()));

  useEffect(() => {
    const id = setInterval(() => {
      const ms = Math.max(0, new Date(expiresAt) - new Date());
      setRemaining(ms);
      if (ms <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const totalSeconds = Math.floor(remaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const low = totalSeconds <= 60;

  return (
    <div
      className={`font-mono text-sm sm:text-base font-semibold px-3 py-1.5 rounded-lg border ${
        low ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-primary-50 text-primary-800 border-primary-100'
      }`}
      aria-live="polite"
    >
      {h > 0 && `${String(h).padStart(2, '0')}:`}
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}
