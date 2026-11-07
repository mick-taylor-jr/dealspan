import type { Company } from '@/lib/model';
import { num, type Intake } from '@/lib/types';

export type Tone = 'strength' | 'neutral' | 'risk';

export type FitFactor = {
  id: string;
  name: string;
  answer: string;
  tone: Tone;
  why: string;
  ask?: string;
};

export type FitResult = {
  factors: FitFactor[];
  answered: number;
  score: number;
  strengths: FitFactor[];
  risks: FitFactor[];
  thesis: string[];
  questions: string[];
};

type Rule = { answer: string; tone: Tone; why: string; ask?: string };

function pick(value: string, table: Record<string, Rule>): Rule | null {
  return table[value] ?? null;
}

export function scoreFit(intake: Intake, buyer: Company, target: Company): FitResult {
  const f = intake.fit;
  const t = intake.target.name.trim() || 'the target';
  const factors: FitFactor[] = [];
  const add = (id: string, name: string, rule: Rule | null) => {
    if (rule) factors.push({ id, name, ...rule });
  };

  add(
    'industry',
    'Same industry',
    buyer.industry === target.industry
      ? { answer: 'Yes', tone: 'strength', why: 'You already know how to run this kind of business.' }
      : {
          answer: 'No',
          tone: 'neutral',
          why: 'A new industry means you are buying know-how, not just customers.',
          ask: `Who at ${t} knows the operations well enough to train your team?`,
        },
  );
  add(
    'service',
    'What they sell vs. what you sell',
    pick(f.serviceFit, {
      same: {
        answer: 'Same services',
        tone: 'strength',
        why: 'Easy to combine crews, pricing and equipment.',
      },
      complementary: {
        answer: 'Complementary',
        tone: 'strength',
        why: 'Each side can sell the other’s services to its customers.',
      },
      unrelated: {
        answer: 'Unrelated',
        tone: 'risk',
        why: 'Little to share, so most synergies will be hard to reach.',
        ask: 'Which specific costs or customers would actually be shared?',
      },
    }),
  );
  add(
    'geography',
    'Geography',
    pick(f.geography, {
      same: {
        answer: 'Same market',
        tone: 'strength',
        why: 'Route density and shared yards are where cost savings come from.',
      },
      adjacent: {
        answer: 'Next-door market',
        tone: 'strength',
        why: 'Expands your footprint while keeping management close.',
      },
      new: {
        answer: 'New market',
        tone: 'neutral',
        why: 'A new region adds reach but few cost savings.',
        ask: 'Who will manage the new market day to day?',
      },
    }),
  );
  add(
    'overlap',
    'Customer overlap',
    pick(f.customerOverlap, {
      low: { answer: 'Low', tone: 'strength', why: 'Mostly new customers, so the revenue is additive.' },
      medium: {
        answer: 'Some',
        tone: 'neutral',
        why: 'Some customers may consolidate vendors and buy less.',
      },
      high: {
        answer: 'High',
        tone: 'risk',
        why: 'Shared customers may not buy twice. Revenue can shrink after close.',
        ask: 'Which shared customers have said they would keep both contracts?',
      },
    }),
  );
  add(
    'crossSell',
    'Cross-selling potential',
    pick(f.crossSell, {
      high: { answer: 'High', tone: 'strength', why: 'A clear path to revenue synergies.' },
      medium: { answer: 'Some', tone: 'neutral', why: 'Possible, but plan for it to take a year or more.' },
      low: { answer: 'Low', tone: 'neutral', why: 'Value has to come from costs, not revenue.' },
    }),
  );
  add(
    'owner',
    'Depends on the owner',
    pick(f.ownerDependence, {
      low: { answer: 'Low', tone: 'strength', why: 'Managers run the business without the owner.' },
      medium: {
        answer: 'Somewhat',
        tone: 'neutral',
        why: 'Plan a transition period with the seller.',
        ask: 'Will the seller stay 6–12 months through a transition agreement?',
      },
      high: {
        answer: 'High',
        tone: 'risk',
        why: 'Customers and crews follow the owner. If they leave, so does value.',
        ask: 'Which customer relationships are personally held by the owner, and how will they be handed off?',
      },
    }),
  );
  const top = num(f.topCustomerPct);
  if (top != null) {
    add(
      'concentration',
      'Largest customer',
      top >= 20
        ? {
            answer: `${top}% of revenue`,
            tone: 'risk',
            why: 'Losing one customer would hurt badly. Lenders flag anything over 10–20%.',
            ask: 'Send the contract and renewal date for the largest customer.',
          }
        : top >= 10
          ? { answer: `${top}% of revenue`, tone: 'neutral', why: 'Worth checking the contract terms.' }
          : {
              answer: `${top}% of revenue`,
              tone: 'strength',
              why: 'Revenue is spread across many customers.',
            },
    );
  }
  const recurring = num(f.recurringPct);
  if (recurring != null) {
    add(
      'recurring',
      'Recurring revenue',
      recurring >= 60
        ? {
            answer: `${recurring}%`,
            tone: 'strength',
            why: 'Contracted or repeat revenue makes cash flow predictable.',
          }
        : recurring >= 30
          ? {
              answer: `${recurring}%`,
              tone: 'neutral',
              why: 'Part of the revenue has to be won again each year.',
            }
          : {
              answer: `${recurring}%`,
              tone: 'risk',
              why: 'Most revenue is one-off work and has to be resold.',
              ask: 'Show three years of revenue by customer to prove repeat business.',
            },
    );
  }
  add(
    'people',
    'Key employees',
    pick(f.keyPeople, {
      staying: {
        answer: 'Staying',
        tone: 'strength',
        why: 'The people who do the work are part of what you buy.',
      },
      unsure: {
        answer: 'Unsure',
        tone: 'neutral',
        why: 'Use retention bonuses tied to the first year.',
        ask: 'Which managers and lead employees have agreed to stay?',
      },
      leaving: {
        answer: 'Leaving',
        tone: 'risk',
        why: 'You may be buying equipment and contracts without the team.',
      },
    }),
  );
  add(
    'culture',
    'Culture fit',
    pick(f.culture, {
      strong: { answer: 'Strong', tone: 'strength', why: 'Fewer people quit after close.' },
      workable: { answer: 'Workable', tone: 'neutral', why: 'Expect some friction during the first year.' },
      weak: { answer: 'Weak', tone: 'risk', why: 'Culture clashes are a common reason small deals fail.' },
    }),
  );
  add(
    'integration',
    'How hard to integrate',
    pick(f.integration, {
      low: { answer: 'Easy', tone: 'strength', why: 'Synergies show up sooner.' },
      medium: { answer: 'Moderate', tone: 'neutral', why: 'Budget time and money for systems and people.' },
      high: { answer: 'Hard', tone: 'risk', why: 'Integration cost and delay can eat the synergies.' },
    }),
  );

  const points = { strength: 2, neutral: 1, risk: 0 } as const;
  const total = factors.reduce((sum, item) => sum + points[item.tone], 0);
  const score = factors.length ? Math.round((total / (factors.length * 2)) * 100) : 0;
  const strengths = factors.filter((item) => item.tone === 'strength');
  const risks = factors.filter((item) => item.tone === 'risk');

  const thesis: string[] = [];
  if (f.thesis.trim()) thesis.push(f.thesis.trim());
  if (buyer.industry === target.industry && f.geography === 'same')
    thesis.push('Same business in the same market: the strongest case for cost savings.');
  if (buyer.industry === target.industry && f.geography === 'adjacent')
    thesis.push('Same business in a next-door market: shared equipment and back office, plus new territory.');
  if (f.serviceFit === 'complementary' || f.crossSell === 'high')
    thesis.push(`Each company can sell to the other’s customers.`);
  if (target.ebitda[2] / target.revenue[2] > buyer.ebitda[2] / buyer.revenue[2])
    thesis.push(`${t} runs at a higher margin than you do, so the deal lifts your blended margin.`);
  else thesis.push(`${t} runs at a lower margin than you do. Your playbook could raise it.`);

  const questions = factors.flatMap((item) => (item.ask ? [item.ask] : []));
  return { factors, answered: factors.length, score, strengths, risks, thesis, questions };
}
