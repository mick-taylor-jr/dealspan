import { SBA } from '@/lib/financing';
import type { Analysis } from '@/lib/model';

/**
 * Presentation helpers for "The Gap": the asking price minus the fair price, which is what the buyer would
 * overpay. Nothing here changes a model. The fair price is the engine's own average-deal price (the average
 * of the standalone methods' midpoints: comps, DCF and LBO), rounded to the nearest $1,000.
 */

export type Verdict = 'PROCEED' | 'NEGOTIATE' | 'WALK';

export const VERDICT: Record<Analysis['verdict']['tone'], Verdict> = {
  good: 'PROCEED',
  caution: 'NEGOTIATE',
  risk: 'WALK',
};

export type Gap = {
  fair: number;
  asking: number | null;
  /** asking − fair. Positive means the buyer would overpay. */
  gap: number | null;
  /** gap ÷ fair. */
  share: number | null;
};

export function fairPrice(a: Analysis): number {
  const average = a.scenarios.find((s) => s.id === 'average')?.price ?? a.offerEv;
  return Math.round(average / 1000) * 1000;
}

export function theGap(a: Analysis): Gap {
  const fair = fairPrice(a);
  const asking = a.askingPrice;
  if (asking == null) return { fair, asking: null, gap: null, share: null };
  const gap = asking - fair;
  return { fair, asking, gap, share: fair > 0 ? gap / fair : null };
}

/**
 * The highest price the SBA 7(a) loan supports: the loan the target's verified profit covers at
 * DealSpan's comfortable 1.5× coverage, grossed up for the buyer's 10% and the deal fees.
 */
export function sbaSupportedPrice(a: Analysis): number {
  const f = a.financing;
  const loan = Math.min(a.verifiedEbitda / SBA.comfortableCoverage / f.annualPaymentPerDollar, SBA.maxLoan);
  return Math.round(loan / (1 - SBA.equityInjection) / (1 + a.deal.feesPct) / 1000) * 1000;
}
