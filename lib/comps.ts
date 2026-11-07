/**
 * Similarity scoring for comparable sold businesses. Ported from Michael's DealSpan engine
 * (js/engine.js: scoreComparable, weightedMedian, selectComparables). Rules are unchanged.
 */
import { DEALS, type DealRecord } from '@/lib/deals';

export const COMP_SETTINGS = {
  minCompScore: 40,
  maxComps: 8,
  asOfYear: 2026,
};

export type BuyerType = 'strategic' | 'financial' | 'individual';

export type CompSubject = {
  industry: string;
  subsector: string;
  ebitda: number;
  buyerType: BuyerType;
  earnout: boolean;
};

export type ScoreParts = {
  sub: number;
  size: number;
  buyer: number;
  structure: number;
  recency: number;
  basis: number;
};

export type ScoredDeal = DealRecord & {
  ebitda: number;
  ev: number;
  score: number;
  parts: ScoreParts;
  reasons: string[];
  multiple: number;
};

export function quantile(values: number[], q: number): number {
  const a = values.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}

export function weightedMedian(items: Array<{ v: number; w: number }>): number {
  const a = items.filter((i) => Number.isFinite(i.v) && i.w > 0).sort((x, y) => x.v - y.v);
  if (!a.length) return NaN;
  const half = a.reduce((s, i) => s + i.w, 0) / 2;
  let c = 0;
  for (const i of a) {
    c += i.w;
    if (c >= half) return i.v;
  }
  return a[a.length - 1].v;
}

/** Points (max 100): same type of work 25, size 30, buyer type 15, structure 10, recency 10, profit basis 10. */
export function scoreComparable(p: DealRecord, m: CompSubject, A = COMP_SETTINGS): ScoredDeal | null {
  if (p.industry !== m.industry || !(p.ev && p.ev > 0) || !(p.ebitda && p.ebitda > 0) || !(m.ebitda > 0))
    return null;
  const reasons: string[] = [];
  let sub = 0;
  if (m.subsector && p.subsector && p.subsector.toLowerCase() === m.subsector.trim().toLowerCase()) {
    sub = 25;
    reasons.push('same type of work');
  }
  const ratio = p.ebitda / m.ebitda;
  const r = Math.max(ratio, 1 / ratio);
  const size = 30 * Math.max(0, 1 - Math.log(r) / Math.log(5));
  reasons.push(
    ratio >= 1 ? `${ratio.toFixed(1)}× your size` : `${(1 / ratio).toFixed(1)}× smaller than yours`,
  );
  let buyer = 0;
  if (p.buyerType && m.buyerType) {
    if (p.buyerType === m.buyerType) {
      buyer = 15;
      reasons.push('same kind of buyer');
    } else if ([p.buyerType, m.buyerType].sort().join() === 'financial,individual') {
      buyer = 10;
      reasons.push('search-fund style buyer, close to a first-time buyer');
    } else buyer = 5;
  }
  let structure = 0;
  if (p.earnout === m.earnout) {
    structure += 5;
    reasons.push(p.earnout ? 'also had an earnout' : 'no earnout, like yours');
  }
  if ((p.stakePct || 100) >= 100) structure += 5;
  else reasons.push(`only ${p.stakePct}% bought`);
  const yrs = A.asOfYear - parseInt(String(p.date).slice(0, 4), 10);
  const recency = !Number.isFinite(yrs) ? 0 : yrs <= 2 ? 10 : yrs <= 5 ? 5 : 0;
  if (recency === 0) reasons.push('older deal');
  const basis = p.basis === 'ltm' ? 10 : 5;
  if (p.basis === 'forward') reasons.push('priced on forecast profit');
  if (p.currency !== 'USD') reasons.push(`${p.currency} deal, shown in US$`);
  const score = sub + size + buyer + structure + recency + basis;
  return {
    ...p,
    ev: p.ev,
    ebitda: p.ebitda,
    score,
    parts: { sub, size, buyer, structure, recency, basis },
    reasons,
    multiple: p.ev / p.ebitda,
  };
}

export type CompSelection = {
  used: ScoredDeal[];
  notUsed: ScoredDeal[];
  considered: number;
  count: number;
  avgScore: number;
  confidence: 'high' | 'medium' | 'low';
  q1: number;
  q3: number;
  med: number;
  enough: boolean;
};

export function selectComparables(
  m: CompSubject,
  deals: DealRecord[] = DEALS,
  A = COMP_SETTINGS,
): CompSelection {
  const scored = deals
    .map((p) => scoreComparable(p, m, A))
    .filter((p): p is ScoredDeal => p != null)
    .sort((x, y) => y.score - x.score);
  // Hard size rule: a deal more than 5x bigger or smaller (0 size points) is never used.
  const used = scored.filter((p) => p.score >= A.minCompScore && p.parts.size > 0).slice(0, A.maxComps);
  const notUsed = scored.filter((p) => !used.includes(p));
  const mults = used.map((p) => p.multiple);
  const avgScore = used.length ? used.reduce((s, p) => s + p.score, 0) / used.length : 0;
  const confidence = used.length >= 5 && avgScore >= 60 ? 'high' : used.length >= 3 ? 'medium' : 'low';
  return {
    used,
    notUsed,
    considered: scored.length,
    count: used.length,
    avgScore,
    confidence,
    q1: quantile(mults, 0.25),
    q3: quantile(mults, 0.75),
    med: weightedMedian(used.map((p) => ({ v: p.multiple, w: p.score }))),
    enough: used.length >= 3,
  };
}

/** Every sale in the industry with a published profit, for the precedents tab. */
export type IndustryMarket = {
  deals: Array<DealRecord & { multiple: number }>;
  withoutProfit: DealRecord[];
  small: Array<DealRecord & { multiple: number }>;
  q1: number;
  median: number;
  q3: number;
  average: number;
  basis: 'small' | 'all';
};

export function industryMarket(industry: string, deals: DealRecord[] = DEALS): IndustryMarket {
  const inIndustry = deals.filter((d) => d.industry === industry);
  const priced = inIndustry
    .filter((d) => d.ev && d.ebitda && d.ebitda > 0)
    .map((d) => ({ ...d, multiple: d.ev! / d.ebitda! }))
    .sort((a, b) => a.multiple - b.multiple);
  const small = priced.filter((d) => d.ebitda! <= 5_000_000);
  const basisSet = small.length >= 3 ? small : priced;
  const mults = basisSet.map((d) => d.multiple);
  return {
    deals: priced,
    withoutProfit: inIndustry.filter((d) => !(d.ebitda && d.ebitda > 0)),
    small,
    q1: quantile(mults, 0.25),
    median: quantile(mults, 0.5),
    q3: quantile(mults, 0.75),
    average: mults.length ? mults.reduce((a, b) => a + b, 0) / mults.length : NaN,
    basis: small.length >= 3 ? 'small' : 'all',
  };
}

export function subsectorsFor(industry: string): string[] {
  return Array.from(new Set(DEALS.filter((d) => d.industry === industry).map((d) => d.subsector))).sort();
}
