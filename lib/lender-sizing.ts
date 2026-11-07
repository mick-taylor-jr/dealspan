// Port of the attached lender-sizing engine. Formulas and order of operations are unchanged.
// Prices are whole dollars. The earnings bridge keeps its own integer-cent math and only
// hands this engine a dollar earnings figure.

type LSInputs = {
  earnings_basis: string;
  earnings: number;
  owner_comp: number;
  owner_comp_in_earnings: boolean;
  maintenance_capex: number;
  transaction_type: string;
  target_dscr: number;
  real_estate_value: number;
  working_capital: number;
  closing_costs_fixed: number;
  closing_costs_pct_of_price: number;
  guaranty_fee_financed: boolean;
  guaranty_fee_exempt: boolean;
  prime_rate: number;
  sba_spread: number;
  sba_business_term_years: number;
  real_estate_term_years: number;
  sba_max_loan: number;
  required_injection_pct: number;
  buyer_equity_pct: number;
  buyer_max_cash: number | null;
  seller_note_method: string;
  seller_note_pct: number;
  seller_note_max_pct: number;
  seller_note_rate: number;
  seller_note_term_years: number;
  seller_note_standby: string;
  seller_note_standby_months: number;
  seller_note_interest_only: boolean;
  seller_note_floating: boolean;
  stress_bps: number[];
  business_valuation: number | null;
};

const LS_SBA_MAX_GUARANTY = 3750000.0;
const LS_LIMITED_SHARE = 0.5;
const LS_DSC_FLOOR: Record<string, number> = {
  initial_acquisition: 1.25,
  business_expansion: 1.15,
  owner_buyout: 1.25,
};
const LS_IO_MAX_AMORT = 10;

function lsPmt(r: number, n: number, p: number): number {
  if (p <= 0 || n <= 0) return 0.0;
  if (r === 0) return p / n;
  return (p * r) / (1.0 - Math.pow(1.0 + r, -n));
}

function lsAnnualDS(rate: number, years: number, p: number): number {
  return 12.0 * lsPmt(rate / 12.0, years * 12, p);
}

function lsDscr(cf: number, ds: number): number {
  return ds <= 0 ? Infinity : cf / ds;
}

function lsGuarPct(L: number): number {
  return L <= 150000.0 ? 0.85 : 0.75;
}

function lsGuarPortion(L: number): number {
  return Math.min(L * lsGuarPct(L), LS_SBA_MAX_GUARANTY);
}

function lsFee(L: number, exempt: boolean): number {
  if (L <= 0) return 0.0;
  if (exempt && L <= 700000.0) return 0.0;
  const g = lsGuarPortion(L);
  if (L <= 150000.0) return 0.02 * g;
  if (L <= 700000.0) return 0.03 * g;
  return 0.035 * Math.min(g, 1000000.0) + 0.0375 * Math.max(g - 1000000.0, 0.0);
}

function lsMaxSpread(L: number): number {
  return L <= 50000 ? 0.065 : L <= 250000 ? 0.06 : L <= 350000 ? 0.045 : 0.03;
}

function lsCashFlows(inp: LSInputs) {
  const deduction = inp.owner_comp_in_earnings ? 0.0 : inp.owner_comp;
  const ebitda = inp.earnings - deduction;
  return {
    owner_comp_deduction: deduction,
    ebitda_for_sba_test: ebitda,
    cfads: ebitda - inp.maintenance_capex,
  };
}

