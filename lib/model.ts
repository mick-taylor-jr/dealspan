import { ASSUMPTIONS, costOfEquity, sizeDiscount, wacc } from '@/lib/assumptions';
import { industryInfo, PRECEDENT_NEIGHBORS } from '@/lib/industries';
import { CITED_DEALS, type CitedDeal } from '@/lib/precedents';
import { num, type CompanyInput, type Intake } from '@/lib/types';
import { scoreFit, type FitResult } from '@/lib/fit';

/* ---------- Parsed inputs ---------- */

export type Company = {
  name: string;
  industry: string;
  revenue: [number, number, number];
  ebitda: [number, number, number];
  da: number;
  capex: number;
  nwc: number;
  debt: number;
  cash: number;
  debtRate: number;
  growth: number;
};

export type Deal = {
  offerMultiple: number;
  feesPct: number;
  leverage: number;
  rate: number;
  termYears: number;
  exitMultiple: number;
  holdYears: number;
  targetIrr: number;
};

export type Missing = { section: 'buyer' | 'target' | 'deal'; field: string };

const COMPANY_FIELDS: Array<[keyof CompanyInput, string]> = [
  ['da', 'D&A'],
  ['capex', 'Capex'],
  ['nwc', 'Net working capital'],
  ['debt', 'Debt'],
  ['cash', 'Cash'],
  ['debtRate', 'Interest rate on debt'],
  ['growth', 'Revenue growth'],
];

function parseCompany(input: CompanyInput, section: 'buyer' | 'target', missing: Missing[]): Company | null {
  const start = missing.length;
  if (!input.name.trim()) missing.push({ section, field: 'Name' });
  if (!input.industry) missing.push({ section, field: 'Industry' });
  const revenue = input.revenue.map(num);
  const ebitda = input.ebitda.map(num);
  revenue.forEach((value, index) => {
    if (value == null || value <= 0) missing.push({ section, field: `Revenue ${2023 + index}` });
  });
  ebitda.forEach((value, index) => {
    if (value == null) missing.push({ section, field: `EBITDA ${2023 + index}` });
  });
  const rest: Record<string, number> = {};
  for (const [key, label] of COMPANY_FIELDS) {
    const value = num(input[key] as string);
    if (value == null) missing.push({ section, field: label });
    else rest[key] = value;
  }
  if ((ebitda[2] ?? 0) <= 0 && ebitda[2] != null) missing.push({ section, field: 'EBITDA 2025 must be positive' });
  if (missing.length > start) return null;
  return {
    name: input.name.trim(),
    industry: input.industry,
    revenue: revenue as [number, number, number],
    ebitda: ebitda as [number, number, number],
    da: rest.da,
    capex: rest.capex,
    nwc: rest.nwc,
    debt: rest.debt,
    cash: rest.cash,
    debtRate: rest.debtRate / 100,
    growth: rest.growth / 100,
  };
}

function parseDeal(intake: Intake, missing: Missing[]): Deal | null {
  const d = intake.deal;
  const fields: Array<[keyof typeof d, string]> = [
    ['offerMultiple', 'Offer multiple'],
    ['feesPct', 'Deal fees'],
    ['leverage', 'Acquisition debt'],
    ['rate', 'Interest rate on new debt'],
    ['termYears', 'Loan term'],
    ['exitMultiple', 'Exit multiple'],
    ['holdYears', 'Hold period'],
    ['targetIrr', 'Target return'],
  ];
  const out: Record<string, number> = {};
  const start = missing.length;
  for (const [key, label] of fields) {
    const value = num(d[key]);
    if (value == null) missing.push({ section: 'deal', field: label });
    else out[key] = value;
  }
  if (out.offerMultiple != null && out.offerMultiple <= 0) missing.push({ section: 'deal', field: 'Offer multiple above 0' });
  if (out.holdYears != null && (out.holdYears < 1 || out.holdYears > 10))
    missing.push({ section: 'deal', field: 'Hold period of 1–10 years' });
  if (out.termYears != null && out.termYears <= 0) missing.push({ section: 'deal', field: 'Loan term above 0' });
  if (missing.length > start) return null;
  return {
    offerMultiple: out.offerMultiple,
    feesPct: out.feesPct / 100,
    leverage: out.leverage,
    rate: out.rate / 100,
    termYears: Math.round(out.termYears),
    exitMultiple: out.exitMultiple,
    holdYears: Math.round(out.holdYears),
    targetIrr: out.targetIrr / 100,
  };
}

