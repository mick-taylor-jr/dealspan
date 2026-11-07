import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sizeAdjustedComps } from './comps';
import { defaultDcf, runDcf } from './dcf';
import { INDUSTRIES } from './industries';
import { emptyLbo, runLbo } from './lbo';
import { CITED_DEALS } from './precedents';
import { synergyView } from './synergy';

describe('industries and precedents', () => {
  it('only lists industries that have a cited deal', () => {
    assert.deepEqual(INDUSTRIES, [
      'Construction / mechanical services',
      'Software / IT services',
      'Manufacturing',
      'Distribution',
      'Consumer / retail',
    ]);
    for (const deal of CITED_DEALS) {
      assert.equal(INDUSTRIES.includes(deal.industry as (typeof INDUSTRIES)[number]), true, deal.target);
    }
    assert.equal(CITED_DEALS.length, 8);
  });
});

describe('size-adjusted comps', () => {
  it('refuses a raw multiple until a discount is entered', () => {
    assert.equal(
      sizeAdjustedComps({ benchmarkRaw: '10', discountLowRaw: '', discountHighRaw: '' }, 10_000_000).status,
      'need-discount',
    );
    assert.equal(
      sizeAdjustedComps({ benchmarkRaw: '', discountLowRaw: '20', discountHighRaw: '40' }, 10_000_000).status,
      'need-benchmark',
    );
  });

  it('applies the discount range and does not return the raw multiple', () => {
    const result = sizeAdjustedComps(
      { benchmarkRaw: '10', discountLowRaw: '20', discountHighRaw: '40' },
      10_000_000,
    );
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    assert.equal(result.multipleLow.cents, 6_000);
    assert.equal(result.multipleHigh.cents, 8_000);
    assert.equal(result.valueLow?.cents, 60_000_000);
    assert.equal(result.valueHigh?.cents, 80_000_000);
    assert.notEqual(result.valueHigh?.cents, 100_000_000);
  });
});

describe('dcf', () => {
  it('values a flat no-tax cash flow near the perpetuity', () => {
    const input = defaultDcf();
    input.rfBps = 500;
    input.betaThousandths = 1_000;
    input.erpBps = 500;
    input.sizeBps = 0;
    input.companyBps = 0;
    input.wdBps = 0;
    input.growthBps = 0;
    input.gBps = 0;
    input.taxBps = 0;
    const run = runDcf(input, 10_000_000, 1_000_000);
    assert.ok(run);
    assert.equal(run?.waccBps, 1_000);
    assert.ok(Math.abs((run?.gordonEquityCents ?? 0) - 10_000_000) < 20_000);
  });
});

describe('lbo', () => {
  it('plugs equity and refuses to invent debt', () => {
    const input = emptyLbo();
    assert.equal(runLbo(input, 2_000_000, 10_000_000), null);
    input.debtRaw = '40000';
    input.rateBps = 1_000;
    input.amortYears = 5;
    input.holdYears = 5;
    input.exitThousandths = 5_000;
    input.growthBps = 0;
    input.taxBps = 0;
    const run = runLbo(input, 2_000_000, 10_000_000);
    assert.equal(run?.equityCents, 6_000_000);
    assert.equal((run?.equityCents ?? 0) + 4_000_000, 10_000_000);
    assert.ok((run?.moicThousandths ?? 0) > 0);
  });
});

describe('synergies', () => {
  it('blocks standalone deals and does not authorize a higher price', () => {
    const blocked = synergyView('standalone', [
      { id: '1', kind: 'cost', description: 'Rent', amountRaw: '100000' },
    ]);
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.upliftAuthorized, false);
    assert.equal(blocked.lines.length, 0);
  });

  it('haircuts stated add-on dollars and still refuses a price uplift', () => {
    const view = synergyView('addon', [
      { id: '1', kind: 'cost', description: 'Rent', amountRaw: '100000' },
      { id: '2', kind: 'revenue', description: 'Cross sell', amountRaw: '100000' },
    ]);
    assert.equal(view.upliftAuthorized, false);
    assert.equal(view.lines[0]?.retained.cents, 8_000_000);
    assert.equal(view.lines[1]?.retained.cents, 7_700_000);
  });
});
