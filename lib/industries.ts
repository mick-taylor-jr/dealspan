/**
 * Industries match the "Industry" column of the DealSpan comparable deals workbook, so the similarity
 * scoring can compare like with like.
 *
 * Public-company reference multiples: Aswath Damodaran, "Enterprise Value Multiples by Sector (US)",
 * January 2026, EV/EBITDA for positive-EBITDA firms. Shown as a reference only, never used to price a
 * small business directly.
 */
export type IndustryInfo = {
  name: string;
  label: string;
  damodaranSector: string;
  publicEvEbitda: number;
};

export const INDUSTRIES: IndustryInfo[] = [
  {
    name: 'Home & commercial services (HVAC, plumbing, electrical)',
    label: 'Home & commercial services (HVAC, plumbing, electrical, landscaping)',
    damodaranSector: 'Engineering/Construction',
    publicEvEbitda: 17.18,
  },
  {
    name: 'Business services',
    label: 'Business services',
    damodaranSector: 'Business & Consumer Services',
    publicEvEbitda: 14.26,
  },
  {
    name: 'IT services / managed service provider',
    label: 'IT services / managed service provider',
    damodaranSector: 'Computer Services',
    publicEvEbitda: 14.1,
  },
  {
    name: 'Software / SaaS',
    label: 'Software / SaaS',
    damodaranSector: 'Software (System & Application)',
    publicEvEbitda: 24.48,
  },
  {
    name: 'Healthcare services',
    label: 'Healthcare services',
    damodaranSector: 'Healthcare Support Services',
    publicEvEbitda: 11.17,
  },
  {
    name: 'Industrial manufacturing',
    label: 'Industrial manufacturing',
    damodaranSector: 'Machinery',
    publicEvEbitda: 16.22,
  },
  {
    name: 'Wholesale / distribution',
    label: 'Wholesale / distribution',
    damodaranSector: 'Retail (Distributors)',
    publicEvEbitda: 13.71,
  },
  { name: 'Restaurants', label: 'Restaurants', damodaranSector: 'Restaurant/Dining', publicEvEbitda: 17.49 },
  {
    name: 'Trucking / logistics',
    label: 'Trucking / logistics',
    damodaranSector: 'Trucking',
    publicEvEbitda: 10.41,
  },
  {
    name: 'Environmental & waste services',
    label: 'Environmental & waste services',
    damodaranSector: 'Environmental & Waste Services',
    publicEvEbitda: 15.61,
  },
  {
    name: 'Building products',
    label: 'Building products',
    damodaranSector: 'Building Materials',
    publicEvEbitda: 11.61,
  },
  {
    name: 'Education / training',
    label: 'Education / training',
    damodaranSector: 'Education',
    publicEvEbitda: 9.26,
  },
  {
    name: 'Specialty retail',
    label: 'Specialty retail',
    damodaranSector: 'Retail (Special Lines)',
    publicEvEbitda: 11.47,
  },
  {
    name: 'Marketing / advertising agency',
    label: 'Marketing / advertising agency',
    damodaranSector: 'Advertising',
    publicEvEbitda: 12.0,
  },
  {
    name: 'Food manufacturing',
    label: 'Food manufacturing',
    damodaranSector: 'Food Processing',
    publicEvEbitda: 10.01,
  },
];

export const DAMODARAN_SOURCE = {
  title: 'Damodaran (NYU Stern), EV/EBITDA by sector, US, January 2026',
  url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/vebitda.html',
};

export function industryInfo(name: string): IndustryInfo | undefined {
  return INDUSTRIES.find((item) => item.name === name);
}

export function industryLabel(name: string): string {
  return industryInfo(name)?.label ?? name;
}
