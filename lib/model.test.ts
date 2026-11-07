import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSUMPTIONS, wacc } from './assumptions';
import { demoIntake } from './demo';
import { analyze, findMissing, project, runLbo, type Company } from './model';
import { emptyIntake, num } from './types';

const close = (a: number, b: number, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('num parses typed values and never turns blank into zero', () => {
  assert.equal(num(''), null);
  assert.equal(num('  '), null);
  assert.equal(num('abc'), null);
  assert.equal(num('1,234'), 1234);
  assert.equal(num('$2.5'), 2.5);
  assert.equal(num('21%'), 21);
});

test('empty intake lists what is missing and does not run', () => {
  const missing = findMissing(emptyIntake());
  assert.ok(missing.some((m) => m.section === 'buyer' && m.field === 'Revenue 2025'));
  assert.ok(missing.some((m) => m.section === 'target' && m.field === 'D&A'));
  assert.ok(missing.some((m) => m.section === 'deal' && m.field === 'Offer multiple'));
  assert.equal(analyze(emptyIntake()), null);
});

test('demo intake is complete and runs every model', () => {
  assert.deepEqual(findMissing(demoIntake()), []);
  const a = analyze(demoIntake());
  assert.ok(a);
  assert.equal(a.verifiedEbitda, 331_000);
  close(a.offerEv, 926_800);
  assert.ok(a.earningsGap);
  close(a.earningsGap.gap, 79_000);
  close(a.earningsGap.overpay, 221_200);
  assert.equal(a.field.length, 4);
  const [offer, good, average, bad] = a.scenarios;
  assert.equal(offer.price, a.offerEv);
  assert.ok(good.price < average.price && average.price < bad.price);
  assert.equal(a.ranked.length, 8);
  assert.ok(a.ranked.every((d, i) => i === 0 || a.ranked[i - 1].score >= d.score));
  for (const s of a.scenarios)
    close(s.financing.recommendedLoan + s.financing.buyerCash, s.financing.projectCost, 1e-6);
  assert.ok(a.lbo.irr != null && a.lbo.irr > 0);
});

test('projection uses 21% tax and foots', () => {
  const company: Company = {
    name: 'X',
    industry: 'Manufacturing',
    revenue: [1_000_000, 1_000_000, 1_000_000],
    ebitda: [200_000, 200_000, 200_000],
    da: 50_000,
    capex: 50_000,
    nwc: 100_000,
    debt: 0,
    cash: 0,
    debtRate: 0.08,
    growth: 0,
  };
  const rows = project(company, 5, null);
  const y1 = rows[0];
  close(y1.revenue, 1_000_000);
  close(y1.ebit, 150_000);
  close(y1.taxes, 150_000 * ASSUMPTIONS.taxRate);
  close(y1.deltaNwc, 0);
  close(y1.ufcf, 150_000 * 0.79 + 50_000 - 50_000);
});

test('LBO with no debt and flat business: IRR matches multiple arbitrage plus cash build', () => {
  const company: Company = {
    name: 'X',
    industry: 'Manufacturing',
    revenue: [1_000_000, 1_000_000, 1_000_000],
    ebitda: [200_000, 200_000, 200_000],
    da: 0,
    capex: 0,
    nwc: 0,
    debt: 0,
    cash: 0,
    debtRate: 0.08,
    growth: 0,
  };
  const rows = project(company, 5, null);
  const deal = {
    offerMultiple: 4,
    feesPct: 0,
    leverage: 0,
    rate: 0.1,
    termYears: 5,
    exitMultiple: 4,
    holdYears: 5,
    targetIrr: 0.2,
  };
  const lbo = runLbo(200_000, rows, deal);
  close(lbo.equity, 800_000);
  // 5 years of after-tax cash: 200k × 0.79 × 5 = 790k, plus exit 800k.
  close(lbo.exitEquity, 800_000 + 790_000);
  assert.ok(lbo.moic != null);
  close(lbo.moic, 1_590_000 / 800_000, 1e-9);
  // Paying more lowers the max-at-target answer's IRR, and max multiple returns target IRR.
  assert.ok(lbo.maxMultipleAtTarget != null);
  const atMax = runLbo(200_000, rows, { ...deal, offerMultiple: lbo.maxMultipleAtTarget });
  close(atMax.irr ?? 0, 0.2, 1e-4);
});

test('WACC built from labeled assumptions', () => {
  // Ke = 4.5 + 5 + 6 + 8 = 23.5%; WACC = 0.7 × 23.5% + 0.3 × 10% × 0.79
  close(wacc(0.1), 0.7 * 0.235 + 0.3 * 0.1 * 0.79, 1e-12);
});

import { scoreComparable, selectComparables, weightedMedian } from './comps';
import { DEALS } from './deals';
import { runFinancing } from './financing';

test('deal database loads all 76 workbook rows', () => {
  assert.equal(DEALS.length, 76);
  assert.equal(DEALS.filter((d) => d.ebitda != null).length, 53);
});

test('similarity score follows the DealSpan rules', () => {
  const subject = {
    industry: 'Home & commercial services (HVAC, plumbing, electrical)',
    subsector: 'Commercial HVAC / mechanical contractor',
    ebitda: 1_369_050,
    buyerType: 'strategic' as const,
    earnout: false,
  };
  const jake = DEALS.find((d) => d.target === 'Jake Marshall LLC')!;
  const s = scoreComparable(jake, subject)!;
  // 25 same work + size + 15 same buyer + 10 structure + 0 recency (2021 is 5 yrs → 5) + 10 actual profit
  const size = 30 * (1 - Math.log(4_500_000 / 1_369_050) / Math.log(5));
  close(s.score, 25 + size + 15 + 10 + 5 + 10, 1e-9);
  const sel = selectComparables(subject);
  // Pioneer Power (7.3× bigger) and 1901 Inc. are never used.
  assert.ok(!sel.used.some((d) => d.target === 'Pioneer Power' || d.target === '1901 Inc.'));
  assert.ok(sel.used.every((d) => d.score >= 40 && d.parts.size > 0));
});

test('weighted median picks the value where half the weight is reached', () => {
  assert.equal(
    weightedMedian([
      { v: 1, w: 1 },
      { v: 2, w: 1 },
      { v: 10, w: 5 },
    ]),
    10,
  );
  assert.equal(
    weightedMedian([
      { v: 1, w: 3 },
      { v: 2, w: 1 },
      { v: 3, w: 1 },
    ]),
    1,
  );
});

test('financing respects the 10% equity floor and coverage', () => {
  const f = runFinancing({
    ebitda: 331_000,
    price: 926_800,
    fees: 37_072,
    rate: 0.095,
    plannedLoan: 579_250,
    sameIndustry: true,
    buyerType: 'strategic',
    cashOnHand: 1_100_000,
  });
  assert.equal(f.category, 'Business expansion');
  assert.equal(f.coverageFloor, 1.15);
  assert.ok(f.maxLoan <= f.projectCost * 0.9);
  assert.ok(f.recommendedCoverage >= 1.5);
  close(f.buyerCash + f.recommendedLoan, f.projectCost, 1e-6);
  const thin = runFinancing({
    ebitda: 100_000,
    price: 1_000_000,
    fees: 0,
    rate: 0.1,
    plannedLoan: 900_000,
    sameIndustry: false,
    buyerType: 'individual',
    cashOnHand: 0,
  });
  assert.equal(thin.coverageFloor, 1.25);
  assert.equal(thin.maxLoanReason, 'coverage');
  assert.equal(thin.plannedOk, false);
});

import { extractJsonArray, searchedUrlsFrom, validateDeals } from './ai-precedents';

test('AI deals are kept only with a searched source, a price and a profit', () => {
  const text = `Here you go <deals>[
    {"target":"Acme Lawn LLC","acquirer":"BrightView","date":"2024-03","type_of_work":"Commercial landscaping","price_usd":4200000,"ebitda_usd":800000,"buyer_type":"strategic","earnout":false,"profit_basis":"actual","source_url":"https://www.example.com/acme-lawn/","note":""},
    {"target":"Made Up Co","acquirer":"X","date":"2024-01","price_usd":1000000,"ebitda_usd":200000,"source_url":"https://invented.example.org/x"},
    {"target":"No Profit Inc","acquirer":"Y","date":"2023-05","price_usd":3000000,"ebitda_usd":null,"source_url":"https://www.example.com/acme-lawn"},
    {"target":"Crazy Multiple","acquirer":"Z","date":"2023-05","price_usd":90000000,"ebitda_usd":1000000,"source_url":"https://example.com/acme-lawn"},
    {"target":"Bud's Plumbing (M.L.C. Plumbing)","acquirer":"Kingsway","date":"2025-03","price_usd":5000000,"ebitda_usd":800000,"source_url":"https://example.com/acme-lawn"}
  ]</deals>`;
  const content = [
    { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } },
    {
      type: 'web_search_tool_result',
      tool_use_id: 's1',
      content: [{ type: 'web_search_result', url: 'https://example.com/acme-lawn', title: 't' }],
    },
    { type: 'text', text },
  ];
  const raw = extractJsonArray(text);
  assert.equal(raw.length, 5);
  const { deals, rejected } = validateDeals(
    raw,
    searchedUrlsFrom(content),
    ["Bud's Plumbing (M.L.C. Plumbing)"],
    'Home & commercial services (HVAC, plumbing, electrical)',
  );
  assert.deepEqual(
    deals.map((d) => d.target),
    ['Acme Lawn LLC'],
  );
  assert.equal(deals[0].aiFound, true);
  assert.equal(deals[0].basis, 'ltm');
  assert.deepEqual(
    rejected.map((r) => r.target),
    ['Made Up Co', 'No Profit Inc', 'Crazy Multiple', "Bud's Plumbing (M.L.C. Plumbing)"],
  );
});

test('AI deals join the ranking and the industry market', async () => {
  const { analyze } = await import('./model');
  const { demoIntake } = await import('./demo');
  const extra = [
    {
      aiFound: true as const,
      industry: 'Home & commercial services (HVAC, plumbing, electrical)',
      subsector: 'Commercial landscaping and snow removal',
      date: '2025-06',
      target: 'Test Landscaping',
      acquirer: 'Buyer',
      buyerType: 'strategic' as const,
      currency: 'USD',
      ev: 1_500_000,
      revenue: null,
      ebitda: 350_000,
      earnout: false,
      stakePct: 100,
      basis: 'ltm' as const,
      implied: false,
      profitPeriod: '',
      notes: '',
      source: 'https://example.com',
    },
  ];
  const a = analyze(demoIntake(), extra)!;
  assert.equal(a.ranked[0].target, 'Test Landscaping');
  assert.equal(a.ranked.length, 9);
  assert.equal(a.aiCount, 1);
});
