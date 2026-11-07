/**
 * Turning Claude's web-search answer into deal records we can score.
 * Pure functions, so the safety checks are unit-tested:
 *  - a deal is kept only if its source URL was actually returned by the web search
 *  - price and profit must both be positive numbers and the multiple must be plausible
 *  - deals already in the workbook are dropped
 */
import type { DealRecord } from '@/lib/deals';

export type PrecedentQuery = {
  industry: string;
  industryLabel: string;
  subsector: string;
  description: string;
  location: string;
  ebitda: number;
  revenue: number;
};

export type AiDeal = DealRecord & { aiFound: true };

type RawDeal = {
  target?: unknown;
  acquirer?: unknown;
  date?: unknown;
  type_of_work?: unknown;
  price_usd?: unknown;
  ebitda_usd?: unknown;
  revenue_usd?: unknown;
  buyer_type?: unknown;
  earnout?: unknown;
  profit_basis?: unknown;
  source_url?: unknown;
  note?: unknown;
};

export const MIN_MULTIPLE = 1;
export const MAX_MULTIPLE = 30;

export function buildPrompt(q: PrecedentQuery, exclude: string[]): string {
  const size = Math.round(q.ebitda).toLocaleString('en-US');
  return [
    'Find closed acquisitions of privately held businesses that are comparable to this company:',
    `- Industry: ${q.industryLabel}`,
    q.subsector ? `- Type of work: ${q.subsector}` : '',
    q.description ? `- What it does: ${q.description}` : '',
    q.location ? `- Where: ${q.location}` : '',
    `- Yearly EBITDA: about $${size} (revenue about $${Math.round(q.revenue).toLocaleString('en-US')})`,
    '',
    'Rules:',
    '- Only deals where a press release, SEC filing or reputable news article discloses BOTH the price (enterprise value) AND the EBITDA, or states the EBITDA multiple paid.',
    '- Prefer deals from 2019 or later, in the United States, with EBITDA between one-fifth and five times this company’s.',
    '- Every deal must have a source_url copied exactly from your search results. Never guess a number or a URL. Skip any deal you cannot source.',
    '- Do not include broker listings or asking prices; only completed sales.',
    exclude.length ? `- Skip these, we already have them: ${exclude.join('; ')}` : '',
    '',
    'Search the web, then reply with ONLY a JSON array (up to 8 items) inside <deals></deals> tags. Each item:',
    '{"target": string, "acquirer": string, "date": "YYYY-MM", "type_of_work": string, "price_usd": number, "ebitda_usd": number,',
    ' "revenue_usd": number|null, "buyer_type": "strategic"|"financial"|"individual", "earnout": boolean,',
    ' "profit_basis": "actual"|"forecast", "source_url": string, "note": string}',
    'If an EBITDA figure is derived from a stated multiple, say so in note. If you find none, reply <deals>[]</deals>.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function extractJsonArray(text: string): unknown[] {
  const tagged = text.match(/<deals>([\s\S]*?)<\/deals>/);
  const body = tagged ? tagged[1] : (text.match(/\[[\s\S]*\]/)?.[0] ?? '[]');
  try {
    const parsed = JSON.parse(body.trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type ValidationResult = { deals: AiDeal[]; rejected: Array<{ target: string; reason: string }> };

export function validateDeals(
  raw: unknown[],
  searchedUrls: string[],
  existingTargets: string[],
  industry: string,
): ValidationResult {
  const seen = new Set(searchedUrls.map(normalizeUrl));
  const existing = new Set(existingTargets.map(normalizeName));
  const deals: AiDeal[] = [];
  const rejected: ValidationResult['rejected'] = [];
  for (const item of raw as RawDeal[]) {
    const target = typeof item?.target === 'string' ? item.target.trim() : '';
    const reject = (reason: string) => rejected.push({ target: target || '(unnamed)', reason });
    if (!target) {
      reject('no business name');
      continue;
    }
    const source = typeof item.source_url === 'string' ? item.source_url.trim() : '';
    if (!source || !seen.has(normalizeUrl(source))) {
      reject('source link was not in the search results');
      continue;
    }
    const ev = toNumber(item.price_usd);
    const ebitda = toNumber(item.ebitda_usd);
    if (!ev || ev <= 0 || !ebitda || ebitda <= 0) {
      reject('price or profit missing');
      continue;
    }
    const multiple = ev / ebitda;
    if (multiple < MIN_MULTIPLE || multiple > MAX_MULTIPLE) {
      reject(`multiple of ${multiple.toFixed(1)}× is not plausible`);
      continue;
    }
    if (existing.has(normalizeName(target))) {
      reject('already in the deal database');
      continue;
    }
    existing.add(normalizeName(target));
    const buyer = item.buyer_type;
    const date = typeof item.date === 'string' && /^\d{4}/.test(item.date) ? item.date.slice(0, 7) : '';
    if (!date) {
      reject('no deal date');
      continue;
    }
    const revenue = toNumber(item.revenue_usd);
    deals.push({
      aiFound: true,
      industry,
      subsector: typeof item.type_of_work === 'string' ? item.type_of_work.trim() : '',
      date,
      target,
      acquirer: typeof item.acquirer === 'string' ? item.acquirer.trim() : 'Not disclosed',
      buyerType: buyer === 'financial' || buyer === 'individual' ? buyer : 'strategic',
      currency: 'USD',
      ev: Math.round(ev),
      revenue: revenue && revenue > 0 ? Math.round(revenue) : null,
      ebitda: Math.round(ebitda),
      earnout: item.earnout === true,
      stakePct: 100,
      basis: item.profit_basis === 'forecast' ? 'forward' : 'ltm',
      implied: typeof item.note === 'string' && /multiple/i.test(item.note),
      profitPeriod: '',
      notes: typeof item.note === 'string' ? item.note.trim() : '',
      source,
    });
  }
  return { deals: deals.slice(0, 8), rejected };
}

/** Collect every URL returned inside web_search_tool_result blocks of a Messages API response. */
export function searchedUrlsFrom(content: unknown[]): string[] {
  const urls: string[] = [];
  for (const block of content as Array<{ type?: string; content?: unknown }>) {
    if (block?.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content as Array<{ type?: string; url?: string }>) {
        if (r?.type === 'web_search_result' && typeof r.url === 'string') urls.push(r.url);
      }
    }
  }
  return urls;
}

export function finalText(content: unknown[]): string {
  return (content as Array<{ type?: string; text?: string }>)
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
}

export function cacheKey(q: PrecedentQuery): string {
  return [q.industry, q.subsector.trim().toLowerCase(), Math.round(q.ebitda / 25_000)].join('|');
}
