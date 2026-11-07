/**
 * Every assumption the models use that the user does not type. Each one is shown on screen,
 * labeled "assumed", next to the number it affects.
 */
export const ASSUMPTIONS = {
  taxRate: 0.21,
  riskFree: 0.045,
  beta: 1.0,
  equityRiskPremium: 0.05,
  sizePremium: 0.06,
  companySpecific: 0.08,
  debtWeight: 0.3,
  terminalGrowth: 0.025,
  projectionYears: 5,
  costSynergyRetained: 0.8,
  revenueSynergyRetained: 0.5,
  revenueSynergyMargin: 0.3,
  synergyPhaseIn: [0.5, 1, 1, 1, 1, 1, 1],
  maxDebtShareOfPrice: 0.9,
} as const;

export const ASSUMPTION_NOTES: Array<{ name: string; value: string; why: string }> = [
  { name: 'Tax rate', value: '21%', why: 'Federal corporate rate. Used for every model.' },
  { name: 'Risk-free rate', value: '4.5%', why: 'Roughly the 10-year Treasury yield.' },
  { name: 'Beta', value: '1.0', why: 'Market-average risk before small-company premiums.' },
  { name: 'Equity risk premium', value: '5.0%', why: 'Common long-run estimate.' },
  { name: 'Size premium', value: '6.0%', why: 'Small private companies are riskier than public ones.' },
  {
    name: 'Company-specific premium',
    value: '8.0%',
    why: 'Owner dependence, thin management, customer concentration.',
  },
  { name: 'Debt share of capital', value: '30%', why: 'Weight on debt in the discount rate.' },
  { name: 'Terminal growth', value: '2.5%', why: 'Long-run growth after year 5, near inflation.' },
  { name: 'Cost savings we count', value: '80%', why: 'Cost savings usually show up, but rarely in full.' },
  {
    name: 'New revenue we count',
    value: '50%',
    why: 'Selling to each other’s customers is the least reliable synergy.',
  },
  { name: 'Margin on new revenue', value: '30%', why: 'New revenue still carries labor and materials cost.' },
  { name: 'Synergy timing', value: '50% in year 1, then 100%', why: 'Combining two companies takes time.' },
  { name: 'Loan coverage we aim for', value: '1.50×', why: 'Room for a bad year, above the SBA minimum.' },
];

/** Size discount applied to public multiples, by target EBITDA. */
export function sizeDiscount(ebitda: number): { low: number; high: number; band: string } {
  if (ebitda < 1_000_000) return { low: 0.6, high: 0.75, band: 'EBITDA under $1M' };
  if (ebitda < 5_000_000) return { low: 0.45, high: 0.6, band: 'EBITDA $1–5M' };
  return { low: 0.3, high: 0.45, band: 'EBITDA over $5M' };
}

export function costOfEquity(): number {
  const a = ASSUMPTIONS;
  return a.riskFree + a.beta * a.equityRiskPremium + a.sizePremium + a.companySpecific;
}

export function wacc(preTaxCostOfDebt: number): number {
  const a = ASSUMPTIONS;
  return (1 - a.debtWeight) * costOfEquity() + a.debtWeight * preTaxCostOfDebt * (1 - a.taxRate);
}
