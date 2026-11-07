export type Unit = 'USD' | 'USD_thousands' | 'USD_millions';

export type ParsedMoney = {
  rawInput: string;
  unit: Unit | null;
  cents: number | null;
  missing: boolean;
  flags: Array<'UNIT_UNKNOWN' | 'UNPARSEABLE' | 'CENTS_PRECISION_LOSS'>;
};

const UNIT_DOLLARS: Record<Unit, number> = {
  USD: 1,
  USD_thousands: 1_000,
  USD_millions: 1_000_000,
};

export function parseMoney(rawInput: string, unit: Unit | '' | null | undefined): ParsedMoney {
  const raw = rawInput ?? '';
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { rawInput: raw, unit: unit || null, cents: null, missing: true, flags: [] };
  }
  if (!unit) {
    return { rawInput: raw, unit: null, cents: null, missing: false, flags: ['UNIT_UNKNOWN'] };
  }
  const cleaned = trimmed.replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { rawInput: raw, unit, cents: null, missing: false, flags: ['UNPARSEABLE'] };
  }
  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [whole, frac = ''] = unsigned.split('.');
  if (whole.length + frac.length > 15) {
    return { rawInput: raw, unit, cents: null, missing: false, flags: ['UNPARSEABLE'] };
  }
  const digits = Number(whole + frac);
  const denominator = 10 ** frac.length;
  const numerator = digits * UNIT_DOLLARS[unit] * 100;
  if (!Number.isSafeInteger(digits) || !Number.isSafeInteger(numerator)) {
    return { rawInput: raw, unit, cents: null, missing: false, flags: ['UNPARSEABLE'] };
  }
  const quotient = Math.trunc(numerator / denominator);
  const remainder = numerator % denominator;
  let cents = quotient;
  const flags: ParsedMoney['flags'] = [];
  if (remainder !== 0) {
    flags.push('CENTS_PRECISION_LOSS');
    if (remainder * 2 >= denominator) cents += 1;
  }
  if (negative) cents = -cents;
  return { rawInput: raw, unit, cents, missing: false, flags };
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100);
  const rem = abs % 100;
  const body = dollars.toLocaleString('en-US');
  if (rem === 0) return `${sign}$${body}`;
  return `${sign}$${body}.${String(rem).padStart(2, '0')}`;
}

export function formatCompact(cents: number): string {
  if (cents % 100_000 === 0 && cents !== 0) {
    const thousands = cents / 100_000;
    return `$${thousands.toLocaleString('en-US')}K`;
  }
  return formatCents(cents);
}

export function parsePositiveDecimal(raw: string): { numerator: number; denominator: number } | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  if (whole.length + frac.length > 12) return null;
  const denominator = 10 ** frac.length;
  const numerator = Number(whole + frac);
  if (!Number.isSafeInteger(numerator) || numerator <= 0) return null;
  return { numerator, denominator };
}

export function multiplyCents(cents: number, decimalRaw: string): { cents: number; exact: boolean } | null {
  const ratio = parsePositiveDecimal(decimalRaw);
  if (!ratio || !Number.isSafeInteger(cents)) return null;
  const product = cents * ratio.numerator;
  if (!Number.isSafeInteger(product)) return null;
  const quotient = Math.trunc(product / ratio.denominator);
  const remainder = product % ratio.denominator;
  if (remainder === 0) return { cents: quotient, exact: true };
  const roundAway = Math.abs(remainder) * 2 >= ratio.denominator;
  const magnitude = Math.abs(quotient) + (roundAway ? 1 : 0);
  const signed = cents < 0 ? -magnitude : magnitude;
  return { cents: signed, exact: false };
}

export function formatPercent(partCents: number, wholeCents: number): string | null {
  if (wholeCents === 0) return null;
  const negative = partCents < 0 !== wholeCents < 0;
  const tenths = Math.round((Math.abs(partCents) * 1000) / Math.abs(wholeCents));
  const whole = Math.trunc(tenths / 10);
  const tenth = tenths % 10;
  const body = tenth === 0 ? `${whole}%` : `${whole}.${tenth}%`;
  return negative ? `-${body}` : body;
}

export function dollarsToCents(dollars: number): number | null {
  if (!Number.isFinite(dollars)) return null;
  const cents = Math.round(dollars * 100);
  if (!Number.isSafeInteger(cents)) return null;
  if (Math.abs(dollars * 100 - cents) > 0.001) return null;
  return cents;
}
