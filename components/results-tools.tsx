'use client';

import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { ReportStamp } from '@/components/report-stamp';
import { useWorkspace } from '@/components/workspace';
import { usd } from '@/lib/format';
import { theGap, VERDICT } from '@/lib/gap';

const money = (value: number) => (value < 0 ? `(${usd(-value)})` : usd(value));
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

type Row = [string, string | number];

export function ResultsTools() {
  const { analysis } = useWorkspace();
  const [busy, setBusy] = useState(false);
  if (!analysis) return null;
  const a = analysis;
  const g = theGap(a);
  const verdict = VERDICT[a.verdict.tone];
  const cover: Row[] = [
    ['Fair price', g.fair],
    ['Asking price', g.asking ?? 'Not provided'],
    ['The Gap (asking − fair)', g.gap ?? 'Not measured'],
    ['Above value', g.share == null ? 'n/a' : pct(g.share)],
    ['Verdict', verdict],
    ['Based on', 'DCF, LBO, comps and SBA financing'],
  ];
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
      const coverSheet = workbook.addWorksheet('Cover');
      coverSheet.columns = [{ width: 34 }, { width: 52 }];
      coverSheet.addRow(['DealSpan']).font = { name: 'Georgia', size: 20, bold: true, color: { argb: 'FF1F4A37' } };
      coverSheet.addRow([`${a.buyer.name} acquiring ${a.target.name}`]).font = { color: { argb: 'FF5F665F' } };
      coverSheet.addRow([]);
      const stamp = coverSheet.addRow(['FAIR PRICE', g.fair]);
      stamp.font = { bold: true, color: { argb: 'FFA8843C' } };
      stamp.getCell(2).font = { name: 'Georgia', size: 18, bold: true, color: { argb: 'FF1F4A37' } };
      stamp.getCell(2).numFmt = '$#,##0';
      for (const cell of [stamp.getCell(1), stamp.getCell(2)])
        cell.border = { top: { style: 'medium', color: { argb: 'FF1F4A37' } }, bottom: { style: 'medium', color: { argb: 'FF1F4A37' } } };
      coverSheet.addRow([`Asking ${g.asking != null ? money(g.asking) : 'not provided'} · DCF, LBO, comps and SBA financing`]).font = { italic: true, color: { argb: 'FF5F665F' } };
      coverSheet.addRow([]);
      for (const row of cover.slice(1)) {
        const r = coverSheet.addRow(row);
        if (typeof row[1] === 'number') r.getCell(2).numFmt = '$#,##0;($#,##0)';
        r.getCell(2).alignment = { horizontal: 'right' };
      }
      coverSheet.addRow([]);
      coverSheet.addRow(['Screening tool, not a valuation opinion or financial advice.']).font = { size: 9, color: { argb: 'FF5F665F' } };
      for (const sheet of sheets) {
        const worksheet = workbook.addWorksheet(sheet.name);
        worksheet.addRow(['Metric', 'Value']);
        for (const row of sheet.rows) worksheet.addRow(row);
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4A37' } };
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
    <div className="no-print border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 pt-4 sm:px-8">
        <button type="button" disabled={busy} onClick={() => void downloadExcel()} className="btn-outline h-9 px-4">{busy ? 'Preparing…' : 'Download Excel'}</button>
        <button type="button" onClick={() => window.print()} className="btn-solid h-9 px-4">Download PDF</button>
      </div>
    </div>
    <div className="print-report">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Logo size={30} withWordmark /></div>
      <h1 style={{ marginTop: '18pt' }}>{a.target.name}</h1><p>{a.buyer.name} acquiring {a.target.name} · Verdict: {verdict}</p>
      <div style={{ margin: '14pt 0 6pt' }}><ReportStamp fair={g.fair} asking={g.asking} /></div>
      <section><h2>The Gap</h2><table><tbody>{cover.map(([label, value]) => <tr key={label}><th>{label}</th><td>{typeof value === 'number' ? money(value) : value}</td></tr>)}</tbody></table></section>
      {sheets.map((sheet) => <section key={sheet.name}><h2>{sheet.name}</h2><table><tbody>{sheet.rows.map(([label, value], index) => <tr key={`${label}-${index}`}><th>{label}</th><td>{typeof value === 'number' ? money(value) : value}</td></tr>)}</tbody></table></section>)}
    </div>
  </>;
}
