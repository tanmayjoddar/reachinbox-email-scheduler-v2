const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDateTime(iso: string | null): string {
  if (!iso) return '\u2014';
  return dateFormatter.format(new Date(iso));
}
