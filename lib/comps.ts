import type { LabeledCents } from '@/lib/types';

export type CompsInput = {
  benchmarkRaw: string;
  discountLowRaw: string;
  discountHighRaw: string;
};

export function emptyComps(): CompsInput {
  return { benchmarkRaw: '', discountLowRaw: '', discountHighRaw: '' };
}

export type CompsResult =
  | { status: 'need-benchmark' }
  | { status: 'need-discount' }
  | {
      status: 'ready';
      multipleLow: LabeledCents;
      multipleHigh: LabeledCents;
      valueLow: LabeledCents | null;
      valueHigh: LabeledCents | null;
    };

function parseMultipleThousandths(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const thousandths = Number(`${whole}${frac.padEnd(3, '0').slice(0, 3)}`);
  if (!Number.isSafeInteger(thousandths) || thousandths <= 0) return null;
  return thousandths;
}

function parsePercentBps(raw: string): number | null {
  const trimmed = raw.trim().replace('%', '');
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const bps = Number(`${whole}${frac.padEnd(2, '0').slice(0, 2)}`);
  if (!Number.isSafeInteger(bps) || bps < 0 || bps >= 10_000) return null;
  return bps;
}

export function sizeAdjustedComps(input: CompsInput, earningsCents: number | null): CompsResult {
  const benchmark = parseMultipleThousandths(input.benchmarkRaw);
  if (benchmark == null) return { status: 'need-benchmark' };
  const low = parsePercentBps(input.discountLowRaw);
  const high = parsePercentBps(input.discountHighRaw);
  if (low == null || high == null) return { status: 'need-discount' };
  const small = Math.min(low, high);
  const large = Math.max(low, high);
  const multipleHigh = Math.round((benchmark * (10_000 - small)) / 10_000);
  const multipleLow = Math.round((benchmark * (10_000 - large)) / 10_000);
  const value = (times: number): LabeledCents | null => {
    if (earningsCents == null) return null;
    return {
      cents: Math.round((earningsCents * times) / 1_000),
      label: 'calculated',
      source: 'size-adjusted multiple × documents-supported EBITDA',
      location: 'Not a raw public multiple',
    };
  };
  const labeled = (times: number, location: string): LabeledCents => ({
    cents: times,
    label: 'calculated',
    source: 'user-entered benchmark × (1 − user-entered discount)',
    location,
  });
  return {
    status: 'ready',
    multipleLow: labeled(multipleLow, 'Higher discount'),
    multipleHigh: labeled(multipleHigh, 'Lower discount'),
    valueLow: value(multipleLow),
    valueHigh: value(multipleHigh),
  };
}
