// The create form's deadline input is labelled "UK time (Europe/London)",
// so when editing we need to show the stored Date back in that same
// timezone as a "YYYY-MM-DDTHH:mm" string — the format <input type="datetime-local">
// requires.
export function toLondonDatetimeLocal(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}