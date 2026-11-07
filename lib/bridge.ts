import { classifyAddBack, type ClassifiedAddBack } from '@/lib/addbacks';
import { sizePurchase, REPLACEMENT_WAGE_DOLLARS, SBA_DSCR_FLOOR, TARGET_DSCR } from '@/lib/lender-sizing';
import {
  dollarsToCents,
  formatCents,
  formatPercent,
  multiplyCents,
  parseMoney,
  parsePositiveDecimal,
} from '@/lib/money';
import { parseYearList } from '@/lib/questions';
import type { Figure, Intake, LabeledCents, ProvenanceLabel } from '@/lib/types';

export type DealNotice = { level: 'info' | 'warn'; text: string };

export type DealLine = ClassifiedAddBack & {
  management: LabeledCents;
  countedLow: LabeledCents;
  countedHigh: LabeledCents;
};

export type LenderCase = {
  earnings: LabeledCents;
  wage: LabeledCents;
  cashFlow: LabeledCents;
  price: LabeledCents | null;
  stressedPrice: LabeledCents | null;
  status: string;
  dscrText: string | null;
};

export type Deal = {
  exampleId: 'greenridge' | null;
  targetName: string;
  industry: string;
  metric: 'SDE' | 'EBITDA';
  buyerType: Intake['buyerType'];
  period: string;
  reportedBasis: string;
  reported: LabeledCents;
  sellerSays: LabeledCents;
  managementAdjusted: LabeledCents;
  supportedLow: LabeledCents;
  supportedHigh: LabeledCents;
  acceptedTotal: LabeledCents;
  rejectedTotal: LabeledCents;
  gap: LabeledCents;
  footing: 'pass' | 'fail' | 'not_checked';
  footingDetail: string;
  lines: DealLine[];
  proof: {
    pnl: Figure;
    tax: Figure;
    deposits: Figure;
    receipts: Figure;
  };
  notices: DealNotice[];
  intensityTotal: { text: string; label: ProvenanceLabel; source: string } | null;
  intensityInflated: { text: string; label: ProvenanceLabel; source: string } | null;
  revenue: LabeledCents | null;
  marginText: string | null;
  multipleRaw: string | null;
  overpay: LabeledCents | null;
  priceOnClaimed: LabeledCents | null;
  priceOnSupportedLow: LabeledCents | null;
  priceOnSupportedHigh: LabeledCents | null;
  contrast: string | null;
  lender: { claimed: LenderCase; supported: LenderCase; note: string } | null;
  noAddBacks: boolean;
};

export type BuildFailure = { ok: false; errors: string[] };
export type BuildSuccess = { ok: true; deal: Deal };
export type BuildResult = BuildFailure | BuildSuccess;

function userFigure(cents: number, location: string): LabeledCents {
  return { cents, label: 'user-entered', source: 'user', location };
}

function calcFigure(cents: number, location: string): LabeledCents {
  return { cents, label: 'calculated', source: 'earnings bridge', location };
}

function missingFigure(location: string): Figure {
  return { missing: true, source: 'user', location };
}

