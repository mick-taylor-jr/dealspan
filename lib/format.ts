export function usd(value: number): string {
  const sign = value < 0 ? '−' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

export function usdShort(value: number): string {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000).toLocaleString('en-US')}K`;
  return `${sign}$${Math.round(abs)}`;
}

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function times(value: number, digits = 1): string {
  return `${value.toFixed(digits)}×`;
}

/** Accounting style for tables: negatives in parentheses, no dollar sign. */
export function acct(value: number): string {
  const body = Math.round(Math.abs(value)).toLocaleString('en-US');
  return value < 0 ? `(${body})` : body;
}
