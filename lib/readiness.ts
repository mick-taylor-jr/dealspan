import { num, type CompanyInput, type Intake } from '@/lib/types';

/**
 * Deal readiness and the diligence checklist, read live from the intake. Presentation only: the models
 * still decide what they need through findMissing. The one extra rule is that the asking price is
 * required to run the report, because The Gap is measured against it.
 */

export const STEPS = ['Your company', 'The target', 'Financials', 'Synergies', 'Fit & risk', 'Deal terms'] as const;

export type CheckState = 'done' | 'partial' | 'missing';
export type CheckItem = { label: string; state: CheckState; step: number; required: boolean };

const filled = (v: string | undefined) => (v ?? '').trim() !== '';
const money = (v: string) => num(v) != null;

function profile(c: CompanyInput) {
  return [filled(c.name), filled(c.industry), filled(c.description), filled(c.location), filled(c.customers), filled(c.employees)];
}
function results(c: CompanyInput) {
  return [...c.revenue.map(money), ...c.ebitda.map(money)];
}
function balance(c: CompanyInput) {
  return [c.da, c.capex, c.nwc, c.debt, c.cash, c.debtRate, c.growth].map(money);
}

function state(flags: boolean[]): CheckState {
  const n = flags.filter(Boolean).length;
  return n === flags.length ? 'done' : n === 0 ? 'missing' : 'partial';
}

export function askingPriceSet(intake: Intake) {
  const v = num(intake.target.askingPrice);
  return v != null && v > 0;
}

export function readiness(intake: Intake) {
  const b = intake.buyer;
  const t = intake.target;
  const d = intake.deal;
  const f = intake.fit;
  const syn = intake.synergies.filter((s) => filled(s.description) || filled(s.amount));
  const groups: Array<{ label: string; step: number; required: boolean; flags: boolean[] }> = [
    { label: 'Your company profile', step: 0, required: true, flags: [filled(b.name), filled(b.industry), ...profile(b).slice(2)] },
    { label: 'Your 3-year results', step: 0, required: true, flags: results(b) },
    { label: 'Your balance sheet', step: 0, required: true, flags: balance(b) },
    { label: 'Target profile', step: 1, required: true, flags: profile(t) },
    { label: 'Asking price', step: 1, required: true, flags: [askingPriceSet(intake)] },
    { label: 'Seller’s claimed earnings', step: 1, required: false, flags: [money(t.sellerEbitda)] },
    { label: 'Target 3-year results', step: 2, required: true, flags: results(t) },
    { label: 'Target balance sheet and cash needs', step: 2, required: true, flags: balance(t) },
    {
      label: 'Synergies',
      step: 3,
      required: false,
      flags: [syn.length > 0 && syn.every((s) => filled(s.description) && money(s.amount)), money(intake.integrationCost)],
    },
    { label: 'Owner dependence and key people', step: 4, required: false, flags: [filled(f.ownerDependence), filled(f.keyPeople)] },
    { label: 'Customer concentration', step: 4, required: false, flags: [money(f.topCustomerPct), money(f.recurringPct), filled(f.customerOverlap)] },
    {
      label: 'Fit with your company',
      step: 4,
      required: false,
      flags: [filled(f.serviceFit), filled(f.geography), filled(f.crossSell), filled(f.culture), filled(f.integration), filled(f.thesis)],
    },
    {
      label: 'Deal terms and financing',
      step: 5,
      required: true,
      flags: [d.offerMultiple, d.leverage, d.rate, d.termYears, d.feesPct, d.exitMultiple, d.holdYears, d.targetIrr].map(money),
    },
  ];
  const items: CheckItem[] = groups.map((g) => ({ label: g.label, step: g.step, required: g.required, state: state(g.flags) }));
  const all = groups.flatMap((g) => g.flags);
  const percent = Math.round((all.filter(Boolean).length / all.length) * 100);
  const stepDone = STEPS.map((_, i) => items.filter((it) => it.step === i).every((it) => it.state === 'done'));
  return { items, percent, stepDone };
}
