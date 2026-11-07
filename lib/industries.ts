export const INDUSTRIES = [
  'Construction / mechanical services',
  'Software / IT services',
  'Manufacturing',
  'Distribution',
  'Consumer / retail',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}

export const YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => 2015 + index);
