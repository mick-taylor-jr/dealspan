import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDeal } from './bridge';
import { ANALOGY, DISCLAIMER, MOWER_QUESTION, PITCH } from './copy';
import { greenridgeIntake } from './greenridge';
import { emptyIntake, type Intake } from './types';

const TAX = 15_800_000;
const ACCEPTED = 17_300_000;
const SUPPORTED = 33_100_000;
const REJECTED = 7_900_000;
const CLAIMED = 41_000_000;
const OVERPAY = 22_120_000;
const LISTING = 114_800_000;
const SUPPORTED_PRICE = 92_680_000;

function dealFrom(intake: Intake) {
  const result = buildDeal(intake);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('unreachable');
  return result.deal;
}

describe('Greenridge Landscape Co.', () => {
  const deal = dealFrom(greenridgeIntake());

  it('foots the locked earnings bridge', () => {
    assert.equal(deal.reported.cents, TAX);
    assert.equal(deal.reported.label, 'user-entered');
    assert.equal(deal.acceptedTotal.cents, ACCEPTED);
    assert.equal(deal.supportedLow.cents, SUPPORTED);
    assert.equal(deal.supportedHigh.cents, SUPPORTED);
    assert.equal(deal.rejectedTotal.cents, REJECTED);
    assert.equal(deal.sellerSays.cents, CLAIMED);
    assert.equal(deal.sellerSays.label, 'user-entered');
    assert.equal(deal.gap.cents, REJECTED);
    assert.equal(deal.footing, 'pass');
    assert.equal(deal.managementAdjusted.cents, CLAIMED);
    assert.equal(deal.managementAdjusted.label, 'calculated');
  });

  it('accepts fair add-backs and rejects the inflated ones', () => {
    const byId = Object.fromEntries(deal.lines.map((line) => [line.id, line]));
    for (const id of ['owner-salary', 'truck', 'health', 'payroll-tax', 'personal-spend', 'cpa']) {
      assert.equal(byId[id]?.classification, 'accepted', id);
      assert.equal(byId[id]?.question, null, id);
    }
    for (const id of ['wife', 'mower', 'routes', 'cash']) {
      assert.equal(byId[id]?.classification, 'rejected', id);
      assert.equal(byId[id]?.qoeLowCents, 0, id);
      assert.equal(byId[id]?.qoeHighCents, 0, id);
      assert.ok(byId[id]?.question);
    }
    assert.equal(byId['mower']?.question, MOWER_QUESTION);
    assert.equal(
      byId['wife']?.question,
      'Who will do the books after close? Send any evidence of replacement cost.',
    );
    assert.equal(
      byId['routes']?.question,
      'Send evidence the $7,000 better-routes savings already occurred. Projected savings that have not happened are not an add-back.',
    );
    assert.equal(
      byId['cash']?.question,
      'Send deposit records for the extra cash sales. Without proof, lenders will not count it.',
    );
    assert.match(byId['cpa']?.rationale ?? '', /one-time/i);
    assert.match(byId['mower']?.rationale ?? '', /recurring/i);
    assert.match(deal.contrast ?? '', /\$18,000/);
  });

  it('does not invent the missing proof channels', () => {
    assert.equal(deal.proof.tax.missing, false);
    if (!deal.proof.tax.missing) assert.equal(deal.proof.tax.cents, TAX);
    assert.equal(deal.proof.pnl.missing, true);
    assert.equal(deal.proof.deposits.missing, true);
    assert.equal(deal.proof.receipts.missing, true);
    assert.ok(deal.notices.some((notice) => notice.text.includes('was not entered')));
    assert.ok(!deal.notices.some((notice) => notice.text.includes('do not match')));
  });

  it('warns that inflated add-backs are half of profit and does not rewrite totals', () => {
    assert.equal(deal.intensityInflated?.text, '50%');
    assert.equal(deal.intensityInflated?.label, 'calculated');
    assert.ok(deal.notices.some((notice) => notice.level === 'warn' && notice.text.includes('50%')));
    assert.equal(deal.supportedHigh.cents, SUPPORTED);
  });

  it('prices the gap at the typed 2.8× multiple', () => {
    assert.equal(deal.multipleRaw, '2.8');
    assert.equal(deal.overpay?.cents, OVERPAY);
    assert.equal(deal.overpay?.label, 'calculated');
    assert.equal(deal.priceOnClaimed?.cents, LISTING);
    assert.equal(deal.priceOnSupportedHigh?.cents, SUPPORTED_PRICE);
    assert.equal(deal.revenue?.cents, 190_000_000);
    assert.equal(deal.revenue?.label, 'user-entered');
    assert.equal(deal.marginText, '17.4%');
  });

  it('runs lender sizing on both earnings figures without a second salary deduction', () => {
    assert.ok(deal.lender);
    const supported = deal.lender?.supported;
    const claimed = deal.lender?.claimed;
    assert.equal(supported?.wage.cents, 12_500_000);
    assert.equal(supported?.wage.label, 'assumed');
    assert.equal(supported?.cashFlow.cents, SUPPORTED - 12_500_000);
    assert.equal(claimed?.cashFlow.cents, CLAIMED - 12_500_000);
    assert.equal(supported?.price?.label, 'calculated');
    assert.equal(claimed?.price?.label, 'calculated');
    assert.ok((supported?.price?.cents ?? 0) > 0);
    assert.ok((claimed?.price?.cents ?? 0) > (supported?.price?.cents ?? 0));
    assert.ok((supported?.stressedPrice?.cents ?? 0) <= (supported?.price?.cents ?? 0));
    assert.match(deal.lender?.note ?? '', /not deducted a second time/i);
  });
});

