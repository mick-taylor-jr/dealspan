/**
 * Public-company benchmarks: Aswath Damodaran, "Enterprise Value Multiples by Sector (US)",
 * January 2026 dataset, EV/EBITDA for positive-EBITDA firms.
 * https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/vebitda.html
 * These are public-market multiples. Dealspan never applies them raw to a $1–50M private company:
 * comps.ts applies a size discount first.
 */
export type IndustryInfo = {
  name: string;
  damodaranSector: string;
  publicEvEbitda: number;
};

export const INDUSTRIES: IndustryInfo[] = [
  { name: 'Landscaping / facility services', damodaranSector: 'Business & Consumer Services', publicEvEbitda: 14.26 },
  { name: 'Construction / mechanical services', damodaranSector: 'Engineering/Construction', publicEvEbitda: 17.18 },
  { name: 'Business services', damodaranSector: 'Business & Consumer Services', publicEvEbitda: 14.26 },
  { name: 'IT services', damodaranSector: 'Computer Services', publicEvEbitda: 14.1 },
  { name: 'Software / SaaS', damodaranSector: 'Software (System & Application)', publicEvEbitda: 24.48 },
  { name: 'Manufacturing', damodaranSector: 'Machinery', publicEvEbitda: 16.22 },
  { name: 'Distribution', damodaranSector: 'Retail (Distributors)', publicEvEbitda: 13.71 },
  { name: 'Consumer / retail', damodaranSector: 'Retail (General)', publicEvEbitda: 17.38 },
  { name: 'Healthcare services', damodaranSector: 'Healthcare Support Services', publicEvEbitda: 11.17 },
  { name: 'Restaurants / food service', damodaranSector: 'Restaurant/Dining', publicEvEbitda: 17.49 },
  { name: 'Food manufacturing', damodaranSector: 'Food Processing', publicEvEbitda: 10.01 },
  { name: 'Trucking / logistics', damodaranSector: 'Trucking', publicEvEbitda: 10.41 },
];

export const DAMODARAN_SOURCE = {
  title: 'Damodaran, EV/EBITDA by sector (US), January 2026',
  url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/vebitda.html',
};

export function industryInfo(name: string): IndustryInfo | undefined {
  return INDUSTRIES.find((item) => item.name === name);
}

/** Precedent-deal industries (lib/precedents.ts) that are reasonable neighbors for each intake industry. */
export const PRECEDENT_NEIGHBORS: Record<string, string[]> = {
  'Landscaping / facility services': ['Construction / mechanical services'],
  'Construction / mechanical services': ['Construction / mechanical services'],
  'Business services': ['Software / IT services'],
  'IT services': ['Software / IT services'],
  'Software / SaaS': ['Software / IT services'],
  Manufacturing: ['Manufacturing'],
  Distribution: ['Distribution'],
  'Consumer / retail': ['Consumer / retail'],
  'Healthcare services': [],
  'Restaurants / food service': ['Consumer / retail'],
  'Food manufacturing': ['Manufacturing'],
  'Trucking / logistics': ['Distribution'],
};
