import type { LabeledCents } from '@/lib/types';

export type SynergyKind = 'cost' | 'revenue';

export type SynergyLine = {
  id: string;
  kind: SynergyKind;
  description: string;
  amountRaw: string;
};

export type SynergyView = {
  blocked: boolean;
  upliftAuthorized: false;
  lines: Array<{
    description: string;
    kind: SynergyKind;
    stated: LabeledCents;
    haircut: LabeledCents;
    retained: LabeledCents;
  }>;
};

const COST_RETAIN_NUM = BigInt(4);
const COST_RETAIN_DEN = BigInt(5);
const REVENUE_RETAIN_NUM = BigInt(77);
const REVENUE_RETAIN_DEN = BigInt(100);

function dollarsToCents(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const cents = Number(raw) * 100;
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function synergyView(mode: 'standalone' | 'addon', lines: SynergyLine[]): SynergyView {
  if (mode === 'standalone') return { blocked: true, upliftAuthorized: false, lines: [] };
  const priced = lines.flatMap((line) => {
    const cents = dollarsToCents(line.amountRaw);
    if (cents == null || line.description.trim() === '') return [];
    const retainNum = line.kind === 'cost' ? COST_RETAIN_NUM : REVENUE_RETAIN_NUM;
    const retainDen = line.kind === 'cost' ? COST_RETAIN_DEN : REVENUE_RETAIN_DEN;
    const retained = Number((BigInt(cents) * retainNum) / retainDen);
    const haircut = cents - retained;
    return [
      {
        description: line.description.trim(),
        kind: line.kind,
        stated: {
          cents,
          label: 'user-entered' as const,
          source: 'user',
          location: line.description.trim(),
        },
        haircut: {
          cents: haircut,
          label: 'calculated' as const,
          source: line.kind === 'cost' ? '20% cost haircut' : '23% revenue haircut',
          location: 'Policy stress, not a promise',
        },
        retained: {
          cents: retained,
          label: 'calculated' as const,
          source: 'stated amount after haircut',
          location: 'Not added to price',
        },
      },
    ];
  });
  return { blocked: false, upliftAuthorized: false, lines: priced };
}