export function findMissing(intake: Intake): Missing[] {
  const missing: Missing[] = [];
  parseCompany(intake.buyer, 'buyer', missing);
  parseCompany(intake.target, 'target', missing);
  parseDeal(intake, missing);
  return missing;
}

/* ---------- Operating projection ---------- */

export type ProjectionYear = {
  year: number;
  revenue: number;
  ebitda: number;
  margin: number;
  da: number;
  ebit: number;
  taxes: number;
  nopat: number;
  capex: number;
  deltaNwc: number;
  ufcf: number;
};

export function project(company: Company, years: number, marginTarget: number | null): ProjectionYear[] {
  const rev0 = company.revenue[2];
  const m0 = company.ebitda[2] / rev0;
  const mT = marginTarget ?? m0;
  const daPct = company.da / rev0;
  const capexPct = company.capex / rev0;
  const nwcPct = company.nwc / rev0;
  let revenue = rev0;
  let priorNwc = company.nwc;
  const rows: ProjectionYear[] = [];
  for (let t = 1; t <= years; t += 1) {
    revenue *= 1 + company.growth;
    const margin = m0 + ((mT - m0) * Math.min(t, 5)) / 5;
    const ebitda = revenue * margin;
    const da = revenue * daPct;
    const ebit = ebitda - da;
    const taxes = Math.max(0, ebit) * ASSUMPTIONS.taxRate;
    const nopat = ebit - taxes;
    const capex = revenue * capexPct;
    const nwc = revenue * nwcPct;
    const deltaNwc = nwc - priorNwc;
    priorNwc = nwc;
    rows.push({
      year: 2025 + t,
      revenue,
      ebitda,
      margin,
      da,
      ebit,
      taxes,
      nopat,
      capex,
      deltaNwc,
      ufcf: nopat + da - capex - deltaNwc,
    });
  }
  return rows;
}

/* ---------- DCF ---------- */

export type DcfResult = {
  wacc: number;
  costOfEquity: number;
  rows: ProjectionYear[];
  pvFcf: number;
  gordon: { tv: number; pvTv: number; ev: number; equity: number; tvShare: number } | null;
  exit: { tv: number; pvTv: number; ev: number; equity: number; impliedGrowth: number };
  grid: { waccs: number[]; growths: number[]; ev: (number | null)[][] };
  range: { low: number; high: number };
};

function discountFactor(rate: number, t: number) {
  return 1 / (1 + rate) ** t;
}

function dcfEv(rows: ProjectionYear[], rate: number, g: number): number | null {
  if (rate <= g) return null;
  const n = rows.length;
  const pv = rows.reduce((sum, row, index) => sum + row.ufcf * discountFactor(rate, index + 1), 0);
  const last = rows[n - 1];
  const tv = (last.ufcf * (1 + g)) / (rate - g);
  return pv + tv * discountFactor(rate, n);
}

export function runDcf(target: Company, rows: ProjectionYear[], deal: Deal): DcfResult {
  const r = wacc(deal.rate);
  const n = rows.length;
  const g = ASSUMPTIONS.terminalGrowth;
  const pvFcf = rows.reduce((sum, row, index) => sum + row.ufcf * discountFactor(r, index + 1), 0);
  const last = rows[n - 1];
  const netDebt = target.debt - target.cash;
  let gordon: DcfResult['gordon'] = null;
  if (r > g) {
    const tv = (last.ufcf * (1 + g)) / (r - g);
    const pvTv = tv * discountFactor(r, n);
    const ev = pvFcf + pvTv;
    gordon = { tv, pvTv, ev, equity: ev - netDebt, tvShare: ev === 0 ? 0 : pvTv / ev };
  }
  const exitTv = last.ebitda * deal.exitMultiple;
  const exitPvTv = exitTv * discountFactor(r, n);
  const exitEv = pvFcf + exitPvTv;
  const impliedGrowth = (exitTv * r - last.ufcf) / (exitTv + last.ufcf);
  const waccs = [-0.02, -0.01, 0, 0.01, 0.02].map((step) => r + step);
  const growths = [0.015, 0.02, 0.025, 0.03, 0.035];
  const ev = growths.map((gg) => waccs.map((w) => dcfEv(rows, w, gg)));
  const inner = [ev[1][1], ev[1][3], ev[3][1], ev[3][3], exitEv].filter((v): v is number => v != null);
  return {
    wacc: r,
    costOfEquity: costOfEquity(),
    rows,
    pvFcf,
    gordon,
    exit: { tv: exitTv, pvTv: exitPvTv, ev: exitEv, equity: exitEv - netDebt, impliedGrowth },
    grid: { waccs, growths, ev },
    range: { low: Math.min(...inner), high: Math.max(...inner) },
  };
}