describe('add-back rules', () => {
  it('flags a P&L and tax mismatch without picking a winner', () => {
    const intake = greenridgeIntake();
    intake.pnlProfitRaw = '140000';
    const deal = dealFrom(intake);
    assert.equal(deal.reported.cents, TAX);
    assert.equal(deal.proof.pnl.missing, false);
    if (!deal.proof.pnl.missing) assert.equal(deal.proof.pnl.cents, 14_000_000);
    assert.ok(deal.notices.some((notice) => notice.level === 'warn' && notice.text.includes('do not match')));
    assert.equal(deal.supportedHigh.cents, SUPPORTED);
  });

  it('does not compare deposits with profit', () => {
    const intake = greenridgeIntake();
    intake.depositsRaw = '1900000';
    const deal = dealFrom(intake);
    assert.ok(deal.notices.some((notice) => notice.text.includes('not compared with profit')));
    assert.equal(deal.supportedHigh.cents, SUPPORTED);
  });

  it('rejects a second owner and a thin line', () => {
    const intake = emptyIntake();
    intake.taxProfitRaw = '100000';
    intake.claimedEarningsRaw = '100000';
    intake.lines = [
      {
        id: 'owner-1',
        description: 'Owner salary',
        shortName: 'owner salary',
        amountRaw: '80000',
        unit: 'USD',
        yearsRaw: '',
        category: 'owner_comp',
        role: 'working owner',
        functionLabel: '',
        claimedOneTime: false,
        documented: false,
        replacementRaw: '',
      },
      {
        id: 'owner-2',
        description: 'Second owner salary',
        shortName: 'second owner',
        amountRaw: '60000',
        unit: 'USD',
        yearsRaw: '',
        category: 'owner_comp',
        role: 'second owner',
        functionLabel: '',
        claimedOneTime: false,
        documented: false,
        replacementRaw: '',
      },
      {
        id: 'other',
        description: 'Other',
        shortName: 'other',
        amountRaw: '5000',
        unit: 'USD',
        yearsRaw: '',
        category: 'other',
        role: '',
        functionLabel: '',
        claimedOneTime: false,
        documented: false,
        replacementRaw: '',
      },
    ];
    const deal = dealFrom(intake);
    assert.equal(deal.lines[0]?.classification, 'accepted');
    assert.equal(deal.lines[1]?.classification, 'rejected');
    assert.equal(deal.lines[2]?.classification, 'rejected');
    assert.equal(deal.supportedHigh.cents, 18_000_000);
  });

  it('refuses a blank amount instead of treating it as zero', () => {
    const intake = emptyIntake();
    intake.taxProfitRaw = '100000';
    intake.lines = [
      {
        id: 'blank',
        description: 'Mystery add-back',
        shortName: '',
        amountRaw: '',
        unit: 'USD',
        yearsRaw: '',
        category: 'personal',
        role: '',
        functionLabel: '',
        claimedOneTime: false,
        documented: false,
        replacementRaw: '',
      },
    ];
    const result = buildDeal(intake);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.join(' '), /not treated as zero/i);
  });

  it('does not price a multiple the buyer did not type', () => {
    const intake = greenridgeIntake();
    intake.multipleRaw = '';
    const deal = dealFrom(intake);
    assert.equal(deal.overpay, null);
    assert.equal(deal.priceOnClaimed, null);
    assert.equal(deal.gap.cents, REJECTED);
  });
});

describe('pitch copy', () => {
  it('keeps research notes out of the product copy', () => {
    const text = `${PITCH}\n${ANALOGY}\n${DISCLAIMER}`;
    assert.match(PITCH, /two minutes/);
    assert.match(ANALOGY, /40 mpg/);
    assert.match(DISCLAIMER, /not a formal quality-of-earnings report/);
    assert.equal(/43\.8|4\.86|BizBuySell|GF Data/.test(text), false);
  });
});
