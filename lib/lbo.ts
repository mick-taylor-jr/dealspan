export type LboInput = {
  debtRaw: string;
  rateBps: number | null;
  amortYears: number | null;
  holdYears: number;
  exitThousandths: number | null;
  growthBps: number | null;
  taxBps: number;
};

export function emptyLbo(): LboInput {
  return {
    debtRaw: '',
    rateBps: null,
    amortYears: null,
    holdYears: 5,
    exitThousandths: null,
    growthBps: null,
    taxBps: 2_500,
  };
}

export type LboRun = {
  equityCents: number;
  entryMultipleThousandths: number;
  exitEquityCents: number;
  moicThousandths: number;
  irrBps: number | null;
  endingDebtCents: number;
};

function npv(rateBps: number, flows: number[]): number {
  const den = 10_000 + rateBps;
  let total = 0;
  let scale = 1;
  flows.forEach((flow, index) => {
    if (index === 0) {
      total += flow;
      return;
    }
    scale = (scale * den) / 10_000;
    total += flow / scale;
  });
  return total;
}

function irrBps(flows: number[]): number | null {
  const hasPositive = flows.some((flow) => flow > 0);
  const hasNegative = flows.some((flow) => flow < 0);
  if (!hasPositive || !hasNegative) return null;
  let low = -9_999;
  let high = 200_000;
  if (npv(low, flows) * npv(high, flows) > 0) return null;
  for (let step = 0; step < 40; step += 1) {
    const mid = Math.round((low + high) / 2);
    if (npv(mid, flows) > 0) low = mid;
    else high = mid;
  }
  return high;
}

export function runLbo(input: LboInput, ebitdaCents: number, priceCents: number): LboRun | null {
  if (!/^\d+$/.test(input.debtRaw)) return null;
  const debt = Number(input.debtRaw) * 100;
  if (
    !Number.isSafeInteger(debt) ||
    debt <= 0 ||
    debt >= priceCents ||
    input.rateBps == null ||
    input.amortYears == null ||
    input.exitThousandths == null ||
    input.growthBps == null ||
    input.amortYears <= 0 ||
    ebitdaCents <= 0
  ) {
    return null;
  }
  const equity = priceCents - debt;
  if (equity <= 0) return null;
  let balance = debt;
  let ebitda = ebitdaCents;
  const mandatory = Math.round(debt / input.amortYears);
  for (let year = 1; year <= input.holdYears; year += 1) {
    ebitda = Math.round((ebitda * (10_000 + input.growthBps)) / 10_000);
    const interest = Math.round((balance * input.rateBps) / 10_000);
    const taxable = Math.max(0, ebitda - interest);
    const tax = Math.round((taxable * input.taxBps) / 10_000);
    const cadp = ebitda - interest - tax;
    const paydown = Math.min(balance, mandatory, Math.max(0, cadp));
    if (cadp < paydown) return null;
    balance -= paydown;
  }
  const exitEv = Math.round((ebitda * input.exitThousandths) / 1_000);
  const exitEquity = exitEv - balance;
  if (exitEquity <= 0) return null;
  const flows = Array.from({ length: input.holdYears + 1 }, () => 0);
  flows[0] = -equity;
  flows[input.holdYears] = exitEquity;
  return {
    equityCents: equity,
    entryMultipleThousandths: Math.round((priceCents * 1_000) / ebitdaCents),
    exitEquityCents: exitEquity,
    moicThousandths: Math.round((exitEquity * 1_000) / equity),
    irrBps: irrBps(flows),
    endingDebtCents: balance,
  };
}
