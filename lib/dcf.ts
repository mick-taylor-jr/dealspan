export type DcfInput = {
  rfBps: number;
  betaThousandths: number;
  erpBps: number;
  sizeBps: number;
  companyBps: number;
  taxBps: number;
  wdBps: number;
  kdBps: number;
  growthBps: number;
  daBps: number;
  capexBps: number;
  nwcBps: number;
  gBps: number;
  exitThousandths: number;
};

export function defaultDcf(): DcfInput {
  return {
    rfBps: 400,
    betaThousandths: 1_000,
    erpBps: 500,
    sizeBps: 500,
    companyBps: 200,
    taxBps: 2_100,
    wdBps: 2_500,
    kdBps: 1_000,
    growthBps: 0,
    daBps: 0,
    capexBps: 0,
    nwcBps: 0,
    gBps: 250,
    exitThousandths: 6_000,
  };
}

export type DcfPoint = {
  waccBps: number;
  equityCents: number | null;
  invalid: boolean;
};

export type DcfRun = {
  marginBps: number;
  keBps: number;
  waccBps: number;
  years: Array<{ fcffCents: number; ebitdaCents: number }>;
  gordonEvCents: number | null;
  exitEvCents: number;
  gordonEquityCents: number | null;
  exitEquityCents: number;
  exitTerminalCents: number;
  impliedGBps: number | null;
  methodsReconcile: boolean;
  grid: DcfPoint[][];
  envelope: { lowCents: number; highCents: number } | null;
};

const ZERO = BigInt(0);
const TEN_THOUSAND = BigInt(10_000);
const TWO = BigInt(2);

function mulBps(cents: bigint, bps: bigint): bigint {
  const product = cents * bps;
  const negative = product < ZERO;
  const abs = negative ? -product : product;
  const rounded = (abs + TEN_THOUSAND / TWO) / TEN_THOUSAND;
  return negative ? -rounded : rounded;
}

function discount(cents: bigint, waccBps: bigint, year: number): bigint {
  let value = cents;
  const den = TEN_THOUSAND + waccBps;
  for (let step = 0; step < year; step += 1) {
    const negative = value < ZERO;
    const abs = negative ? -value : value;
    const rounded = (abs * TEN_THOUSAND + den / TWO) / den;
    value = negative ? -rounded : rounded;
  }
  return value;
}

export function runDcf(
  input: DcfInput,
  revenueCents: number,
  ebitdaCents: number,
  debtCents = 0,
  cashCents = 0,
): DcfRun | null {
  if (revenueCents <= 0 || ebitdaCents <= 0) return null;
  const marginBps = Math.round((ebitdaCents * 10_000) / revenueCents);
  const keBps =
    input.rfBps +
    Math.round((input.betaThousandths * input.erpBps) / 1_000) +
    input.sizeBps +
    input.companyBps;
  const weBps = 10_000 - input.wdBps;
  const afterTaxKd = Math.round((input.kdBps * (10_000 - input.taxBps)) / 10_000);
  const waccBps = Math.round((weBps * keBps) / 10_000) + Math.round((input.wdBps * afterTaxKd) / 10_000);
  if (waccBps <= 0) return null;

  let revenue = BigInt(revenueCents);
  const years: Array<{ fcffCents: number; ebitdaCents: number }> = [];
  let priorNwc = mulBps(revenue, BigInt(input.nwcBps));
  for (let year = 1; year <= 5; year += 1) {
    revenue = mulBps(revenue, BigInt(10_000 + input.growthBps));
    const ebitda = mulBps(revenue, BigInt(marginBps));
    const da = mulBps(revenue, BigInt(input.daBps));
    const ebit = ebitda - da;
    const tax = ebit > ZERO ? mulBps(ebit, BigInt(input.taxBps)) : ZERO;
    const nopat = ebit - tax;
    const capex = mulBps(revenue, BigInt(input.capexBps));
    const nwc = mulBps(revenue, BigInt(input.nwcBps));
    const deltaNwc = nwc - priorNwc;
    priorNwc = nwc;
    const fcff = nopat + da - capex - deltaNwc;
    years.push({ fcffCents: Number(fcff), ebitdaCents: Number(ebitda) });
  }

  const wacc = BigInt(waccBps);
  let pvFcff = ZERO;
  years.forEach((year, index) => {
    pvFcff += discount(BigInt(year.fcffCents), wacc, index + 1);
  });
  const last = years[4];
  if (!last) return null;
  const exitTv = (BigInt(last.ebitdaCents) * BigInt(input.exitThousandths)) / BigInt(1_000);
  const exitEv = pvFcff + discount(exitTv, wacc, 5);
  const fcffLast = BigInt(last.fcffCents);
  const impliedDen = exitTv + fcffLast;
  const impliedGBps =
    impliedDen === ZERO
      ? null
      : Number(((exitTv * BigInt(waccBps)) / TEN_THOUSAND - fcffLast) * TEN_THOUSAND / impliedDen);
  let gordonEv: bigint | null = null;
  if (input.gBps > -10_000 && input.gBps < waccBps) {
    const gordonTv = (BigInt(last.fcffCents) * BigInt(10_000 + input.gBps)) / BigInt(waccBps - input.gBps);
    gordonEv = pvFcff + discount(gordonTv, wacc, 5);
  }
  const methodsReconcile = impliedGBps != null && impliedGBps > -10_000 && impliedGBps < waccBps && gordonEv != null;

  const debtLike = BigInt(debtCents - cashCents);
  const waccSteps = [-100, -50, 0, 50, 100];
  const gSteps = [-50, -25, 0, 25, 50];
  const cells: number[] = [];
  const grid = gSteps.map((gStep) =>
    waccSteps.map((waccStep) => {
      const cellWacc = waccBps + waccStep;
      const cellG = input.gBps + gStep;
      if (cellWacc <= 0 || cellG <= -10_000 || cellG >= cellWacc || gordonEv == null) {
        return { waccBps: cellWacc, equityCents: null, invalid: true };
      }
      const spread = BigInt(cellWacc);
      let cellPv = ZERO;
      years.forEach((year, index) => {
        cellPv += discount(BigInt(year.fcffCents), spread, index + 1);
      });
      const tv = (BigInt(last.fcffCents) * BigInt(10_000 + cellG)) / BigInt(cellWacc - cellG);
      const equity = cellPv + discount(tv, spread, 5) - debtLike;
      const cents = Number(equity);
      cells.push(cents);
      return { waccBps: cellWacc, equityCents: cents, invalid: false };
    }),
  );

  return {
    marginBps,
    keBps,
    waccBps,
    years,
    gordonEvCents: gordonEv == null ? null : Number(gordonEv),
    exitEvCents: Number(exitEv),
    gordonEquityCents: gordonEv == null ? null : Number(gordonEv - debtLike),
    exitEquityCents: Number(exitEv - debtLike),
    exitTerminalCents: Number(exitTv),
    impliedGBps,
    methodsReconcile,
    grid,
    envelope: cells.length === 0 ? null : { lowCents: Math.min(...cells), highCents: Math.max(...cells) },
  };
}
