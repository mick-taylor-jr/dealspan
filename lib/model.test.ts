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
  assert.ok(a.comps);
  assert.equal(a.field.length, 4);
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
