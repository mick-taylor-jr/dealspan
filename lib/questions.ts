import { formatCents } from '@/lib/money';

export function formatYearList(years: string[]): string {
  const unique = [...new Set(years.map((year) => year.trim()).filter(Boolean))];
  unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (unique.length === 0) return 'the periods on this line';
  if (unique.length === 1) return unique[0] ?? '';
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
}

export function parseYearList(raw: string): string[] {
  return raw
    .split(/[,;/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

type QuestionInput = {
  category: string;
  shortName: string;
  description: string;
  years: string[];
  amountCents: number;
  functionLabel: string;
  role: string;
  recurring: boolean;
};

export function questionName(line: Pick<QuestionInput, 'shortName' | 'description'>): string {
  const short = line.shortName.trim();
  return short || line.description.trim();
}

export function sellerQuestion(line: QuestionInput): string {
  if (line.category === 'unreported_cash') {
    return 'Send deposit records for the extra cash sales. Without proof, lenders will not count it.';
  }
  const name = questionName(line);
  if (line.recurring) {
    return `Send the invoices for the ${name} in ${formatYearList(line.years)}.`;
  }
  if (line.category === 'related_party') {
    const job = line.functionLabel.trim() || line.role.trim() || 'this work';
    return `Who will do ${job} after close? Send any evidence of replacement cost.`;
  }
  if (line.category === 'projected_savings') {
    return `Send evidence the ${formatCents(line.amountCents)} ${name} already occurred. Projected savings that have not happened are not an add-back.`;
  }
  return `Send supporting documents for ${name}. Without proof, this add-back is not counted.`;
}
