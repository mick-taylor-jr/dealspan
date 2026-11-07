'use client';

import { useState } from 'react';
import { useWorkspace } from '@/components/workspace';

const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

type Row = [string, string | number];

export function ResultsTools() {
  const { analysis } = useWorkspace();
  const [busy, setBusy] = useState(false);
  if (!analysis) return null;
  const a = analysis;
  const sheets: Array<{ name: string; rows: Row[] }> = [
    { name: 'Overview', rows: [['Buyer', a.buyer.name], ['Target', a.target.name], ['Suggested offer', a.offerEv], ['Asking price', a.askingPrice ?? 'Not provided'], ['Verified EBITDA', a.verifiedEbitda], ['Verdict', a.verdict.headline], ...a.verdict.points.map((point, index) => [`Reason ${index + 1}`, point] as Row)] },
    { name: 'Fit', rows: [['Score', a.fit.answered ? `${a.fit.score} / 100` : 'Not answered'], ...a.fit.factors.map((factor) => [factor.name, `${factor.tone}: ${factor.answer}`] as Row), ...a.fit.questions.map((question, index) => [`Seller question ${index + 1}`, question] as Row)] },
    { name: 'Synergies', rows: [['Annual synergies counted', a.synergies.runRate], ['Value at offer multiple', a.synergies.valueAtOffer], ['Integration cost', a.synergies.integrationCost], ...a.synergies.lines.map((line) => [line.description, line.kept] as Row)] },
    { name: 'Financing', rows: [['Recommended loan', a.financing.recommendedLoan], ['Buyer cash', a.financing.buyerCash], ['Loan payment coverage', a.financing.recommendedCoverage], ['Maximum loan', a.financing.maxLoan], ['Cash on hand', a.financing.cashOnHand]] },
    { name: 'DCF', rows: [['Perpetuity-growth enterprise value', a.dcf.gordon?.ev ?? 'n/a'], ['Exit-multiple enterprise value', a.dcf.exit.ev], ['WACC', pct(a.dcf.wacc)], ['Equity value', a.dcf.gordon?.equity ?? a.dcf.exit.equity], ...a.dcf.rows.map((row) => [`${row.year} free cash flow`, row.ufcf] as Row)] },
    { name: 'LBO', rows: [['Offer enterprise value', a.lbo.ev], ['Equity invested', a.lbo.equity], ['Acquisition debt', a.lbo.debt], ['IRR', a.lbo.irr == null ? 'n/a' : pct(a.lbo.irr)], ['Money multiple', a.lbo.moic ?? 'n/a'], ['Maximum price multiple at target return', a.lbo.maxMultipleAtTarget ?? 'n/a'], ...a.lbo.years.map((year) => [`${year.year} ending debt`, year.closingDebt] as Row)] },
    { name: 'Precedents', rows: [['Industry', a.target.industry], ['Market basis', a.market.basis], ['Comparable sales', a.market.deals.length], ['First quartile multiple', a.market.q1], ['Median multiple', a.market.median], ['Third quartile multiple', a.market.q3], ...a.market.deals.map((deal, index) => [`Sale ${index + 1}`, deal.multiple] as Row)] },
    { name: 'Combined', rows: [['Buyer revenue', a.buyer.revenue[2]], ['Target revenue', a.target.revenue[2]], ['Revenue accretion', pct(a.proForma.revenueAccretion)], ['EBITDA accretion', pct(a.proForma.ebitdaAccretion)], ['Leverage at close', a.proForma.leverageAtClose], ['Cash after equity check', a.proForma.cashLeft], ...a.proForma.years.map((year) => [`${year.year} combined EBITDA`, year.ebitda] as Row)] },
  ];
  const downloadExcel = async () => {
    setBusy(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'DealSpan';
      workbook.created = new Date();
      for (const sheet of sheets) {
        const worksheet = workbook.addWorksheet(sheet.name);
        worksheet.addRow(['Metric', 'Value']);
        for (const row of sheet.rows) worksheet.addRow(row);
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14213D' } };
        worksheet.columns = [{ width: 42 }, { width: 72 }];
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      }
      const data = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(data as ArrayBuffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'dealspan-analysis.xlsx'; link.click(); URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  };
  return <>
    <div className="no-print mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-5 pt-5 sm:px-8">
      <button type="button" disabled={busy} onClick={() => void downloadExcel()} className="h-10 border border-ink px-4 text-sm font-semibold disabled:opacity-50">{busy ? 'Preparing…' : 'Download Excel'}</button>
      <button type="button" onClick={() => window.print()} className="h-10 bg-signal px-4 text-sm font-semibold text-white">Download PDF</button>
    </div>
    <div className="print-report">
      <h1>DealSpan analysis</h1><p>{a.buyer.name} acquiring {a.target.name}</p>
      {sheets.map((sheet) => <section key={sheet.name}><h2>{sheet.name}</h2><table><tbody>{sheet.rows.map(([label, value], index) => <tr key={`${label}-${index}`}><th>{label}</th><td>{typeof value === 'number' ? money(value) : value}</td></tr>)}</tbody></table></section>)}
    </div>
  </>;
}
