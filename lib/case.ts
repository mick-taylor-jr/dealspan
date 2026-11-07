import { buildDeal, type Deal } from '@/lib/bridge';
import { defaultDcf, runDcf, type DcfRun } from '@/lib/dcf';
import { runLbo, type LboRun } from '@/lib/lbo';
import { multiplyCents, parsePositiveDecimal } from '@/lib/money';
import { synergyView, type SynergyView } from '@/lib/synergy';
import type { Intake, ProvenanceLabel } from '@/lib/types';

export const MODEL_ASSUMPTIONS = {
  taxBps: 2_100,
  erpBps: 500,
  sizeBps: 500,
  companyBps: 200,
  wdBps: 2_500,
  gBps: 250,
  exitThousandths: 6_000,
  rfBps: 400,
  betaThousandths: 1_000,
  kdBps: 1_000,
  daBps: 200,
  capexBps: 200,
  nwcBps: 500,
  lboRateBps: 1_000,
  lboAmortYears: 10,
  lboHoldYears: 5,
  discountLowBps: 3_000,
  discountHighBps: 5_000,
} as const;

export type MoneyFact = {
  cents: number;
  label: ProvenanceLabel;
};

export type Fit = {
  addon: boolean;
  notes: string[];
};

export type CaseFile = {
  intake: Intake;
  claimed: MoneyFact;
  supported: MoneyFact;
  revenue: MoneyFact;
  debt: MoneyFact;
  cash: MoneyFact;
  growthBps: number;
  growthLabel: ProvenanceLabel;
  payCents: number;
  askCents: number;
  deal: Deal | null;
  dcf: DcfRun;
  lbo: LboRun;
  synergies: SynergyView;
  fit: Fit;
};

function dollars(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const cents = Number(raw) * 100;
  return Number.isSafeInteger(cents) ? cents : null;
}

function percentBps(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const bps = Number(`${whole}${frac.padEnd(2, '0').slice(0, 2)}`);
  return Number.isSafeInteger(bps) ? bps : null;
}

function enteredOrZero(raw: string): MoneyFact {
  const cents = dollars(raw);
  if (cents == null) return { cents: 0, label: 'assumed' };
  return { cents, label: 'user-entered' };
}

export function readFit(intake: Intake, statedCount: number): Fit {
  const notes: string[] = [];
  const buyerWork = intake.buyerDescription;
  const targetWork = intake.targetDescription;
  if (intake.buyerIndustry && intake.buyerIndustry === intake.industry) notes.push('Same industry.');
  if (/mow|ground|snow|landscap/i.test(`${buyerWork} ${targetWork}`)) notes.push('Same kind of outdoor work.');
  if (intake.buyerMarket.trim() || intake.targetMarket.trim()) {
    notes.push(`Markets: ${intake.buyerMarket.trim() || 'buyer not set'} and ${intake.targetMarket.trim() || 'target not set'}.`);
  }
  if (intake.sharedCustomers.trim()) notes.push(intake.sharedCustomers.trim());
  if (intake.territoryOverlap.trim()) notes.push(intake.territoryOverlap.trim());
  if (intake.opsOverlap.trim()) notes.push(intake.opsOverlap.trim());
  if (/owner|dave/i.test(targetWork)) notes.push('The target depends on a working owner.');
  const overlap = [intake.sharedCustomers, intake.territoryOverlap, intake.opsOverlap].some((item) => item.trim());
  const addon = overlap || statedCount > 0;
  notes.push(
    addon
      ? 'Treat it as an add-on. Synergies do not raise the price.'
      : 'No add-on overlap was described. Synergies should not drive the price.',
  );
  return { addon, notes };
}

export function buildCase(intake: Intake): CaseFile | null {
  const claimedCents = dollars(intake.claimedEarningsRaw);
  const revenueCents = dollars(intake.revenueRaw);
  if (claimedCents == null || claimedCents <= 0 || revenueCents == null || revenueCents <= 0) return null;
  if (!parsePositiveDecimal(intake.multipleRaw)) return null;
  const built = intake.taxProfitRaw.trim() ? buildDeal(intake) : null;
  const deal = built?.ok ? built.deal : null;
  const supportedCents = deal ? deal.supportedHigh.cents : claimedCents;
  const pay = multiplyCents(supportedCents, intake.multipleRaw);
  const ask = multiplyCents(claimedCents, intake.multipleRaw);
  if (!pay || !ask) return null;
  const growthParsed = percentBps(intake.targetGrowthRaw);
  const growthBps = growthParsed ?? 0;
  const debt = enteredOrZero(intake.targetDebtRaw);
  const cash = enteredOrZero(intake.targetCashRaw);
  const dcfInput = {
    ...defaultDcf(),
    ...MODEL_ASSUMPTIONS,
    growthBps,
  };
  const dcf = runDcf(dcfInput, revenueCents, supportedCents, debt.cents, cash.cents);
  const lbo = runLbo(
    {
      debtRaw: String(debt.cents / 100),
      rateBps: MODEL_ASSUMPTIONS.lboRateBps,
      amortYears: MODEL_ASSUMPTIONS.lboAmortYears,
      holdYears: MODEL_ASSUMPTIONS.lboHoldYears,
      exitThousandths: MODEL_ASSUMPTIONS.exitThousandths,
      growthBps,
      taxBps: MODEL_ASSUMPTIONS.taxBps,
    },
    supportedCents,
    pay.cents,
  );
  if (!dcf || !lbo) return null;
  const synergyLines = [
    intake.costSynergyRaw
      ? {
          id: 'cost',
          kind: 'cost' as const,
          description: intake.costSynergyName.trim() || 'Cost',
          amountRaw: intake.costSynergyRaw,
        }
      : null,
    intake.revenueSynergyRaw
      ? {
          id: 'revenue',
          kind: 'revenue' as const,
          description: intake.revenueSynergyName.trim() || 'Revenue',
          amountRaw: intake.revenueSynergyRaw,
        }
      : null,
  ].filter((line) => line != null);
  const fit = readFit(intake, synergyLines.length);
  return {
    intake,
    claimed: { cents: claimedCents, label: 'user-entered' },
    supported: { cents: supportedCents, label: deal ? 'calculated' : 'user-entered' },
    revenue: { cents: revenueCents, label: 'user-entered' },
    debt,
    cash,
    growthBps,
    growthLabel: growthParsed == null ? 'assumed' : 'user-entered',
    payCents: pay.cents,
    askCents: ask.cents,
    deal,
    dcf,
    lbo,
    synergies: synergyView(fit.addon ? 'addon' : 'standalone', synergyLines),
    fit,
  };
}
