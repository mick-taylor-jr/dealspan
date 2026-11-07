/**
 * How much of the price to borrow. Rules from SBA SOP 50 10 8.1 (effective Oct 1, 2026) for 7(a)
 * change-of-ownership loans, applied to the target's last full year of EBITDA (lenders may not use
 * projections to meet the coverage test).
 */
export const SBA = {
  maxLoan: 5_000_000,
  termYears: 10,
  equityInjection: 0.1,
  coverageInitial: 1.25,
  coverageExpansion: 1.15,
  primeRate: 0.07,
  maxSpread: 0.03,
  comfortableCoverage: 1.5,
};

export const FINANCING_SOURCES = [
  {
    id: 'coverage',
    claim:
      'Debt coverage of at least 1.25× for a first-time acquisition, 1.15× when an existing business buys another in its industry, measured on last year’s results, not projections',
    source: 'SBA SOP 50 10 8.1, Appendix 15 (effective Oct 1, 2026), summarized by Starfield & Smith',
    url: 'https://starfieldsmith.com/2026/09/best-practices-change-of-ownership-transactions-under-sop-50-10-8-1-what-sba-lenders-need-to-know/',
  },
  {
    id: 'categories',
    claim: 'Category table: Initial Acquisition 1.25×, Business Expansion 1.15×, 10% equity injection',
    source: 'Accredited, “New SBA Rules for Business Acquisitions Take Effect October 1, 2026”',
    url: 'https://joinaccredited.com/blog/sba-sop-50-10-8-1-acquisition-rules',
  },
  {
    id: 'equity',
    claim:
      'At least 10% of the total project cost from the buyer; a seller note can cover up to half of that only if it takes no payments for the life of the SBA loan',
    source: 'SBA SOP 50 10 8, summarized by Starfield & Smith',
    url: 'https://starfieldsmith.com/2025/05/best-practices-a-review-of-equity-injection-requirements-under-sop-50-10-8/',
  },
  {
    id: 'limits',
    claim:
      '7(a) loans up to $5 million; business acquisitions usually repaid over 10 years; maximum rate prime + 3% on loans over $350,000',
    source: 'SBA7a.loans, rate caps checked against 13 CFR 120.214(d)',
    url: 'https://www.sba7a.loans/sba-7a-loans-small-business-blog/what-is-the-sba-7a-loan-interest-rate/',
  },
  {
    id: 'term',
    claim: 'Business acquisition loans run up to 10 years (25 with real estate)',
    source: 'Bay Street Lending, SBA loan rates and terms',
    url: 'https://www.baystreetlending.com/lending-resources/sba-loan-rates-and-terms',
  },
  {
    id: 'prime',
    claim: 'Prime rate 7.00% after the Fed held rates on October 28, 2026',
    source: 'PrimeRates.com',
    url: 'https://primerates.com/?p=14019',
  },
];

export type Financing = {
  category: 'Business expansion' | 'Initial acquisition';
  coverageFloor: number;
  projectCost: number;
  minEquity: number;
  sellerNoteMax: number;
  rate: number;
  rateCap: number;
  annualPaymentPerDollar: number;
  maxByCoverage: number;
  maxLoan: number;
  maxLoanReason: 'coverage' | 'equity' | 'sba cap';
  recommendedLoan: number;
  recommendedReason: 'comfort' | 'max';
  recommendedPayment: number;
  recommendedCoverage: number;
  buyerCash: number;
  plannedLoan: number;
  plannedCoverage: number;
  plannedOk: boolean;
  cashOnHand: number;
};

function annuity(rate: number, years: number) {
  if (rate === 0) return 1 / years;
  return rate / (1 - (1 + rate) ** -years);
}

export function runFinancing(args: {
  ebitda: number;
  price: number;
  fees: number;
  rate: number;
  plannedLoan: number;
  sameIndustry: boolean;
  buyerType: 'strategic' | 'financial' | 'individual';
  cashOnHand: number;
}): Financing {
  const expansion = args.buyerType === 'strategic' && args.sameIndustry;
  const coverageFloor = expansion ? SBA.coverageExpansion : SBA.coverageInitial;
  const projectCost = args.price + args.fees;
  const minEquity = projectCost * SBA.equityInjection;
  const k = annuity(args.rate, SBA.termYears);
  const maxByCoverage = args.ebitda / coverageFloor / k;
  const caps: Array<[number, Financing['maxLoanReason']]> = [
    [maxByCoverage, 'coverage'],
    [projectCost - minEquity, 'equity'],
    [SBA.maxLoan, 'sba cap'],
  ];
  const [maxLoanRaw, maxLoanReason] = caps.reduce((a, b) => (b[0] < a[0] ? b : a));
  const maxLoan = Math.max(0, Math.floor(maxLoanRaw / 5_000) * 5_000);
  const comfortable = Math.floor(args.ebitda / SBA.comfortableCoverage / k / 5_000) * 5_000;
  const recommendedLoan = Math.max(0, Math.min(maxLoan, comfortable));
  const recommendedPayment = recommendedLoan * k;
  return {
    category: expansion ? 'Business expansion' : 'Initial acquisition',
    coverageFloor,
    projectCost,
    minEquity,
    sellerNoteMax: minEquity / 2,
    rate: args.rate,
    rateCap: SBA.primeRate + SBA.maxSpread,
    annualPaymentPerDollar: k,
    maxByCoverage,
    maxLoan,
    maxLoanReason,
    recommendedLoan,
    recommendedReason: recommendedLoan < maxLoan ? 'comfort' : 'max',
    recommendedPayment,
    recommendedCoverage: recommendedPayment > 0 ? args.ebitda / recommendedPayment : Infinity,
    buyerCash: projectCost - recommendedLoan,
    plannedLoan: args.plannedLoan,
    plannedCoverage: args.plannedLoan > 0 ? args.ebitda / (args.plannedLoan * k) : Infinity,
    plannedOk: args.plannedLoan <= maxLoan,
    cashOnHand: args.cashOnHand,
  };
}