function presentFigure(cents: number, location: string): Figure {
  return { missing: false, ...userFigure(cents, location) };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function isBlankLine(line: Intake['lines'][number]): boolean {
  return (
    line.description.trim() === '' &&
    line.amountRaw.trim() === '' &&
    line.yearsRaw.trim() === '' &&
    line.role.trim() === '' &&
    line.shortName.trim() === '' &&
    line.replacementRaw.trim() === ''
  );
}

function requireMoney(
  raw: string,
  unit: Intake['proofUnit'],
  label: string,
  errors: string[],
): number | null {
  const parsed = parseMoney(raw, unit);
  if (parsed.missing) {
    errors.push(`${label} is blank. It was not treated as zero.`);
    return null;
  }
  if (parsed.cents == null || parsed.flags.includes('UNIT_UNKNOWN') || parsed.flags.includes('UNPARSEABLE')) {
    errors.push(`${label} could not be read. The unit was not guessed.`);
    return null;
  }
  if (parsed.cents <= 0) {
    errors.push(`${label} has to be a positive amount.`);
    return null;
  }
  return parsed.cents;
}

function optionalMoney(
  raw: string,
  unit: Intake['proofUnit'],
  label: string,
  errors: string[],
): number | null | undefined {
  if (raw.trim() === '') return null;
  const parsed = parseMoney(raw, unit);
  if (parsed.cents == null || parsed.flags.includes('UNPARSEABLE') || parsed.flags.includes('UNIT_UNKNOWN')) {
    errors.push(`${label} could not be read. The unit was not guessed.`);
    return undefined;
  }
  if (parsed.cents < 0) {
    errors.push(`${label} cannot be negative.`);
    return undefined;
  }
  return parsed.cents;
}

function priceFrom(cents: number, multipleRaw: string, location: string): LabeledCents | null {
  const product = multiplyCents(cents, multipleRaw);
  if (!product) return null;
  return calcFigure(product.cents, location);
}

function lenderCase(earnings: LabeledCents, which: string): LenderCase {
  const dollars = earnings.cents / 100;
  const base = sizePurchase(dollars, 0);
  const stressed = sizePurchase(dollars, 0.025);
  const wageCents = REPLACEMENT_WAGE_DOLLARS * 100;
  const cashCents = earnings.cents - wageCents;
  const priceCents = base.priceDollars == null ? null : dollarsToCents(base.priceDollars);
  const stressCents = stressed.priceDollars == null ? null : dollarsToCents(stressed.priceDollars);
  return {
    earnings,
    wage: {
      cents: wageCents,
      label: 'assumed',
      source: 'lender-sizing default',
      location:
        'Replacement owner/GM wage, midpoint of the directed $100,000–$150,000 range. Not a compensation survey and not from the deal file.',
    },
    cashFlow: calcFigure(
      cashCents,
      `${which} earnings minus the assumed replacement wage. Maintenance capex was not entered and was not invented.`,
    ),
    price:
      base.status === 'ok' && priceCents != null
        ? calcFigure(
            priceCents,
            `Supportable purchase price at ${TARGET_DSCR.toFixed(2)}× DSCR on ${which} earnings.`,
          )
        : null,
    stressedPrice:
      stressed.status === 'ok' && stressCents != null
        ? calcFigure(
            stressCents,
            `Same estimate with the SBA rate +250 bp. The seller note is fixed, so it is not shocked.`,
          )
        : null,
    status: base.status,
    dscrText: base.dscr != null && Number.isFinite(base.dscr) ? `${base.dscr.toFixed(2)}×` : null,
  };
}

export function buildDeal(intake: Intake): BuildResult {
  const errors: string[] = [];
  const period = intake.claimPeriod.trim() || 'period as entered';
  const reportedLabel = intake.reportedBasis === 'pnl_profit' ? 'P&L profit' : 'Tax-return profit';
  const reportedRaw = intake.reportedBasis === 'pnl_profit' ? intake.pnlProfitRaw : intake.taxProfitRaw;
  const reportedCents = requireMoney(reportedRaw, intake.proofUnit, reportedLabel, errors);

  const activeLines = intake.lines.filter((line) => !isBlankLine(line));
  const parsedLines: Array<{
    id: string;
    description: string;
    shortName: string;
    years: string[];
    category: Exclude<Intake['lines'][number]['category'], ''>;
    role: string;
    functionLabel: string;
    claimedOneTime: boolean;
    documented: boolean;
    managementCents: number;
    replacementCents: number | null;
  }> = [];

  activeLines.forEach((line, index) => {
    const description = line.description.trim();
    if (!description) {
      errors.push(`Add-back ${index + 1} needs a description.`);
      return;
    }
    if (line.category === '') {
      errors.push(`“${description}” needs a category. None was assumed.`);
      return;
    }
    const amount = requireMoney(line.amountRaw, line.unit, `“${description}”`, errors);
    if (amount == null) return;
    let replacementCents: number | null = null;
    if (line.replacementRaw.trim() !== '') {
      const replacement = requireMoney(
        line.replacementRaw,
        line.unit,
        `Replacement cost for “${description}”`,
        errors,
      );
      if (replacement == null) return;
      replacementCents = replacement;
    }
    parsedLines.push({
      id: line.id,
      description,
      shortName: line.shortName,
      years: parseYearList(line.yearsRaw),
      category: line.category,
      role: line.role.trim(),
      functionLabel: line.functionLabel.trim(),
      claimedOneTime: line.claimedOneTime || line.category === 'one_time',
      documented: line.documented,
      managementCents: amount,
      replacementCents,
    });
  });

  const claimed = optionalMoney(
    intake.claimedEarningsRaw,
    intake.claimedEarningsUnit,
    'Seller claimed earnings',
    errors,
  );
  const revenue = optionalMoney(intake.revenueRaw, intake.revenueUnit, 'Revenue', errors);
  const pnl =
    intake.reportedBasis === 'pnl_profit'
      ? reportedCents
      : optionalMoney(intake.pnlProfitRaw, intake.proofUnit, 'P&L profit', errors);
  const tax =
    intake.reportedBasis === 'tax_return_profit'
      ? reportedCents
      : optionalMoney(intake.taxProfitRaw, intake.proofUnit, 'Tax-return profit', errors);
  const deposits = optionalMoney(intake.depositsRaw, intake.proofUnit, 'Stated bank deposits', errors);
  const receipts = optionalMoney(intake.receiptsRaw, intake.proofUnit, 'Stated receipts', errors);
  if (intake.multipleRaw.trim() !== '' && !parsePositiveDecimal(intake.multipleRaw)) {
    errors.push('The multiple has to be a positive number such as 2.8. It was not filled in for you.');
  }

  if (
    errors.length ||
    reportedCents == null ||
    claimed === undefined ||
    revenue === undefined ||
    pnl === undefined ||
    tax === undefined ||
    deposits === undefined ||
    receipts === undefined
  ) {
    return { ok: false, errors };
  }

  let ownerSeen = 0;
  const classified = parsedLines.map((line) => {
    const ownerCompIndex = line.category === 'owner_comp' ? ownerSeen : -1;
    if (line.category === 'owner_comp') ownerSeen += 1;
    // The locked Greenridge dollars were agreed before the product became EBITDA-only.
    // Keep those line decisions so the hypothetical headlines still foot. Label the result EBITDA.
    const lineMetric = intake.exampleId === 'greenridge' ? 'SDE' : intake.metric;
    return classifyAddBack(line, lineMetric, ownerCompIndex, null);
  });

  const lines: DealLine[] = classified.map((line) => {
    const countedLabel = (cents: number): LabeledCents =>
      cents === line.managementCents
        ? userFigure(cents, `${line.description} counted in full from the typed amount`)
        : calcFigure(cents, `${line.description} after the add-back tests`);
    return {
      ...line,
      management: userFigure(line.managementCents, line.description),
      countedLow: countedLabel(line.qoeLowCents),
      countedHigh: countedLabel(line.qoeHighCents),
    };
  });

  const managementAddBacks = sum(lines.map((line) => line.managementCents));
  const qoeLow = sum(lines.map((line) => line.qoeLowCents));
  const qoeHigh = sum(lines.map((line) => line.qoeHighCents));
  const acceptedCents = sum(
    lines.filter((line) => line.classification === 'accepted').map((line) => line.managementCents),
  );
  const inflatedCents = sum(
    lines
      .filter((line) => line.classification === 'rejected' || line.qoeHighCents < line.managementCents)
      .map((line) => line.managementCents),
  );
  const managementAdjustedCents = reportedCents + managementAddBacks;
  const supportedLowCents = reportedCents + qoeLow;
  const supportedHighCents = reportedCents + qoeHigh;
  const typedClaim = claimed;
  const footing: Deal['footing'] =
    typedClaim == null ? 'not_checked' : typedClaim === managementAdjustedCents ? 'pass' : 'fail';
  const sellerCents = footing === 'fail' || typedClaim == null ? managementAdjustedCents : typedClaim;
  const sellerSays: LabeledCents =
    footing === 'pass' && typedClaim != null
      ? userFigure(typedClaim, 'Seller claimed earnings')
      : calcFigure(sellerCents, 'Tax-return or P&L profit plus every add-back line');
  const gapCents = sellerCents - supportedHighCents;

  const proof = {
    pnl: pnl == null ? missingFigure('P&L profit') : presentFigure(pnl, 'P&L profit'),
    tax: tax == null ? missingFigure('Tax-return profit') : presentFigure(tax, 'Tax-return profit'),
    deposits:
      deposits == null
        ? missingFigure('Stated total bank deposits')
        : presentFigure(deposits, 'Stated total bank deposits'),
    receipts:
      receipts == null
        ? missingFigure('Stated revenue or gross receipts')
        : presentFigure(receipts, 'Stated revenue or gross receipts'),
  };

  const notices: DealNotice[] = [];
  const profitSources = [
    proof.pnl.missing ? null : { name: 'P&L profit', cents: proof.pnl.cents },
    proof.tax.missing ? null : { name: 'Tax-return profit', cents: proof.tax.cents },
  ].filter((item): item is { name: string; cents: number } => item != null);
  if (profitSources.length < 2) {
    const present = profitSources.map((item) => `${item.name} ${formatCents(item.cents)}`).join(' and ');
    const absent = [proof.pnl.missing ? 'P&L profit' : null, proof.tax.missing ? 'Tax-return profit' : null]
      .filter((item): item is string => item != null)
      .join(' and ');
    notices.push({
      level: 'info',
      text: present
        ? `${present} is the only profit figure for ${period}. ${absent} was not entered. Nothing was copied from one statement onto another, and no reconciling plug was added.`
        : `No profit figure was entered for ${period}.`,
    });
  } else {
    const distinct = new Set(profitSources.map((item) => item.cents));
    if (distinct.size > 1) {
      const listed = profitSources.map((item) => `${item.name} ${formatCents(item.cents)}`).join('; ');
      notices.push({
        level: 'warn',
        text: `P&L and tax-return profit do not match (${listed}). Neither figure was chosen as the winner, and no average was invented. The bridge still starts from ${reportedLabel.toLowerCase()}.`,
      });
    } else {
      notices.push({
        level: 'info',
        text: `P&L profit and tax-return profit match at ${formatCents(profitSources[0]?.cents ?? 0)} for ${period}.`,
      });
    }
  }
  if (!proof.deposits.missing && !proof.receipts.missing && proof.deposits.cents !== proof.receipts.cents) {
    notices.push({
      level: 'warn',
      text: `Stated bank deposits ${formatCents(proof.deposits.cents)} and stated receipts ${formatCents(proof.receipts.cents)} do not match. They were not rescaled, and neither was overwritten.`,
    });
  } else if (!proof.deposits.missing && proof.receipts.missing) {
    notices.push({
      level: 'info',
      text: `Stated bank deposits are ${formatCents(proof.deposits.cents)}. They are not compared with profit, because deposits are not profit. No receipts figure was entered to compare against deposits.`,
    });
  } else if (proof.deposits.missing) {
    notices.push({
      level: 'info',
      text: 'Stated bank deposits were not entered. Deposit lines were not summed to invent a total.',
    });
  }
  if (footing === 'fail' && typedClaim != null) {
    notices.push({
      level: 'warn',
      text: `The typed seller claim ${formatCents(typedClaim)} does not equal ${reportedLabel.toLowerCase()} plus the add-back lines (${formatCents(managementAdjustedCents)}). The totals were not rewritten. The bridge uses the lines.`,
    });
  }
  if (intake.pnlFileName || intake.taxFileName || intake.depositsFileName) {
    const names = [intake.pnlFileName, intake.taxFileName, intake.depositsFileName]
      .filter(Boolean)
      .join(', ');
    notices.push({
      level: 'info',
      text: `Attached in this browser session only (not uploaded, not read): ${names}. Typed figures stay user-entered. A file name is not an extracted number.`,
    });
  }

  const intensityTotalText = formatPercent(managementAddBacks, reportedCents);
  const intensityInflatedText = formatPercent(inflatedCents, reportedCents);
  if (intensityInflatedText && inflatedCents * 5 >= reportedCents * 2) {
    notices.push({
      level: 'warn',
      text: `Inflated add-backs are ${intensityInflatedText} of ${reportedLabel.toLowerCase()}. That is above the 40% warning. Totals were not changed. A large fair owner-salary add-back is not this warning.`,
    });
  } else if (intensityInflatedText && inflatedCents * 5 >= reportedCents) {
    notices.push({
      level: 'warn',
      text: `Inflated add-backs are ${intensityInflatedText} of ${reportedLabel.toLowerCase()}. That is above the 20% warning. Totals were not changed.`,
    });
  }

  const acceptedOneTime = lines.find(
    (line) => line.classification === 'accepted' && line.category === 'one_time',
  );
  const recurring = lines.find((line) => line.flags.includes('recurring_disguised_as_one_time'));
  let contrast: string | null = null;
  if (acceptedOneTime && recurring) {
    const same = acceptedOneTime.managementCents === recurring.managementCents;
    contrast = same
      ? `Same dollar amount (${formatCents(acceptedOneTime.managementCents)}), different lines. ${acceptedOneTime.description} is a documented one-time item and is accepted. ${recurring.description} is labeled one-time but repeats across years, so it is rejected.`
      : `${acceptedOneTime.description} is a documented one-time item and is accepted. ${recurring.description} repeats across years, so it is rejected.`;
  }

  const multipleRaw = intake.multipleRaw.trim();
  const hasMultiple = multipleRaw !== '' && parsePositiveDecimal(multipleRaw) != null;
  const overpay = hasMultiple
    ? priceFrom(gapCents, multipleRaw, `${formatCents(gapCents)} × ${multipleRaw}`)
    : null;
  const priceOnClaimed = hasMultiple
    ? priceFrom(sellerCents, multipleRaw, `${formatCents(sellerCents)} × ${multipleRaw}`)
    : null;
  const priceOnSupportedLow = hasMultiple
    ? priceFrom(supportedLowCents, multipleRaw, `${formatCents(supportedLowCents)} × ${multipleRaw}`)
    : null;
  const priceOnSupportedHigh = hasMultiple
    ? priceFrom(supportedHighCents, multipleRaw, `${formatCents(supportedHighCents)} × ${multipleRaw}`)
    : null;

  const marginText = revenue != null && revenue > 0 ? formatPercent(supportedHighCents, revenue) : null;

  const ownerSalary = lines.find(
    (line) => line.category === 'owner_comp' && line.classification === 'accepted',
  );
  const lenderNote = ownerSalary
    ? `Documents-supported earnings already include ${formatCents(ownerSalary.managementCents)} of owner salary as take-home. This sketch then subtracts an assumed ${formatCents(REPLACEMENT_WAGE_DOLLARS * 100)} replacement owner/GM wage. Those are different figures. The salary is not deducted a second time. The wage is what the estimate removes so the loan is sized on cash left after paying someone to do the job. SBA floor ${SBA_DSCR_FLOOR.toFixed(2)}× is applied inside the estimate, under the ${TARGET_DSCR.toFixed(2)}× target. Prime 7.00% plus a 3.00% spread, 10-year SBA term, 10% seller note at 7% for 7 years, and 10% buyer cash are assumptions, not terms from this file.`
    : `This sketch subtracts an assumed ${formatCents(REPLACEMENT_WAGE_DOLLARS * 100)} replacement owner/GM wage. It was not found in the file. SBA floor ${SBA_DSCR_FLOOR.toFixed(2)}× sits under the ${TARGET_DSCR.toFixed(2)}× target. Rate, term, seller note, and buyer cash are assumptions.`;

  const supportedEarnings = calcFigure(supportedHighCents, 'Reported profit plus accepted add-backs');
  const claimedForLender =
    footing === 'pass' && typedClaim != null
      ? sellerSays
      : calcFigure(managementAdjustedCents, 'Reported profit plus every add-back line');

  return {
    ok: true,
    deal: {
      exampleId: intake.exampleId,
      targetName: intake.targetName.trim(),
      industry: intake.industry.trim(),
      metric: intake.metric,
      buyerType: intake.buyerType,
      period,
      reportedBasis: reportedLabel,
      reported: userFigure(reportedCents, reportedLabel),
      sellerSays,
      managementAdjusted: calcFigure(managementAdjustedCents, `${reportedLabel} plus every add-back line`),
      supportedLow: calcFigure(supportedLowCents, `${reportedLabel} plus the low end of each line`),
      supportedHigh: calcFigure(supportedHighCents, `${reportedLabel} plus the high end of each line`),
      acceptedTotal: calcFigure(acceptedCents, 'Sum of accepted add-backs'),
      rejectedTotal: calcFigure(inflatedCents, 'Sum of rejected or cut add-backs'),
      gap: calcFigure(gapCents, 'Seller total used on the bridge minus documents-supported earnings'),
      footing,
      footingDetail:
        footing === 'pass'
          ? `The typed seller claim equals ${reportedLabel.toLowerCase()} plus every add-back line.`
          : footing === 'fail'
            ? 'The typed seller claim does not foot to the lines.'
            : 'No separate seller total was typed. The seller total is the sum of the lines.',
      lines,
      proof,
      notices,
      intensityTotal: intensityTotalText
        ? {
            text: intensityTotalText,
            label: 'calculated',
            source: 'All add-backs divided by reported profit',
          }
        : null,
      intensityInflated: intensityInflatedText
        ? {
            text: intensityInflatedText,
            label: 'calculated',
            source: 'Rejected or cut add-backs divided by reported profit',
          }
        : null,
      revenue: revenue == null ? null : userFigure(revenue, 'Revenue'),
      marginText,
      multipleRaw: hasMultiple ? multipleRaw : null,
      overpay,
      priceOnClaimed,
      priceOnSupportedLow,
      priceOnSupportedHigh,
      contrast,
      lender: {
        claimed: lenderCase(claimedForLender, 'seller'),
        supported: lenderCase(supportedEarnings, 'documents-supported'),
        note: lenderNote,
      },
      noAddBacks: lines.length === 0,
    },
  };
}
