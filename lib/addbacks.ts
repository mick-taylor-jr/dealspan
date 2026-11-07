import type { AddBackCategory, Metric } from '@/lib/types';
import { formatCents } from '@/lib/money';
import { sellerQuestion } from '@/lib/questions';

export type Classification = 'accepted' | 'rejected' | 'adjusted';

export type ClassifiedAddBack = {
  id: string;
  description: string;
  shortName: string;
  years: string[];
  category: AddBackCategory;
  role: string;
  managementCents: number;
  classification: Classification;
  qoeLowCents: number;
  qoeHighCents: number;
  rationale: string;
  flags: string[];
  question: string | null;
  documented: boolean;
};

export type ClassifiableLine = {
  id: string;
  description: string;
  shortName: string;
  years: string[];
  category: AddBackCategory;
  role: string;
  functionLabel: string;
  claimedOneTime: boolean;
  documented: boolean;
  managementCents: number;
  replacementCents: number | null;
};

const THIN = new Set([
  '',
  'other',
  'misc',
  'miscellaneous',
  'one-time',
  'onetime',
  'one time',
  'catch-all',
  'catchall',
  'n/a',
  'na',
]);

function isThin(description: string): boolean {
  const normalized = description
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return THIN.has(normalized);
}

type Outcome = {
  classification: Classification;
  qoeLowCents: number;
  qoeHighCents: number;
  rationale: string;
  flags: string[];
  recurring: boolean;
};

function outcome(
  classification: Classification,
  low: number,
  high: number,
  rationale: string,
  flags: string[],
  recurring = false,
): Outcome {
  const qoeLowCents = Math.min(low, high);
  const qoeHighCents = Math.max(low, high);
  return { classification, qoeLowCents, qoeHighCents, rationale, flags, recurring };
}

export function classifyAddBack(
  line: ClassifiableLine,
  metric: Metric,
  ownerCompIndex: number,
  marketWageCents: number | null,
): ClassifiedAddBack {
  const amount = line.managementCents;
  const recurring = (line.claimedOneTime || line.category === 'one_time') && line.years.length > 1;
  let result: Outcome;

  if (line.category === 'unreported_cash') {
    result = outcome(
      'rejected',
      0,
      0,
      'Extra cash sales have no proof. Lenders will not count unreported cash.',
      ['unsupported'],
    );
  } else if (line.category === 'projected_savings') {
    result = outcome('rejected', 0, 0, 'Projected savings that have not happened are not an add-back.', [
      'synergy_out_of_scope',
    ]);
  } else if (recurring) {
    result = outcome(
      'rejected',
      0,
      0,
      'Labeled one-time, but the same item appears in more than one year, so it is a recurring operating cost.',
      ['recurring_disguised_as_one_time'],
      true,
    );
  } else if (line.category === 'related_party') {
    if (line.replacementCents == null) {
      const books = line.functionLabel.trim() === 'the books';
      result = outcome(
        'rejected',
        0,
        0,
        books
          ? 'The books still have to be done after close. No replacement wage was entered, and none is invented.'
          : 'Someone still has to do this work after close. No replacement wage was entered, and none is invented.',
        ['related_party'],
      );
    } else if (amount - line.replacementCents <= 0) {
      result = outcome(
        'rejected',
        0,
        0,
        'The replacement cost entered for this role covers the pay, so none of it is added back.',
        ['related_party'],
      );
    } else {
      const excess = amount - line.replacementCents;
      result = outcome(
        'adjusted',
        excess,
        excess,
        `Only the excess over the entered replacement cost is counted. The rest still has to be paid.`,
        ['related_party'],
      );
    }
  } else if (line.category === 'other' || isThin(line.description)) {
    result = outcome(
      'rejected',
      0,
      0,
      'The line is not specific enough to add back. A label like “other” or “one-time” is not support.',
      ['thin_description', 'unsupported'],
    );
  } else if (line.category === 'owner_comp' && ownerCompIndex > 0) {
    result = outcome(
      'rejected',
      0,
      0,
      'Only one working owner’s pay belongs in SDE. Additional owner pay stays a cost of the business.',
      ['related_party'],
    );
  } else if (metric === 'EBITDA' && line.category === 'owner_comp') {
    if (marketWageCents == null) {
      result = outcome(
        'rejected',
        0,
        0,
        'For EBITDA, owner pay is added back only after subtracting a market replacement wage. None was entered, and none is invented.',
        ['assumed_replacement_cost'],
      );
    } else {
      const net = amount - marketWageCents;
      result = outcome(
        'adjusted',
        net,
        net,
        `Owner pay minus a market replacement wage of ${formatCents(marketWageCents)}. The wage is not taken from the documents.`,
        ['assumed_replacement_cost'],
      );
    }
  } else if (metric === 'SDE' && line.category === 'owner_comp') {
    result = outcome(
      'accepted',
      amount,
      amount,
      'Pay of one full-time owner-operator is part of SDE. The bridge does not also deduct a replacement wage.',
      [],
    );
  } else if (line.category === 'personal') {
    result = outcome(
      'accepted',
      amount,
      amount,
      'Personal cost run through the business. A new owner would not bear it.',
      [],
    );
  } else if (line.category === 'owner_perk') {
    result = outcome(
      'accepted',
      amount,
      amount,
      'Owner benefit that does not continue as a cost for a new owner.',
      [],
    );
  } else if (line.category === 'one_time' || line.claimedOneTime) {
    if (line.documented) {
      result = outcome(
        'accepted',
        amount,
        amount,
        'Documented one-time cost in a single period. A repair that shows up in several years is a different line and is not accepted here.',
        [],
      );
    } else {
      result = outcome(
        'adjusted',
        0,
        amount,
        'The description is specific, but the line is not marked as documented. The low end counts nothing; the high end allows the typed amount.',
        ['user_entered_unverified'],
      );
    }
  } else {
    result = outcome('rejected', 0, 0, 'This line does not meet the tests for an add-back.', ['unsupported']);
  }

  const cut =
    result.classification === 'rejected' || result.qoeLowCents < amount || result.qoeHighCents < amount;
  return {
    id: line.id,
    description: line.description,
    shortName: line.shortName,
    years: line.years,
    category: line.category,
    role: line.role,
    managementCents: amount,
    classification: result.classification,
    qoeLowCents: result.qoeLowCents,
    qoeHighCents: result.qoeHighCents,
    rationale: result.rationale,
    flags: result.flags,
    documented: line.documented,
    question: cut
      ? sellerQuestion({
          category: line.category,
          shortName: line.shortName,
          description: line.description,
          years: line.years,
          amountCents: amount,
          functionLabel: line.functionLabel,
          role: line.role,
          recurring: result.recurring,
        })
      : null,
  };
}
