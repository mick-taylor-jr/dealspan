import type { Intake } from '@/lib/types';

/**
 * Both companies are hypothetical. Greenridge keeps the locked example figures from earlier in the weekend:
 * $331,000 supported EBITDA vs $410,000 seller-claimed, 2.8× offer.
 */
export const DEMO_STORIES = {
  buyer:
    'Northline Grounds Co. (hypothetical) is a commercial grounds and snow-removal company in three Midwest metros. It has a professional management team, 90 employees and its own fleet maintenance shop, and grows by buying small owner-run landscapers.',
  target:
    'Greenridge Landscape Co. (hypothetical) is a family-owned commercial landscaper. Working owner Dave has run it for about 15 years: mowing, grounds and snow for office parks and HOAs in one metro next to Northline’s. Dave’s wife does the books. The broker’s listing claims $410K of EBITDA; documents support $331K.',
};

export function demoIntake(): Intake {
  return {
    demo: true,
    buyer: {
      name: 'Northline Grounds Co.',
      description: 'Commercial grounds maintenance and snow removal for office parks and corporate campuses.',
      industry: 'Home & commercial services (HVAC, plumbing, electrical)',
      location: 'Columbus, Indianapolis and Louisville',
      customers: 'Office parks, corporate campuses, hospitals',
      employees: '90',
      revenue: ['7600000', '8000000', '8400000'],
      ebitda: ['1100000', '1180000', '1260000'],
      da: '300000',
      capex: '340000',
      nwc: '900000',
      debt: '1500000',
      cash: '1100000',
      debtRate: '7.5',
      growth: '4',
    },
    target: {
      name: 'Greenridge Landscape Co.',
      description: 'Mowing, grounds and snow removal for office parks and HOAs. Owner-operated for 15 years.',
      industry: 'Home & commercial services (HVAC, plumbing, electrical)',
      location: 'Dayton, Ohio',
      customers: 'Office parks and HOAs',
      employees: '22',
      revenue: ['1720000', '1810000', '1900000'],
      ebitda: ['288000', '309000', '331000'],
      da: '62000',
      capex: '70000',
      nwc: '140000',
      debt: '180000',
      cash: '95000',
      debtRate: '8',
      growth: '4',
      subsector: 'Commercial landscaping and snow removal',
      sellerEbitda: '410000',
      askingPrice: '1148000',
      marginTarget: '18.5',
    },
    deal: {
      buyerType: 'strategic',
      earnout: 'no',
      offerMultiple: '2.8',
      feesPct: '4',
      leverage: '1.75',
      rate: '9.5',
      termYears: '7',
      exitMultiple: '3',
      holdYears: '5',
      targetIrr: '25',
    },
    synergies: [
      {
        id: 's1',
        kind: 'cost',
        description: 'Fleet maintenance moves into Northline’s shop',
        amount: '28000',
      },
      {
        id: 's2',
        kind: 'cost',
        description: 'One bookkeeper and dispatcher for both companies',
        amount: '38000',
      },
      { id: 's3', kind: 'cost', description: 'Bulk buying of fuel, mulch and salt', amount: '22000' },
      {
        id: 's4',
        kind: 'revenue',
        description: 'Sell Northline’s snow contracts to Greenridge’s HOA customers',
        amount: '150000',
      },
    ],
    integrationCost: '45000',
    fit: {
      customerOverlap: 'low',
      crossSell: 'high',
      geography: 'adjacent',
      serviceFit: 'same',
      ownerDependence: 'high',
      topCustomerPct: '14',
      recurringPct: '75',
      keyPeople: 'unsure',
      culture: 'workable',
      integration: 'medium',
      thesis:
        'Greenridge gives Northline a fourth metro with crews and contracts already in place, and Northline’s shop and back office take cost out from day one.',
    },
  };
}
