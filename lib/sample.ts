import { DEMO_STORIES, demoIntake } from '@/lib/demo';
import type { Intake } from '@/lib/types';

/**
 * The sample report behind the landing page: a fictional Ohio landscaper whose owner asks $1,150,000 on
 * claimed earnings the documents don't support. Same buyer and deal terms as the demo; only the target
 * changes. Every number the landing page shows comes from running this through the engine.
 */
export const SAMPLE_NAME = 'Buckeye Lawn & Landscape';

export const SAMPLE_STORIES = {
  buyer: DEMO_STORIES.buyer,
  target:
    'Buckeye Lawn & Landscape (fictional) is an owner-run residential and HOA landscaper outside Columbus, Ohio. The listing claims $265K of earnings by calling $59K of recurring costs “one-time”; documents support $206K. The owner is asking $1,150,000.',
};

/** The seller's pitch, as the listing presents it. */
export const SAMPLE_PITCH = {
  claimedEbitda: 265_000,
  addBacks: 59_000,
};

export function sampleIntake(): Intake {
  const base = demoIntake();
  return {
    ...base,
    demo: true,
    target: {
      ...base.target,
      name: SAMPLE_NAME,
      description: 'Lawn care, landscaping and seasonal cleanup for homeowners and HOAs. Owner-operated.',
      location: 'Columbus, Ohio',
      customers: 'Homeowners and HOAs',
      employees: '14',
      revenue: ['1072000', '1129000', '1186000'],
      ebitda: ['180000', '193000', '206000'],
      da: '39000',
      capex: '44000',
      nwc: '87000',
      debt: '112000',
      cash: '59000',
      subsector: 'Commercial landscaping and snow removal',
      sellerEbitda: String(SAMPLE_PITCH.claimedEbitda),
      askingPrice: '1150000',
    },
    fit: {
      ...base.fit,
      thesis:
        'Buckeye gives Northline residential and HOA crews in Columbus, and Northline’s shop and back office take cost out from day one.',
    },
  };
}