/* ---------- LBO ---------- */

export type LboYear = {
  year: number;
  ebitda: number;
  interest: number;
  taxes: number;
  capex: number;
  deltaNwc: number;
  fcf: number;
  mandatory: number;
  paydown: number;
  shortfall: number;
  closingDebt: number;
  cash: number;
  dscr: number;
};

export type LboResult = {
  ev: number;
  fees: number;
  debt: number;
  equity: number;
  sources: Array<{ name: string; amount: number }>;
  uses: Array<{ name: string; amount: number }>;
  years: LboYear[];
  exitEbitda: number;
  exitEv: number;
  exitEquity: number;
  moic: number | null;
  irr: number | null;
  minDscr: number;
  anyShortfall: boolean;
  maxMultipleAtTarget: number | null;
  grid: { entries: number[]; exits: number[]; irr: (number | null)[][] };
};

type LboCore = Omit<LboResult, 'maxMultipleAtTarget' | 'grid' | 'sources' | 'uses'>;

function lboCore(baseEbitda: number, rows: ProjectionYear[], deal: Deal, entryMultiple: number, exitMultiple: number): LboCore {
  const ev = entryMultiple * baseEbitda;
  const fees = ev * deal.feesPct;
  const debt = Math.max(0, Math.min(deal.leverage * baseEbitda, ev * ASSUMPTIONS.maxDebtShareOfPrice));
  const equity = ev + fees - debt;
  const mandatoryEach = debt / deal.termYears;
  let balance = debt;
  let cash = 0;
  const years: LboYear[] = [];
  for (let t = 0; t < deal.holdYears; t += 1) {
    const row = rows[t];
    const interest = balance * deal.rate;
    const taxes = Math.max(0, row.ebit - interest) * ASSUMPTIONS.taxRate;
    const fcf = row.ebitda - interest - taxes - row.capex - row.deltaNwc;
    const mandatory = Math.min(balance, mandatoryEach);
    const available = Math.max(0, fcf) + cash;
    const paydown = Math.min(balance, available);
    const shortfall = Math.max(0, mandatory - available);
    cash = available - paydown;
    balance -= paydown;
    const service = interest + mandatory;
    years.push({
      year: row.year,
      ebitda: row.ebitda,
      interest,
      taxes,
      capex: row.capex,
      deltaNwc: row.deltaNwc,
      fcf,
      mandatory,
      paydown,
      shortfall,
      closingDebt: balance,
      cash,
      dscr: service > 0 ? (row.ebitda - row.capex - taxes) / service : Infinity,
    });
  }
  const exitEbitda = rows[deal.holdYears - 1].ebitda;
  const exitEv = exitEbitda * exitMultiple;
  const exitEquity = exitEv - balance + cash;
  const moic = equity > 0 ? exitEquity / equity : null;
  const irr = moic != null && moic > 0 ? moic ** (1 / deal.holdYears) - 1 : null;
  return {
    ev,
    fees,
    debt,
    equity,
    years,
    exitEbitda,
    exitEv,
    exitEquity,
    moic,
    irr,
    minDscr: Math.min(...years.map((y) => y.dscr)),
    anyShortfall: years.some((y) => y.shortfall > 0),
  };
}

function maxMultipleForIrr(baseEbitda: number, rows: ProjectionYear[], deal: Deal, irrTarget: number): number | null {
  const irrAt = (m: number) => lboCore(baseEbitda, rows, deal, m, deal.exitMultiple).irr ?? -1;
  let low = 0.25;
  let high = 30;
  if (irrAt(low) < irrTarget) return null;
  if (irrAt(high) >= irrTarget) return high;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (irrAt(mid) >= irrTarget) low = mid;
    else high = mid;
  }
  return low;
}