function lsStructure(price: number, inp: LSInputs, bump: number) {
  const P = Math.max(price, 0.0);
  const R = inp.real_estate_value,
    W = inp.working_capital;
  const C = inp.closing_costs_fixed + inp.closing_costs_pct_of_price * P;
  const baseUses = P + R + W + C;
  const fullStandby = inp.seller_note_standby === 'full_term';
  let G = 0.0,
    S = 0.0,
    Sprev = NaN,
    converged = false,
    it = 0;
  let TPC = 0,
    reqInj = 0,
    credit = 0,
    E = 0,
    Lneed = 0,
    L = 0,
    extra = 0,
    Etotal = 0;
  for (it = 1; it <= 200; it++) {
    TPC = baseUses + G;
    reqInj = inp.required_injection_pct * TPC;
    const feeCash = inp.guaranty_fee_financed ? 0.0 : G;
    if (inp.seller_note_method === 'percent') {
      S = inp.seller_note_pct * P;
    } else {
      const creditPrev = fullStandby ? Math.min(S, LS_LIMITED_SHARE * reqInj) : 0.0;
      const E0 = Math.max(inp.buyer_equity_pct * TPC, reqInj - creditPrev);
      const Lneed0 = TPC - E0 - feeCash;
      S = Math.min(Math.max(Lneed0 - inp.sba_max_loan, 0.0), inp.seller_note_max_pct * P);
    }
    credit = fullStandby ? Math.min(S, LS_LIMITED_SHARE * reqInj) : 0.0;
    E = Math.max(inp.buyer_equity_pct * TPC, reqInj - credit);
    Lneed = TPC - E - S - feeCash;
    L = Math.min(Math.max(Lneed, 0.0), inp.sba_max_loan);
    extra = Math.max(Lneed - inp.sba_max_loan, 0.0);
    if (Lneed < 0) E = E + Lneed;
    Etotal = E + extra;
    const Gnew = lsFee(L, inp.guaranty_fee_exempt);
    if (Math.abs(Gnew - G) < 1e-7 && Math.abs(S - Sprev) < 1e-7) {
      G = Gnew;
      converged = true;
      break;
    }
    Sprev = S;
    G = Gnew;
  }
  if (it > 200) it = 200;
  TPC = baseUses + G;
  reqInj = inp.required_injection_pct * TPC;
  credit = fullStandby ? Math.min(S, LS_LIMITED_SHARE * reqInj) : 0.0;
  const sbaYears =
    R > 0 && TPC > 0
      ? Math.floor((R * inp.real_estate_term_years + (TPC - R) * inp.sba_business_term_years) / TPC + 0.5)
      : inp.sba_business_term_years;
  const sbaRate = inp.prime_rate + inp.sba_spread + bump;
  const sbaDS = lsAnnualDS(sbaRate, sbaYears, L);
  const sRate = inp.seller_note_rate + (inp.seller_note_floating ? bump : 0.0);
  const sTermM = inp.seller_note_term_years * 12;
  let sY1 = 0.0,
    sDscr = 0.0,
    accrued = 0.0;
  if (S > 0) {
    if (inp.seller_note_standby === 'full_term') {
      accrued = S * Math.pow(1.0 + sRate / 12.0, sbaYears * 12);
    } else if (inp.seller_note_standby === 'partial') {
      const m = inp.seller_note_standby_months;
      const bal = S * Math.pow(1.0 + sRate / 12.0, m);
      const rem = Math.max(sTermM - m, 12);
      sY1 = m >= 12 ? 0.0 : 12.0 * lsPmt(sRate / 12.0, rem, bal) * ((12 - m) / 12.0);
      sDscr = 12.0 * lsPmt(sRate / 12.0, rem, bal);
    } else if (inp.seller_note_interest_only) {
      sY1 = S * sRate;
      sDscr = lsAnnualDS(sRate, Math.min(inp.seller_note_term_years, LS_IO_MAX_AMORT), S);
    } else {
      sY1 = lsAnnualDS(sRate, inp.seller_note_term_years, S);
      sDscr = sY1;
    }
  }
  const totalDS = sbaDS + sDscr;
  const cf = lsCashFlows(inp);
  const buyerCash = Etotal + (inp.guaranty_fee_financed ? 0.0 : G);
  const nonStandbySeller = fullStandby ? 0.0 : S;
  const valuation = inp.business_valuation !== null ? inp.business_valuation : P;
  return {
    price: P,
    uses: {
      purchase_price: P,
      real_estate: R,
      working_capital: W,
      closing_costs: C,
      sba_guaranty_fee: G,
      total_project_cost: TPC,
    },
    sources: { sba_7a: L, seller_note: S, buyer_equity: buyerCash },
    sba_cap_binding: Lneed >= inp.sba_max_loan - 1e-6 && L >= inp.sba_max_loan - 1e-6,
    equity: {
      required_injection: reqInj,
      standby_seller_credit: credit,
      buyer_cash: buyerCash,
      buyer_cash_pct_tpc: TPC ? buyerCash / TPC : 0.0,
      injection_satisfied: buyerCash + credit >= reqInj - 0.01,
      extra_equity_from_cap: extra,
    },
    sba: {
      rate: sbaRate,
      term_years: sbaYears,
      guaranty_pct: L > 0 ? lsGuarPct(L) : 0.0,
      guaranteed_portion: L > 0 ? lsGuarPortion(L) : 0.0,
      max_spread_allowed: lsMaxSpread(L),
      spread_ok: inp.sba_spread <= lsMaxSpread(L) + 1e-12,
      monthly_payment: lsPmt(sbaRate / 12.0, sbaYears * 12, L),
      annual_debt_service: sbaDS,
    },
    seller: {
      rate: sRate,
      term_years: inp.seller_note_term_years,
      standby: inp.seller_note_standby,
      annual_debt_service_in_dscr: sDscr,
      annual_debt_service_year1_actual: sY1,
      accrued_balance_at_sba_maturity: accrued,
    },
    debt_service_total: totalDS,
    cash_flow: cf,
    dscr: lsDscr(cf.cfads, totalDS),
    dscr_sba_basis: lsDscr(cf.ebitda_for_sba_test, totalDS),
    valuation_check: {
      business_valuation: valuation,
      total_debt_subject: L + nonStandbySeller,
      limit: valuation + R,
      ok: L + nonStandbySeller <= valuation + R + 0.01,
    },
    fixed_point: { iterations: it, converged: converged },
  };
}

