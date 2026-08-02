export function formatCurrencyRange(
  amount: number | string | undefined | null,
  currency: string = 'USD'
): string {
  if (amount === undefined || amount === null) return `$0 ${currency}`;

  if (typeof amount === 'string') {
    if (amount.includes('-') || amount.includes('to')) {
      return amount.trim().endsWith(currency) ? amount.trim() : `${amount.trim()} ${currency}`;
    }
    const parsed = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(parsed) || parsed === 0) return amount;
    amount = parsed;
  }

  if (amount === 0) return `$0 ${currency}`;

  let min = Math.round((amount * 0.8) / 100) * 100;
  let max = Math.round((amount * 1.2) / 100) * 100;

  if (amount < 100) {
    min = Math.max(1, Math.round(amount * 0.8));
    max = Math.round(amount * 1.2);
  }

  if (min === max) {
    max = min + (amount < 100 ? 5 : 100);
  }

  return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
}

export function formatTimeRange(
  value: number | string | undefined | null,
  unit?: string
): string {
  if (value === undefined || value === null || value === '') return `0 ${unit || 'days'}`;

  if (typeof value === 'number') {
    if (value === 0) return `0 ${unit || 'days'}`;
    let min = Math.max(1, Math.round(value * 0.75));
    let max = Math.round(value * 1.25);
    if (min === max) max = min + 1;
    return `${min} - ${max} ${unit || 'days'}`;
  }

  const strVal = String(value).trim();
  if (/\d+\s*[-–—\bto\b]+\s*\d+/i.test(strVal)) {
    return strVal;
  }

  const match = strVal.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (match) {
    const num = parseFloat(match[1]);
    const parsedUnit = match[2] || unit || '';
    if (!isNaN(num)) {
      if (num === 0) return `0 ${parsedUnit}`.trim();
      let min = Math.max(1, Math.round(num * 0.75));
      let max = Math.round(num * 1.25);
      if (min === max) max = min + 1;
      return `${min} - ${max} ${parsedUnit}`.trim();
    }
  }

  return strVal;
}

export function formatEffortRange(value: number | undefined | null, unit: string = 'h'): string {
  if (value === undefined || value === null || value === 0) return `0 ${unit}`;
  let min = Math.max(1, Math.round(value * 0.75));
  let max = Math.round(value * 1.25);
  if (min === max) max = min + 1;
  return `${min} - ${max} ${unit}`;
}

export function formatDurationRange(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) return `0d`;
  let min = Math.max(1, Math.round(value * 0.75));
  let max = Math.round(value * 1.25);
  if (min === max) max = min + 1;
  return `${min} - ${max}d`;
}
