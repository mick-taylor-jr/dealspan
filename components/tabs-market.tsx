'use client';

import type { ReactNode } from 'react';
import { MultipleBars, SplitBar } from '@/components/charts';
import { COLORS, Panel, Prov, Stat } from '@/components/ui';
import { DEALS_SOURCE } from '@/lib/deals';
import { FINANCING_SOURCES, SBA } from '@/lib/financing';
import { pct, times, usd, usdShort } from '@/lib/format';
import type { Analysis, Scenario } from '@/lib/model';

/* ---------- Shared intro block ---------- */

export function TabIntro({ what, why }: { what: ReactNode; why: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2 sm:gap-8">
      <div>
        <h2 className="text-sm font-semibold">What this shows</h2>
        <p className="mt-1 text-sm leading-6 text-ink/80">{what}</p>
      </div>
      <div className="border-line sm:border-l sm:pl-8">
        <h2 className="text-sm font-semibold">Why it matters</h2>
        <p className="mt-1 text-sm leading-6 text-ink/80">{why}</p>
      </div>
    </section>
  );
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="text-pine underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/* ---------- Precedents ---------- */

export function PrecedentsTab({ a }: { a: Analysis }) {
  const m = a.market;
  const ranked = a.ranked;
  const rows = ranked.map((d, i) => ({
    id: `${d.target}-${d.date}`,
    name: d.target,
    sub: `${Math.round(d.score)}/100 match, ${d.date.slice(0, 4)}, ${usdShort(d.ebitda)} profit`,
    multiple: d.multiple,
    rank: i + 1,
    score: d.score,
  }));
  const top = ranked.slice(0, 3);
  const topMid = top.length ? top.reduce((s, d) => s + d.multiple, 0) / top.length : NaN;
  return (
    <>
      <TabIntro
        what="Every sale in this industry in our database, ranked by how close each one is to the company you want to buy, with the price each buyer paid as a multiple of yearly profit (EBITDA)."
        why="The closest matches tell you the most about what this business should sell for. Deals far down the list are a different size or kind of business, so weigh them less."
      />
      {ranked.length ? (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Panel>
              <Stat
                label={`Closest ${top.length} matches paid, on average`}
                value={times(topMid)}
                prov="calculated"
                note={`= ${usdShort(topMid * a.verifiedEbitda)} for this company`}
              />
            </Panel>
            <Panel>
              <Stat
                label={
                  m.basis === 'small' ? 'Middle half, small deals (profit ≤ $5M)' : 'Middle half, all deals'
                }
                value={`${times(m.q1)}–${times(m.q3)}`}
                prov="calculated"
                note={`${m.deals.length} sales with a published profit`}
              />
            </Panel>
            <Panel>
              <Stat
                label="Your offer"
                value={times(a.deal.offerMultiple)}
                note={
                  a.deal.offerMultiple < m.q1
                    ? 'Below most sales in this industry'
                    : a.deal.offerMultiple > m.q3
                      ? 'Above most sales in this industry'
                      : 'In line with this industry'
                }
              />
            </Panel>
          </div>
          <Panel title="Sales ranked by how close they are to your target" aside="Closest match first">
            <MultipleBars rows={rows} offer={a.deal.offerMultiple} median={m.median} />
          </Panel>
          <Panel title="Why each sale ranks where it does">
            <ol className="flex flex-col divide-y divide-line">
              {ranked.map((d, i) => (
                <li
                  key={`${d.target}-${d.date}`}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 py-3 sm:grid-cols-[2rem_1fr_10rem] sm:items-center"
                >
                  <span className="hidden text-sm font-semibold text-faint tabular-nums sm:block">
                    #{i + 1}
                  </span>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <div className="text-sm font-medium">
                      <span className="mr-2 text-faint sm:hidden">#{i + 1}</span>
                      {d.target}
                    </div>
                    <div className="text-xs leading-5 text-muted">
                      {d.subsector}. Bought by {d.acquirer}. {d.reasons.join(', ')}
                      {d.parts.size === 0 ? ', too far from your size to compare well' : ''}.{' '}
                      <SourceLink href={d.source}>Source</SourceLink>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8ece9]">
                      <div
                        className="h-full rounded-full bg-pine"
                        style={{ width: `${Math.min(100, d.score)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-sm font-semibold tabular-nums">
                      {Math.round(d.score)}/100
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </>
      ) : (
        <Panel>
          <p className="text-sm text-muted">No sales with a published profit in this industry yet.</p>
        </Panel>
      )}

      <details className="rounded-2xl border border-line bg-card p-6">
        <summary className="cursor-pointer text-sm font-semibold">
          How the match score works, and deal details
        </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted">
          <p>
            Out of 100: same type of work 25 (from “Type of work” on the intake), similar size 30 (full points
            at the same profit, zero at 5× bigger or smaller), same kind of buyer 15, deal structure 10 (no
            earnout like yours, 100% bought), how recent 10, priced on actual rather than forecast profit 10.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-faint">
                <th className="py-2 font-medium">Business sold</th>
                <th className="py-2 font-medium">Buyer</th>
                <th className="py-2 font-medium">Year</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Profit</th>
                <th className="py-2 text-right font-medium">Multiple</th>
                <th className="py-2 pl-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {[...ranked, ...m.withoutProfit].map((d) => (
                <tr key={`${d.target}-${d.date}`} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{d.target}</div>
                    {d.notes ? <div className="text-xs leading-5 text-faint">{d.notes}</div> : null}
                  </td>
                  <td className="py-2 pr-3 text-muted">{d.acquirer}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted">{d.date.slice(0, 4)}</td>
                  <td className="py-2 text-right tabular-nums">{d.ev ? usdShort(d.ev) : '—'}</td>
                  <td className="py-2 text-right tabular-nums">
                    {d.ebitda ? usdShort(d.ebitda) : 'Not published'}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {d.ev && d.ebitda ? times(d.ev / d.ebitda) : '—'}
                  </td>
                  <td className="py-2 pl-3">
                    <SourceLink href={d.source}>Link</SourceLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-5 text-faint">
          {DEALS_SOURCE}. Earnouts are left out of price. Partial purchases are scaled to 100%. Foreign deals
          are converted to US$ at rounded 2023–2026 average rates (an assumption). Sales without a published
          profit can’t be scored or charted, so they are listed last.
        </p>
      </details>
    </>
  );
}

/* ---------- Financing ---------- */

export function FinancingTab({ a }: { a: Analysis }) {
  const f = a.financing;
  return (
    <>
      <TabIntro
        what="How much to borrow and how much of your own cash to put in, using the SBA 7(a) loan rules most small-business buyers finance under."
        why="Borrow too much and one slow year means you can’t make the loan payment. Borrow more than the rules allow and the bank won’t approve the loan."
      />

      <ScenarioFinancing a={a} />

      <section className="rounded-2xl border border-line bg-card p-6">
        <div className="text-sm text-muted">Our recommendation at your offer</div>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-balance">
          Borrow about {usd(f.recommendedLoan)} with an SBA 7(a) loan and put in {usd(f.buyerCash)} of your
          own cash.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {f.recommendedReason === 'max'
            ? `That is the most the rules allow, because you must pay at least 10% of the total cost yourself. The loan payment of ${usd(f.recommendedPayment)} a year is covered ${times(f.recommendedCoverage, 2)} by ${a.target.name}’s profit, well above the ${times(f.coverageFloor, 2)} lenders require.`
            : `That keeps the yearly loan payment of ${usd(f.recommendedPayment)} covered ${times(f.recommendedCoverage, 2)} by ${a.target.name}’s profit, leaving room for a bad year. Lenders would allow up to ${usd(f.maxLoan)}.`}
        </p>
        <div className="mt-6">
          <SplitBar
            parts={[
              { name: 'SBA 7(a) loan', amount: f.recommendedLoan, color: COLORS.syn },
              { name: 'Your cash', amount: f.buyerCash, color: COLORS.buyer },
            ]}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          Want to put in less cash? The seller can lend up to {usd(f.sellerNoteMax)} (half of your 10%) if
          they agree to take no payments until the bank loan is paid off. Few sellers agree to that.
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <Stat
            label="Most a lender would allow"
            value={usd(f.maxLoan)}
            prov="calculated"
            note={limitNote(f.maxLoanReason)}
          />
        </Panel>
        <Panel>
          <Stat
            label="What you planned"
            value={<span className={f.plannedOk ? '' : 'text-risk'}>{usd(f.plannedLoan)}</span>}
            prov="user-entered"
            note={f.plannedOk ? `Fits. Covered ${times(f.plannedCoverage, 2)}` : 'Over the limit'}
          />
        </Panel>
        <Panel>
          <Stat
            label="Minimum cash from you"
            value={usd(f.minEquity)}
            prov="calculated"
            note="10% of price plus fees"
          />
        </Panel>
        <Panel>
          <Stat
            label="Your cash after closing"
            value={
              <span className={f.cashOnHand - f.buyerCash < 0 ? 'text-risk' : ''}>
                {usd(f.cashOnHand - f.buyerCash)}
              </span>
            }
            prov="calculated"
            note={`${usd(f.cashOnHand)} on hand today`}
          />
        </Panel>
      </div>

      <Panel title="Where each number comes from">
        <dl className="divide-y divide-line text-sm">
          <SourceRow
            k="Profit used for the loan test"
            v={usd(a.verifiedEbitda)}
            from={`Your intake: ${a.target.name}, 2025 EBITDA`}
            prov="user-entered"
          />
          <SourceRow
            k="Total cost to buy"
            v={usd(f.projectCost)}
            from={`Price ${usd(a.offerEv)} (your ${times(a.deal.offerMultiple)} offer × 2025 EBITDA) plus ${pct(a.deal.feesPct, 0)} fees, from The deal section`}
            prov="calculated"
          />
          <SourceRow
            k="Loan type"
            v={f.category}
            from={
              f.category === 'Business expansion'
                ? 'You are a company buying another in the same industry'
                : 'You are not an existing company in the same industry, so SBA treats this as a first acquisition'
            }
            prov="calculated"
          />
          <SourceRow
            k="Required debt coverage"
            v={`${times(f.coverageFloor, 2)} or better`}
            from={<SourceLink href={FINANCING_SOURCES[0].url}>{FINANCING_SOURCES[0].source}</SourceLink>}
            prov="cited"
          />
          <SourceRow
            k="Coverage we aim for"
            v={`${times(SBA.comfortableCoverage, 2)}`}
            from="Extra room for a bad year. Our assumption, not an SBA rule"
            prov="assumed"
          />
          <SourceRow
            k="Loan length"
            v={`${SBA.termYears} years`}
            from={<SourceLink href={FINANCING_SOURCES[4].url}>{FINANCING_SOURCES[4].source}</SourceLink>}
            prov="cited"
          />
          <SourceRow
            k="Interest rate"
            v={pct(f.rate, 2)}
            from={`Your intake, The deal section. SBA maximum today is ${pct(f.rateCap, 2)} (prime 7.00% + 3%)`}
            prov="user-entered"
          />
          <SourceRow
            k="Your share of the cost"
            v="At least 10%"
            from={<SourceLink href={FINANCING_SOURCES[2].url}>{FINANCING_SOURCES[2].source}</SourceLink>}
            prov="cited"
          />
          <SourceRow
            k="Largest SBA 7(a) loan"
            v={usd(SBA.maxLoan)}
            from={<SourceLink href={FINANCING_SOURCES[3].url}>{FINANCING_SOURCES[3].source}</SourceLink>}
            prov="cited"
          />
        </dl>
      </Panel>

      <details className="rounded-2xl border border-line bg-card p-6">
        <summary className="cursor-pointer text-sm font-semibold">
          How the loan is sized, and all sources
        </summary>
        <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-muted">
          <p>
            Debt coverage = yearly profit (EBITDA) ÷ yearly loan payments. Each $1 borrowed over{' '}
            {SBA.termYears} years at {pct(f.rate, 2)} costs {usd(f.annualPaymentPerDollar * 1000)} a year per
            $1,000. The loan is the smallest of: the amount that keeps coverage at {times(f.coverageFloor, 2)}{' '}
            ({usd(f.maxByCoverage)}), the price minus your 10% ({usd(f.projectCost - f.minEquity)}), and the{' '}
            {usd(SBA.maxLoan)} SBA cap. We then aim for {times(SBA.comfortableCoverage, 2)} coverage, not the
            minimum.
          </p>
          <p>
            Lenders also check your own company’s debt in a combined test and may ask for more cash. Treat
            this as a starting point for the lender conversation.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {FINANCING_SOURCES.map((s) => (
              <li key={s.id}>
                {s.claim}. <SourceLink href={s.url}>{s.source}</SourceLink>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </>
  );
}

const SCENARIO_COLOR: Record<Scenario['id'], string> = {
  offer: '#17201c',
  good: '#14845e',
  average: '#8a978f',
  bad: '#b4432e',
};

function ScenarioFinancing({ a }: { a: Analysis }) {
  const maxCost = Math.max(...a.scenarios.map((s) => s.financing.projectCost));
  const rows: Array<[string, (s: Scenario) => ReactNode]> = [
    ['Price', (s) => usd(s.price)],
    ['Total cost with fees', (s) => usd(s.financing.projectCost)],
    ['Bank loan (SBA 7(a))', (s) => usd(s.financing.recommendedLoan)],
    ['Your cash', (s) => usd(s.financing.buyerCash)],
    ['Yearly loan payment', (s) => usd(s.financing.recommendedPayment)],
    ['Profit covers the payment', (s) => times(s.financing.recommendedCoverage, 2)],
    [
      'Your cash after closing',
      (s) => {
        const left = s.financing.cashOnHand - s.financing.buyerCash;
        return <span className={left < 0 ? 'text-risk' : ''}>{usd(left)}</span>;
      },
    ],
  ];
  return (
    <Panel title="Financing at each price" aside="Same good, average and bad prices as the Overview chart">
      <div className="flex flex-col gap-4">
        {a.scenarios.map((s) => (
          <div key={s.id} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SCENARIO_COLOR[s.id] }}
              />
              <span className="text-sm font-semibold">{s.name}</span>
            </div>
            <div style={{ width: `${(s.financing.projectCost / maxCost) * 100}%` }} className="min-w-[60%]">
              <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-md">
                <div
                  style={{
                    width: `${(s.financing.recommendedLoan / s.financing.projectCost) * 100}%`,
                    background: COLORS.syn,
                  }}
                  title={`Loan ${usd(s.financing.recommendedLoan)}`}
                />
                <div
                  style={{
                    width: `${(s.financing.buyerCash / s.financing.projectCost) * 100}%`,
                    background: COLORS.buyer,
                  }}
                  title={`Your cash ${usd(s.financing.buyerCash)}`}
                />
              </div>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted sm:pl-[10rem]">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.syn }} /> Bank
            loan
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.buyer }} /> Your
            cash
          </span>
          <span>Bar length = total cost</span>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line text-xs text-faint">
              <th className="py-2 text-left font-normal" />
              {a.scenarios.map((s) => (
                <th
                  key={s.id}
                  className={`py-2 text-right font-medium ${s.id === 'offer' ? 'text-ink' : ''}`}
                >
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, get]) => (
              <tr key={name} className="border-b border-line/60">
                <td className="py-2 pr-4">{name}</td>
                {a.scenarios.map((s) => (
                  <td key={s.id} className={`py-2 text-right ${s.id === 'offer' ? 'font-semibold' : ''}`}>
                    {get(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        A good deal is the low end of what the business is worth on its own, an average deal is the middle,
        and a bad deal is the high end, averaged across the valuation methods on the Overview. If the bad-deal
        price still finances comfortably, you have room to negotiate. If only the good-deal price works, don’t
        chase the seller up.
      </p>
    </Panel>
  );
}

function limitNote(reason: 'coverage' | 'equity' | 'sba cap') {
  if (reason === 'equity') return 'Limited by your required 10% of the cost';
  if (reason === 'sba cap') return 'Limited by the $5M SBA cap';
  return 'Limited by debt coverage';
}

function SourceRow({
  k,
  v,
  from,
  prov,
}: {
  k: string;
  v: ReactNode;
  from: ReactNode;
  prov: Parameters<typeof Prov>[0]['label'];
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[14rem_9rem_1fr] sm:items-baseline sm:gap-4">
      <dt className="font-medium">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
      <dd className="flex flex-wrap items-center gap-2 text-muted">
        <Prov label={prov} /> <span>{from}</span>
      </dd>
    </div>
  );
}