/** Cash-free, debt-free: the seller pays off its own debt and keeps its cash at close. */
export function runLbo(baseEbitda: number, rows: ProjectionYear[], deal: Deal): LboResult {
  const core = lboCore(baseEbitda, rows, deal, deal.offerMultiple, deal.exitMultiple);
  const entries = [-1, -0.5, 0, 0.5, 1].map((s) => deal.offerMultiple + s).filter((m) => m > 0);
  const exits = [-1, -0.5, 0, 0.5, 1].map((s) => deal.exitMultiple + s).filter((m) => m > 0);
  const grid = exits.map((x) => entries.map((m) => lboCore(baseEbitda, rows, deal, m, x).irr));
  return {
    ...core,
    sources: [
      { name: 'Acquisition debt', amount: core.debt },
      { name: 'Buyer equity', amount: core.equity },
    ],
    uses: [
      { name: 'Purchase price (cash-free, debt-free)', amount: core.ev },
      { name: 'Deal fees', amount: core.fees },
    ],
    maxMultipleAtTarget: maxMultipleForIrr(baseEbitda, rows, deal, deal.targetIrr),
    grid: { entries, exits, irr: grid },
  };
}

/* ---------- Comps ---------- */

export type CompsResult = {
  sector: string;
  publicMultiple: number;
  discount: { low: number; high: number; band: string };
  multipleLow: number;
  multipleHigh: number;
  evLow: number;
  evHigh: number;
};

export function runComps(target: Company, ebitda: number): CompsResult | null {
  const info = industryInfo(target.industry);
  if (!info) return null;
  const discount = sizeDiscount(ebitda);
  const multipleLow = info.publicEvEbitda * (1 - discount.high);
  const multipleHigh = info.publicEvEbitda * (1 - discount.low);
  return {
    sector: info.damodaranSector,
    publicMultiple: info.publicEvEbitda,
    discount,
    multipleLow,
    multipleHigh,
    evLow: multipleLow * ebitda,
    evHigh: multipleHigh * ebitda,
  };
}

/* ---------- Synergies ---------- */

export type SynergyLine = {
  description: string;
  kind: 'cost' | 'revenue';
  stated: number;
  ebitdaImpact: number;
  kept: number;
};

export type SynergyResult = {
  lines: SynergyLine[];
  runRate: number;
  byYear: number[];
  integrationCost: number;
  valueAtOffer: number;
  netValue: number;
};

export function runSynergies(intake: Intake, deal: Deal, years: number): SynergyResult {
  const a = ASSUMPTIONS;
  const lines = intake.synergies.flatMap((line): SynergyLine[] => {
    const stated = num(line.amount);
    if (stated == null || stated <= 0 || !line.description.trim()) return [];
    const ebitdaImpact = line.kind === 'cost' ? stated : stated * a.revenueSynergyMargin;
    const kept = ebitdaImpact * (line.kind === 'cost' ? a.costSynergyRetained : a.revenueSynergyRetained);
    return [{ description: line.description.trim(), kind: line.kind, stated, ebitdaImpact, kept }];
  });
  const runRate = lines.reduce((sum, line) => sum + line.kept, 0);
  const byYear = Array.from({ length: years }, (_, i) => runRate * (a.synergyPhaseIn[i] ?? 1));
  const integrationCost = Math.max(0, num(intake.integrationCost) ?? 0);
  const valueAtOffer = runRate * deal.offerMultiple;
  return { lines, runRate, byYear, integrationCost, valueAtOffer, netValue: valueAtOffer - integrationCost };
}

/* ---------- Combined company ---------- */

export type ProFormaYear = {
  year: number;
  buyerEbitda: number;
  targetEbitda: number;
  synergies: number;
  revenue: number;
  ebitda: number;
};

export type ProForma = {
  years: ProFormaYear[];
  equityNeeded: number;
  buyerCash: number;
  cashLeft: number;
  debtAtClose: number;
  leverageAtClose: number;
  leverageBuyerToday: number;
  ebitdaAccretion: number;
  revenueAccretion: number;
};

