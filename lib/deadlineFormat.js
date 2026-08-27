// Converts a Date or ISO string into a local "YYYY-MM-DDTHH:mm" string
// suitable for <input type="datetime-local"> in the user's own browser timezone.
export function toLocalDatetimeLocal(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Format a date for display in the viewer's local browser timezone
export function formatDateTime(dateInput, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, options);
}

// Backward compatibility alias
export const toLondonDatetimeLocal = toLocalDatetimeLocal;
