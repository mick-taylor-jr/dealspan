export type Label = 'user-entered' | 'calculated' | 'assumed' | 'cited';

export const YEARS = [2023, 2024, 2025] as const;

/** Money and percent fields are kept as the raw strings the user typed. Blank never becomes zero silently. */
export type CompanyInput = {
  name: string;
  description: string;
  industry: string;
  location: string;
  customers: string;
  employees: string;
  revenue: [string, string, string];
  ebitda: [string, string, string];
  da: string;
  capex: string;
  nwc: string;
  debt: string;
  cash: string;
  debtRate: string;
  growth: string;
};

export type TargetExtras = {
  sellerEbitda: string;
  askingPrice: string;
  marginTarget: string;
};

export type DealInput = {
  offerMultiple: string;
  feesPct: string;
  leverage: string;
  rate: string;
  termYears: string;
  exitMultiple: string;
  holdYears: string;
  targetIrr: string;
};

export type SynergyInput = {
  id: string;
  kind: 'cost' | 'revenue';
  description: string;
  amount: string;
};

export type Level = '' | 'low' | 'medium' | 'high';

export type FitInput = {
  customerOverlap: Level;
  crossSell: Level;
  geography: '' | 'same' | 'adjacent' | 'new';
  serviceFit: '' | 'same' | 'complementary' | 'unrelated';
  ownerDependence: Level;
  topCustomerPct: string;
  recurringPct: string;
  keyPeople: '' | 'staying' | 'unsure' | 'leaving';
  culture: '' | 'strong' | 'workable' | 'weak';
  integration: Level;
  thesis: string;
};

export type Intake = {
  demo: boolean;
  buyer: CompanyInput;
  target: CompanyInput & TargetExtras;
  deal: DealInput;
  synergies: SynergyInput[];
  integrationCost: string;
  fit: FitInput;
};

export function emptyCompany(): CompanyInput {
  return {
    name: '',
    description: '',
    industry: '',
    location: '',
    customers: '',
    employees: '',
    revenue: ['', '', ''],
    ebitda: ['', '', ''],
    da: '',
    capex: '',
    nwc: '',
    debt: '',
    cash: '',
    debtRate: '',
    growth: '',
  };
}

export function emptyIntake(): Intake {
  return {
    demo: false,
    buyer: emptyCompany(),
    target: { ...emptyCompany(), sellerEbitda: '', askingPrice: '', marginTarget: '' },
    deal: {
      offerMultiple: '',
      feesPct: '3',
      leverage: '',
      rate: '',
      termYears: '7',
      exitMultiple: '',
      holdYears: '5',
      targetIrr: '25',
    },
    synergies: [
      { id: 's1', kind: 'cost', description: '', amount: '' },
      { id: 's2', kind: 'revenue', description: '', amount: '' },
    ],
    integrationCost: '',
    fit: {
      customerOverlap: '',
      crossSell: '',
      geography: '',
      serviceFit: '',
      ownerDependence: '',
      topCustomerPct: '',
      recurringPct: '',
      keyPeople: '',
      culture: '',
      integration: '',
      thesis: '',
    },
  };
}

/** Parse a typed dollar or percent string. Returns null for blank or junk. */
export function num(raw: string): number | null {
  const cleaned = (raw ?? '').replace(/[$,%x×\s]/gi, '');
  if (cleaned === '' || !/^-?\d*(\.\d+)?$/.test(cleaned) || cleaned === '-') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
