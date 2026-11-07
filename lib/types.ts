export type ProvenanceLabel = 'extracted' | 'calculated' | 'assumed' | 'user-entered';

export type Unit = 'USD' | 'USD_thousands' | 'USD_millions';

export type BuyerType = 'searcher' | 'sba' | 'independent_sponsor' | 'strategic_add_on';

export type Metric = 'SDE' | 'EBITDA';

export type AddBackCategory =
  | 'owner_comp'
  | 'owner_perk'
  | 'personal'
  | 'one_time'
  | 'related_party'
  | 'projected_savings'
  | 'unreported_cash'
  | 'other';

export type AddBackInput = {
  id: string;
  description: string;
  shortName: string;
  amountRaw: string;
  unit: Unit | '';
  yearsRaw: string;
  category: AddBackCategory | '';
  role: string;
  functionLabel: string;
  claimedOneTime: boolean;
  documented: boolean;
  replacementRaw: string;
};

export type Intake = {
  exampleId: 'greenridge' | null;
  buyerName: string;
  buyerDescription: string;
  buyerIndustry: string;
  buyerMarket: string;
  buyerCustomers: string;
  buyerRevenueRaw: string;
  buyerEbitdaRaw: string;
  buyerDebtRaw: string;
  buyerCashRaw: string;
  buyerGrowthRaw: string;
  sharedCustomers: string;
  territoryOverlap: string;
  opsOverlap: string;
  targetName: string;
  targetDescription: string;
  industry: string;
  targetMarket: string;
  targetCustomers: string;
  metric: Metric;
  fromYear: number;
  toYear: number;
  claimPeriod: string;
  claimedEarningsRaw: string;
  claimedEarningsUnit: Unit | '';
  buyerType: BuyerType;
  multipleRaw: string;
  revenueRaw: string;
  revenueUnit: Unit | '';
  targetDebtRaw: string;
  targetCashRaw: string;
  targetGrowthRaw: string;
  costSynergyRaw: string;
  costSynergyName: string;
  revenueSynergyRaw: string;
  revenueSynergyName: string;
  reportedBasis: 'tax_return_profit' | 'pnl_profit';
  pnlProfitRaw: string;
  taxProfitRaw: string;
  depositsRaw: string;
  receiptsRaw: string;
  proofUnit: Unit | '';
  pnlFileName: string | null;
  taxFileName: string | null;
  depositsFileName: string | null;
  lines: AddBackInput[];
};

export type LabeledCents = {
  cents: number;
  label: ProvenanceLabel;
  source: string;
  location: string;
};

export type MissingFigure = {
  missing: true;
  source: string;
  location: string;
};

export type Figure = ({ missing: false } & LabeledCents) | MissingFigure;

export function blankLine(): AddBackInput {
  return {
    id: `line-${crypto.randomUUID()}`,
    description: '',
    shortName: '',
    amountRaw: '',
    unit: 'USD',
    yearsRaw: '',
    category: '',
    role: '',
    functionLabel: '',
    claimedOneTime: false,
    documented: false,
    replacementRaw: '',
  };
}

export function emptyIntake(): Intake {
  return {
    exampleId: null,
    buyerName: '',
    buyerDescription: '',
    buyerIndustry: '',
    buyerMarket: '',
    buyerCustomers: '',
    buyerRevenueRaw: '',
    buyerEbitdaRaw: '',
    buyerDebtRaw: '',
    buyerCashRaw: '',
    buyerGrowthRaw: '',
    sharedCustomers: '',
    territoryOverlap: '',
    opsOverlap: '',
    targetName: '',
    targetDescription: '',
    industry: '',
    targetMarket: '',
    targetCustomers: '',
    targetDebtRaw: '',
    targetCashRaw: '',
    targetGrowthRaw: '',
    costSynergyRaw: '',
    costSynergyName: '',
    revenueSynergyRaw: '',
    revenueSynergyName: '',
    metric: 'EBITDA',
    fromYear: 2023,
    toYear: 2025,
    claimPeriod: '',
    claimedEarningsRaw: '',
    claimedEarningsUnit: 'USD',
    buyerType: 'sba',
    multipleRaw: '',
    revenueRaw: '',
    revenueUnit: 'USD',
    reportedBasis: 'tax_return_profit',
    pnlProfitRaw: '',
    taxProfitRaw: '',
    depositsRaw: '',
    receiptsRaw: '',
    proofUnit: 'USD',
    pnlFileName: null,
    taxFileName: null,
    depositsFileName: null,
    lines: [],
  };
}