export function runProForma(
  buyer: Company,
  buyerRows: ProjectionYear[],
  targetRows: ProjectionYear[],
  target: Company,
  synergies: SynergyResult,
  lbo: LboResult,
): ProForma {
  const years: ProFormaYear[] = [
    {
      year: 2025,
      buyerEbitda: buyer.ebitda[2],
      targetEbitda: target.ebitda[2],
      synergies: 0,
      revenue: buyer.revenue[2] + target.revenue[2],
      ebitda: buyer.ebitda[2] + target.ebitda[2],
    },
  ];
  for (let i = 0; i < 3; i += 1) {
    const b = buyerRows[i];
    const t = targetRows[i];
    const s = synergies.byYear[i] ?? 0;
    years.push({
      year: b.year,
      buyerEbitda: b.ebitda,
      targetEbitda: t.ebitda,
      synergies: s,
      revenue: b.revenue + t.revenue,
      ebitda: b.ebitda + t.ebitda + s,
    });
  }
  const debtAtClose = buyer.debt + lbo.debt;
  const combinedEbitda = buyer.ebitda[2] + target.ebitda[2];
  return {
    years,
    equityNeeded: lbo.equity,
    buyerCash: buyer.cash,
    cashLeft: buyer.cash - lbo.equity,
    debtAtClose,
    leverageAtClose: debtAtClose / combinedEbitda,
    leverageBuyerToday: buyer.debt / buyer.ebitda[2],
    ebitdaAccretion: (target.ebitda[2] + synergies.runRate) / buyer.ebitda[2],
    revenueAccretion: target.revenue[2] / buyer.revenue[2],
  };
}

/* ---------- Valuation summary ---------- */

export type FieldRow = {
  id: string;
  name: string;
  detail: string;
  low: number;
  high: number;
};

export type Analysis = {
  buyer: Company;
  target: Company;
  deal: Deal;
  verifiedEbitda: number;
  sellerEbitda: number | null;
  askingPrice: number | null;
  offerEv: number;
  earningsGap: { gap: number; overpay: number } | null;
  targetRows: ProjectionYear[];
  buyerRows: ProjectionYear[];
  dcf: DcfResult;
  lbo: LboResult;
  comps: CompsResult | null;
  precedents: { matched: CitedDeal[]; others: CitedDeal[] };
  synergies: SynergyResult;
  proForma: ProForma;
  fit: FitResult;
  field: FieldRow[];
  verdict: { tone: 'good' | 'caution' | 'risk'; headline: string; points: string[] };
};