type LSStructure = ReturnType<typeof lsStructure>;

function lsViolations(st: LSStructure, inp: LSInputs): string[] {
  const v: string[] = [];
  if (!st.fixed_point.converged) v.push('fee_fixed_point_not_converged');
  if (st.dscr < inp.target_dscr - 1e-12) v.push('target_dscr');
  const floor = LS_DSC_FLOOR[inp.transaction_type] !== undefined ? LS_DSC_FLOOR[inp.transaction_type] : 1.25;
  if (st.dscr_sba_basis < floor - 1e-12) v.push('sba_dsc_floor');
  if (inp.buyer_max_cash !== null && st.equity.buyer_cash > inp.buyer_max_cash + 1e-6)
    v.push('buyer_cash_available');
  return v;
}

function lsSolve(inp: LSInputs, bump: number) {
  const tol = 0.01,
    maxIter = 300;
  const cf = lsCashFlows(inp);
  if (cf.cfads <= 0)
    return {
      price: 0.0 as number | null,
      status: 'no_cash_flow',
      binding: ['non_positive_cfads'],
      iterations: 0,
      converged: true,
    };
  const v0 = lsViolations(lsStructure(0.0, inp, bump), inp);
  if (v0.length)
    return {
      price: 0.0 as number | null,
      status: 'infeasible_at_zero',
      binding: v0,
      iterations: 0,
      converged: true,
    };
  let lo = 0.0,
    hi = Math.max(1000000.0, 10.0 * cf.cfads);
  while (lsViolations(lsStructure(hi, inp, bump), inp).length === 0) {
    lo = hi;
    hi *= 2.0;
    if (hi > 1e10)
      return {
        price: null as number | null,
        status: 'unbounded',
        binding: [] as string[],
        iterations: 0,
        converged: false,
      };
  }
  let n = 0;
  while (hi - lo > tol && n < maxIter) {
    const mid = 0.5 * (lo + hi);
    if (lsViolations(lsStructure(mid, inp, bump), inp).length) hi = mid;
    else lo = mid;
    n++;
  }
  const price = Math.floor(lo);
  const converged = hi - lo <= tol && lsViolations(lsStructure(price, inp, bump), inp).length === 0;
  return {
    price: price as number | null,
    status: converged ? 'ok' : 'not_converged',
    binding: lsViolations(lsStructure(hi, inp, bump), inp),
    iterations: n,
    converged: converged,
  };
}

export const REPLACEMENT_WAGE_DOLLARS = 125_000;
export const TARGET_DSCR = 1.3;
export const SBA_DSCR_FLOOR = 1.25;

export function lenderInputs(earningsDollars: number): LSInputs {
  return {
    earnings_basis: 'SDE',
    earnings: earningsDollars,
    owner_comp: REPLACEMENT_WAGE_DOLLARS,
    owner_comp_in_earnings: false,
    maintenance_capex: 0,
    transaction_type: 'initial_acquisition',
    target_dscr: TARGET_DSCR,
    real_estate_value: 0,
    working_capital: 0,
    closing_costs_fixed: 0,
    closing_costs_pct_of_price: 0,
    guaranty_fee_financed: true,
    guaranty_fee_exempt: false,
    prime_rate: 0.07,
    sba_spread: 0.03,
    sba_business_term_years: 10,
    real_estate_term_years: 25,
    sba_max_loan: 5_000_000,
    required_injection_pct: 0.1,
    buyer_equity_pct: 0.1,
    buyer_max_cash: null,
    seller_note_method: 'percent',
    seller_note_pct: 0.1,
    seller_note_max_pct: 0.1,
    seller_note_rate: 0.07,
    seller_note_term_years: 7,
    seller_note_standby: 'none',
    seller_note_standby_months: 0,
    seller_note_interest_only: false,
    seller_note_floating: false,
    stress_bps: [200, 250, 300],
    business_valuation: null,
  };
}

export type SizedLoan = {
  status: string;
  priceDollars: number | null;
  dscr: number | null;
  cfadsDollars: number;
  earningsAfterWageDollars: number;
  wageDeductionDollars: number;
};

export function sizePurchase(earningsDollars: number, bump = 0): SizedLoan {
  const inp = lenderInputs(earningsDollars);
  const flows = lsCashFlows(inp);
  const solved = lsSolve(inp, bump);
  const dscr =
    solved.price != null && solved.status === 'ok' ? lsStructure(solved.price, inp, bump).dscr : null;
  return {
    status: solved.status,
    priceDollars: solved.price,
    dscr,
    cfadsDollars: flows.cfads,
    earningsAfterWageDollars: flows.ebitda_for_sba_test,
    wageDeductionDollars: flows.owner_comp_deduction,
  };
}