function fmtM(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(value / 1_000).toLocaleString('en-US')}K`;
}

export function analyze(intake: Intake): Analysis | null {
  const missing: Missing[] = [];
  const buyer = parseCompany(intake.buyer, 'buyer', missing);
  const target = parseCompany(intake.target, 'target', missing);
  const deal = parseDeal(intake, missing);
  if (!buyer || !target || !deal || missing.length) return null;

  const years = Math.max(ASSUMPTIONS.projectionYears, deal.holdYears);
  const marginRaw = num(intake.target.marginTarget);
  const targetRows = project(target, years, marginRaw == null ? null : marginRaw / 100);
  const buyerRows = project(buyer, years, null);
  const verifiedEbitda = target.ebitda[2];
  const sellerRaw = num(intake.target.sellerEbitda);
  const sellerEbitda = sellerRaw != null && sellerRaw > 0 ? sellerRaw : null;
  const askingRaw = num(intake.target.askingPrice);
  const askingPrice = askingRaw != null && askingRaw > 0 ? askingRaw : null;
  const offerEv = deal.offerMultiple * verifiedEbitda;

  const dcf = runDcf(target, targetRows.slice(0, ASSUMPTIONS.projectionYears), deal);
  const lbo = runLbo(verifiedEbitda, targetRows, deal);
  const comps = runComps(target, verifiedEbitda);
  const neighbors = PRECEDENT_NEIGHBORS[target.industry] ?? [];
  const precedents = {
    matched: CITED_DEALS.filter((d) => neighbors.includes(d.industry)),
    others: CITED_DEALS.filter((d) => !neighbors.includes(d.industry)),
  };
  const synergies = runSynergies(intake, deal, years);
  const proForma = runProForma(buyer, buyerRows, targetRows, target, synergies, lbo);
  const fit = scoreFit(intake, buyer, target);

  const field: FieldRow[] = [];
  if (comps) {
    field.push({
      id: 'comps',
      name: 'Comparable companies',
      detail: `${comps.multipleLow.toFixed(1)}–${comps.multipleHigh.toFixed(1)}× after size discount`,
      low: comps.evLow,
      high: comps.evHigh,
    });
  }
  field.push({
    id: 'dcf',
    name: 'DCF, standalone',
    detail: `WACC ${(dcf.wacc * 100).toFixed(1)}% ± 1 pt, growth 2–3%, and exit-multiple method`,
    low: dcf.range.low,
    high: dcf.range.high,
  });
  const lboHigh = maxMultipleForIrr(verifiedEbitda, targetRows, deal, Math.max(0.01, deal.targetIrr - 0.05));
  const lboLow = maxMultipleForIrr(verifiedEbitda, targetRows, deal, deal.targetIrr + 0.05);
  if (lboHigh != null && lboLow != null) {
    field.push({
      id: 'lbo',
      name: 'LBO, what a financial buyer pays',
      detail: `${((deal.targetIrr - 0.05) * 100).toFixed(0)}–${((deal.targetIrr + 0.05) * 100).toFixed(0)}% return target`,
      low: lboLow * verifiedEbitda,
      high: lboHigh * verifiedEbitda,
    });
  }
  if (synergies.runRate > 0) {
    const pvSyn = synergies.runRate / (dcf.wacc - ASSUMPTIONS.terminalGrowth) - synergies.integrationCost;
    field.push({
      id: 'strategic',
      name: 'DCF plus kept synergies',
      detail: 'Value to you, the buyer. Not what you should pay.',
      low: dcf.range.low + pvSyn * 0.5,
      high: dcf.range.high + pvSyn,
    });
  }

  const earningsGap =
    sellerEbitda != null && sellerEbitda > verifiedEbitda
      ? { gap: sellerEbitda - verifiedEbitda, overpay: (sellerEbitda - verifiedEbitda) * deal.offerMultiple }
      : null;

  const points: string[] = [];
  const standaloneHigh = Math.max(...field.filter((f) => f.id !== 'strategic').map((f) => f.high));
  const standaloneLow = Math.min(...field.filter((f) => f.id !== 'strategic').map((f) => f.low));
  let tone: Analysis['verdict']['tone'] = 'good';
  let headline: string;
  if (offerEv > standaloneHigh) {
    tone = 'risk';
    headline = `Your ${fmtM(offerEv)} offer is above every standalone method.`;
    points.push('You would be paying the seller for synergies that only you can create.');
  } else if (offerEv < standaloneLow) {
    headline = `Your ${fmtM(offerEv)} offer is below every standalone method.`;
    points.push('That is room to negotiate, or a sign the seller will say no. Check the asking price.');
  } else {
    headline = `Your ${fmtM(offerEv)} offer sits inside the standalone range of ${fmtM(standaloneLow)}–${fmtM(standaloneHigh)}.`;
  }
  if (askingPrice != null) {
    const inside = askingPrice >= standaloneLow && askingPrice <= standaloneHigh;
    points.push(
      `The seller is asking ${fmtM(askingPrice)} (${(askingPrice / verifiedEbitda).toFixed(1)}× supported EBITDA), ${
        inside ? 'which is inside the standalone range' : askingPrice > standaloneHigh ? 'which is above every standalone method' : 'which is below every standalone method'
      }.`,
    );
  }
  if (lbo.irr != null) points.push(`At this price the deal returns ${(lbo.irr * 100).toFixed(1)}% a year on your equity over ${deal.holdYears} years.`);
  if (lbo.anyShortfall) {
    tone = 'risk';
    points.push('Cash flow does not cover the required loan payments in at least one year.');
  } else if (lbo.minDscr < 1.25) {
    if (tone === 'good') tone = 'caution';
    points.push(`Lowest debt coverage is ${lbo.minDscr.toFixed(2)}×, under the 1.25× most SBA lenders want.`);
  }
  if (earningsGap) {
    if (tone === 'good') tone = 'caution';
    points.push(
      `The seller claims ${fmtM(sellerEbitda!)} of EBITDA, but only ${fmtM(verifiedEbitda)} is supported. Paying on their number would cost ${fmtM(earningsGap.overpay)} extra.`,
    );
  }
  if (proForma.cashLeft < 0) {
    if (tone === 'good') tone = 'caution';
    points.push(`The equity check is ${fmtM(proForma.equityNeeded)}, more than the ${fmtM(buyer.cash)} of cash you have.`);
  }
  if (fit.score < 50) {
    if (tone === 'good') tone = 'caution';
    points.push('The qualitative fit is weak. See the Fit tab before you lean on synergies.');
  }

  return {
    buyer,
    target,
    deal,
    verifiedEbitda,
    sellerEbitda,
    askingPrice,
    offerEv,
    earningsGap,
    targetRows,
    buyerRows,
    dcf,
    lbo,
    comps,
    precedents,
    synergies,
    proForma,
    fit,
    field,
    verdict: { tone, headline, points },
  };
}
