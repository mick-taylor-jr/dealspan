'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Columns, FootballField, StackedColumns } from '@/components/charts';
import { Logo } from '@/components/Logo';
import { COLORS, Panel, Prov, Stat, Swatch } from '@/components/ui';
import { useWorkspace, type AiState } from '@/components/workspace';
import { AiStatus } from '@/components/tabs-market';
import { ASSUMPTION_NOTES, ASSUMPTIONS } from '@/lib/assumptions';
import { DEMO_STORIES } from '@/lib/demo';
import { acct, pct, times, usd, usdShort } from '@/lib/format';
import { industryLabel } from '@/lib/industries';
import { FinancingTab, PrecedentsTab, TabIntro } from '@/components/tabs-market';
import type { Analysis } from '@/lib/model';
import type { Intake } from '@/lib/types';

const TABS = ['Overview', 'Fit', 'Synergies', 'Financing', 'DCF', 'LBO', 'Precedents', 'Combined'] as const;
type Tab = (typeof TABS)[number];

const LOADING_LINES = [
  'Ranking precedent sales in the industry',
  'Running the DCF and LBO',
  'Testing the loan at SBA rates',
  'Checking the seller’s earnings claims',
];

export function ResultsScreen() {
  const { analysis, intake, ready, missing, findPrecedents, ai } = useWorkspace();
  const [tab, setTab] = useState<Tab>('Overview');
  const hasAnalysis = analysis != null;
  const [running, setRunning] = useState(true);
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (hasAnalysis) findPrecedents();
  }, [hasAnalysis, findPrecedents]);
  useEffect(() => {
    const tick = window.setInterval(() => setLine((n) => (n + 1) % LOADING_LINES.length), 600);
    const done = window.setTimeout(() => setRunning(false), 2400);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, []);
  if (!ready || (running && analysis)) return <Loading line={LOADING_LINES[line]} />;
  if (!analysis) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-24">
        <h1 className="font-serif text-3xl text-green">Nothing to analyze yet</h1>
        <p className="text-sm leading-6 text-muted">
          {missing.length} fields are still empty. Fill in both companies and the deal terms, or load the demo
          deal.
        </p>
        <Link href="/" className="btn-solid">
          Go to the intake
        </Link>
      </div>
    );
  }
  const a = analysis;
  return (
    <div className="pb-16">
      <ResultsHeader a={a} intake={intake} />
      <div className="no-print sticky top-14 z-20 border-b border-line bg-page">
        <nav
          className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 sm:px-8"
          aria-label="Analysis sections"
        >
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              aria-current={tab === item ? 'page' : undefined}
              className={`relative shrink-0 px-3 py-3 text-sm ${
                tab === item ? 'font-semibold text-green' : 'text-muted hover:text-ink'
              }`}
            >
              {item}
              {tab === item ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-green" /> : null}
            </button>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-8 sm:px-8">
        {tab === 'Overview' ? <Overview a={a} go={setTab} ai={ai} /> : null}
        {tab === 'Fit' ? <FitTab a={a} intake={intake} /> : null}
        {tab === 'Synergies' ? <SynergyTab a={a} /> : null}
        {tab === 'Financing' ? <FinancingTab a={a} /> : null}
        {tab === 'DCF' ? <DcfTab a={a} /> : null}
        {tab === 'LBO' ? <LboTab a={a} /> : null}
        {tab === 'Precedents' ? <PrecedentsTab a={a} ai={ai} /> : null}
        {tab === 'Combined' ? <CombinedTab a={a} /> : null}
        <Assumptions />
      </div>
    </div>
  );
}

function Loading({ line }: { line: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6"
      role="status"
      aria-live="polite"
    >
      <Logo size={64} loading />
      <p className="eyebrow">Running the report</p>
      <p className="min-h-6 text-center text-sm text-muted">{line}…</p>
    </div>
  );
}

/* ---------- Header ---------- */

function ResultsHeader({ a, intake }: { a: Analysis; intake: Intake }) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="fade-in flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link href="/" className="text-muted underline underline-offset-4 hover:text-green">
              Edit inputs
            </Link>
            {intake.demo ? <span className="text-xs text-muted">Hypothetical demo companies</span> : null}
          </div>
          <h1 className="max-w-3xl font-serif text-3xl leading-tight text-balance sm:text-4xl">
            <span className="text-green">{a.buyer.name}</span>{' '}
            <span className="font-sans text-2xl font-normal text-muted sm:text-3xl">acquiring</span>{' '}
            <span className="text-gold">{a.target.name}</span>
          </h1>
          <p className="text-sm text-muted">
            {industryLabel(a.target.industry).split(' (')[0]}. {usdShort(a.target.revenue[2])} revenue and{' '}
            {usdShort(a.verifiedEbitda)} EBITDA in 2025.
          </p>
        </div>
        <dl className="grid min-w-[18rem] grid-cols-2 gap-x-8 gap-y-4 border-l-2 border-green pl-6">
          <HeadStat k="Your offer" v={usd(a.offerEv)} note={`${times(a.deal.offerMultiple)} EBITDA`} />
          <HeadStat
            k="Equity return"
            v={a.lbo.irr != null ? pct(a.lbo.irr) : 'n/a'}
            note={`${a.lbo.moic != null ? `${times(a.lbo.moic, 2)} your money ` : ''}over ${a.deal.holdYears} yrs`}
          />
          <HeadStat k="Synergies counted" v={`${usdShort(a.synergies.runRate)}/yr`} />
          <HeadStat k="Fit score" v={a.fit.answered ? `${a.fit.score} / 100` : 'Not answered'} />
        </dl>
      </div>
    </header>
  );
}

function HeadStat({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-serif text-xl text-green tabular-nums">{v}</dd>
      {note ? <dd className="text-xs text-muted">{note}</dd> : null}
    </div>
  );
}

/* ---------- Overview ---------- */

function Overview({ a, go, ai }: { a: Analysis; go: (tab: Tab) => void; ai: AiState }) {
  const toneStyle = {
    good: 'border-green bg-green-soft',
    caution: 'border-gold bg-gold-soft',
    risk: 'border-brick bg-brick-soft',
  }[a.verdict.tone];
  const toneWord = { good: 'Looks sound', caution: 'Worth a closer look', risk: 'Red flags' }[a.verdict.tone];
  return (
    <>
      <TabIntro
        what="The one-page answer: what the target is worth, how your offer compares, whether the two companies fit, and how to pay for it."
        why="Start here. Each card points to a tab that shows the work behind the number."
      />
      <section className={`border-l-4 p-5 sm:p-6 ${toneStyle}`}>
        <div className="eyebrow">{toneWord}</div>
        <p className="mt-1 text-xl font-semibold text-balance">{a.verdict.headline}</p>
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-sm leading-6 text-ink sm:grid-cols-2">
          {a.verdict.points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 bg-gold" />
              {point}
            </li>
          ))}
        </ul>
      </section>
      <Panel
        title="What the target is worth, and what to pay"
        aside={<span>Enterprise value, cash-free and debt-free</span>}
      >
        <FootballField
          rows={a.field}
          offer={a.offerEv}
          asking={a.askingPrice}
          prices={a.scenarios
            .filter((s) => s.id !== 'offer')
            .map((s) => ({
              id: s.id,
              name: s.name.replace(' deal', ''),
              value: s.price,
              color: s.id === 'good' ? '#1F4A37' : s.id === 'bad' ? '#9E3B2E' : '#5F665F',
            }))}
        />
        <p className="mt-2 text-xs leading-5 text-muted">
          Dark green bars value the target on its own. The pale bar adds the synergies only you can create.
          The good, average and bad prices average the dark green bars’ low ends, middles and high ends.
        </p>
        <AiStatus ai={ai} compact />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Why this deal">
          <ul className="flex flex-col gap-2 text-sm leading-6">
            {a.fit.thesis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => go('Fit')}
            className="mt-4 text-sm font-semibold text-green underline decoration-gold underline-offset-4"
          >
            See the fit scorecard
          </button>
        </Panel>
        <Panel title="Extra profit from combining">
          <Stat
            label="Synergies we count, per year"
            value={usd(a.synergies.runRate)}
            prov="calculated"
            emphasis
          />
          <p className="mt-3 text-sm leading-6 text-muted">
            Money you make or save only because the two companies are together, like sharing one shop or one
            office. We count part of what you entered, since these rarely work out in full. This value is
            yours to keep, so don’t pay it to the seller.
          </p>
          <button
            type="button"
            onClick={() => go('Synergies')}
            className="mt-4 text-sm font-semibold text-green underline decoration-gold underline-offset-4"
          >
            See every line
          </button>
        </Panel>
        <Panel title="How to pay for it">
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Bank loan (SBA 7(a))"
              value={usdShort(a.financing.recommendedLoan)}
              prov="calculated"
            />
            <Stat label="Your cash" value={usdShort(a.financing.buyerCash)} prov="calculated" />
            <Stat
              label="Loan payment covered"
              value={times(a.financing.recommendedCoverage, 2)}
              note={`Lenders want ${times(a.financing.coverageFloor, 2)}+`}
            />
            <Stat
              label="Cash left after"
              value={
                <span className={a.financing.cashOnHand - a.financing.buyerCash < 0 ? 'text-risk' : ''}>
                  {usdShort(a.financing.cashOnHand - a.financing.buyerCash)}
                </span>
              }
            />
          </div>
          <button
            type="button"
            onClick={() => go('Financing')}
            className="mt-4 text-sm font-semibold text-green underline decoration-gold underline-offset-4"
          >
            See how the loan is sized
          </button>
        </Panel>
      </div>

      {a.earningsGap ? (
        <Panel title="Earnings check">
          <div className="grid gap-6 sm:grid-cols-4">
            <Stat label="Seller claims" value={usd(a.sellerEbitda!)} prov="user-entered" />
            <Stat label="Documents support" value={usd(a.verifiedEbitda)} prov="user-entered" />
            <Stat label="Gap" value={usd(a.earningsGap.gap)} prov="calculated" />
            <Stat
              label={`Overpay at ${times(a.deal.offerMultiple)}`}
              value={<span className="text-risk">{usd(a.earningsGap.overpay)}</span>}
              prov="calculated"
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Every model on this page uses the {usd(a.verifiedEbitda)} you can support, not the seller’s
            number.
          </p>
        </Panel>
      ) : null}
    </>
  );
}

/* ---------- Fit ---------- */

function FitTab({ a, intake }: { a: Analysis; intake: Intake }) {
  const toneCls = {
    strength: 'bg-green-soft text-green',
    neutral: 'bg-gold-soft text-[#7a5d22]',
    risk: 'bg-brick-soft text-brick',
  };
  const toneWord = { strength: 'Strength', neutral: 'Watch', risk: 'Risk' };
  return (
    <>
      <TabIntro
        what="How well the two companies go together, scored from your answers on the intake, plus questions to ask the seller."
        why="A deal can look great on paper and still fail if customers leave with the owner or the teams don’t work together."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ProfileCard
          role="buyer"
          name={a.buyer.name}
          c={intake.buyer}
          story={intake.demo ? DEMO_STORIES.buyer : undefined}
        />
        <ProfileCard
          role="target"
          name={a.target.name}
          c={intake.target}
          story={intake.demo ? DEMO_STORIES.target : undefined}
        />
      </div>
      <Panel
        title="Fit scorecard"
        aside={
          a.fit.answered ? (
            <span>
              <span className="font-serif text-xl text-green tabular-nums">{a.fit.score}</span> / 100 from{' '}
              {a.fit.answered} factors
            </span>
          ) : (
            'Answer the fit questions on the intake to score this.'
          )
        }
      >
        <div className="divide-y divide-line">
          {a.fit.factors.map((factor) => (
            <div key={factor.id} className="grid gap-2 py-3 sm:grid-cols-[13rem_7rem_1fr] sm:items-baseline">
              <span className="text-sm font-medium">{factor.name}</span>
              <span>
                <span className={`px-2 py-0.5 text-xs font-semibold ${toneCls[factor.tone]}`}>
                  {toneWord[factor.tone]}
                </span>
              </span>
              <span className="text-sm leading-6 text-muted">
                <span className="font-medium text-ink">{factor.answer}.</span> {factor.why}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Why this deal">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6">
            {a.fit.thesis.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Questions for the seller">
          {a.fit.questions.length ? (
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-6">
              {a.fit.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No open risks from your answers.</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function ProfileCard({
  role,
  name,
  c,
  story,
}: {
  role: 'buyer' | 'target';
  name: string;
  c: Intake['buyer'];
  story?: string;
}) {
  return (
    <section className="overflow-hidden border border-line bg-card">
      <div className={`h-0.5 ${role === 'buyer' ? 'bg-green' : 'bg-gold'}`} />
      <div className="p-6">
        <div className="eyebrow">{role === 'buyer' ? 'Your company' : 'Target'}</div>
        <h3 className="mt-1 font-serif text-xl text-green">{name}</h3>
        <p className="mt-2 text-sm leading-6 text-ink/80">{story ?? c.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Def k="Industry" v={industryLabel(c.industry)} />
          <Def k="Where" v={c.location} />
          <Def k="Customers" v={c.customers} />
          <Def k="Employees" v={c.employees} />
        </dl>
      </div>
    </section>
  );
}

function Def({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd>{v || '—'}</dd>
    </div>
  );
}

/* ---------- Synergies ---------- */

function SynergyTab({ a }: { a: Analysis }) {
  const s = a.synergies;
  const premium = a.offerEv - (a.dcf.gordon?.ev ?? a.dcf.exit.ev);
  return (
    <>
      <TabIntro
        what={
          <>
            <span className="font-medium text-ink">Synergies</span> are the extra money you make or save only
            because the two companies are together. Saving money: one office, one shop, buying supplies in
            bulk. Making money: selling your services to their customers.
          </>
        }
        why="They are why you can afford to pay more than other buyers. But they come from your work after the deal, not from the seller, so keep them out of the price. We count only part of each one because they rarely work out in full."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <Stat label="Synergies we count, per year" value={usd(s.runRate)} prov="calculated" emphasis />
        </Panel>
        <Panel>
          <Stat
            label={`Value at your ${times(a.deal.offerMultiple)}`}
            value={usd(s.valueAtOffer)}
            prov="calculated"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="One-time cost to combine"
            value={usd(s.integrationCost)}
            prov="user-entered"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Price above the DCF value"
            value={<span className={premium > 0 ? 'text-risk' : ''}>{usd(premium)}</span>}
            prov="calculated"
            note={
              premium > 0
                ? 'You are paying the seller for your own synergies'
                : 'You are not paying for synergies'
            }
            emphasis
          />
        </Panel>
      </div>
      <Panel title="Each synergy: what you entered and what we count">
        {s.lines.length === 0 ? (
          <p className="text-sm text-muted">No synergies were entered.</p>
        ) : (
          <Table
            head={['Synergy', 'Type', 'You entered', 'Added profit', 'We count']}
            rows={s.lines.map((line) => [
              line.description,
              line.kind === 'cost' ? 'Cost saving' : 'New revenue',
              usd(line.stated),
              usd(line.ebitdaImpact),
              <span key="k" className="font-semibold">
                {usd(line.kept)}
              </span>,
            ])}
            foot={['Total', '', '', usd(s.lines.reduce((x, l) => x + l.ebitdaImpact, 0)), usd(s.runRate)]}
          />
        )}
        <p className="mt-4 text-sm leading-6 text-muted">
          We count {pct(ASSUMPTIONS.costSynergyRetained, 0)} of each cost saving. New revenue only adds the
          profit on it (we assume a {pct(ASSUMPTIONS.revenueSynergyMargin, 0)} margin), and we count{' '}
          {pct(ASSUMPTIONS.revenueSynergyRetained, 0)} of that. Half shows up in the first year. These are our
          assumptions.
        </p>
      </Panel>
      <Panel title="Synergies by year">
        <Columns
          labels={s.byYear.slice(0, 5).map((_, i) => String(2026 + i))}
          values={s.byYear.slice(0, 5)}
          color={COLORS.syn}
        />
      </Panel>
    </>
  );
}

/* ---------- DCF ---------- */

function DcfTab({ a }: { a: Analysis }) {
  const d = a.dcf;
  return (
    <>
      <TabIntro
        what="What the target is worth today based on the cash it should produce over the next five years and after. No synergies."
        why="It values the business on its own cash, not on what others paid. If your price is far above this, you are betting things go better than planned."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <Stat
            label="Value, perpetuity growth"
            value={d.gordon ? usd(d.gordon.ev) : 'n/a'}
            prov="calculated"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label={`Value, ${times(a.deal.exitMultiple)} exit`}
            value={usd(d.exit.ev)}
            prov="calculated"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Discount rate (WACC)"
            value={pct(d.wacc)}
            prov="calculated"
            note={`Cost of equity ${pct(d.costOfEquity)}`}
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Equity value"
            value={d.gordon ? usd(d.gordon.equity) : usd(d.exit.equity)}
            prov="calculated"
            note="After target debt, plus cash"
            emphasis
          />
        </Panel>
      </div>
      <Panel title="Five-year free cash flow" aside={`${a.target.name}, standalone, no synergies`}>
        <ProjectionTable a={a} rows={d.rows} />
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sensitivity: value by WACC and growth">
          <Grid
            colHead={d.grid.waccs.map((w) => pct(w))}
            rowHead={d.grid.growths.map((g) => pct(g))}
            cells={d.grid.ev.map((row) => row.map((v) => (v == null ? '—' : usdShort(v))))}
            center={[2, 2]}
            corner="g \\ WACC"
          />
        </Panel>
        <Panel title="How the two methods compare">
          <dl className="flex flex-col gap-3 text-sm">
            <Row k="Present value of 5 years of cash flow" v={usd(d.pvFcf)} />
            {d.gordon ? <Row k="Present value of terminal value (growth)" v={usd(d.gordon.pvTv)} /> : null}
            {d.gordon ? <Row k="Terminal value share of total" v={pct(d.gordon.tvShare, 0)} /> : null}
            <Row k="Present value of terminal value (exit multiple)" v={usd(d.exit.pvTv)} />
            <Row k="Growth rate the exit multiple implies" v={pct(d.exit.impliedGrowth)} />
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">
            Growth, margins, D&A, capex and working capital all come from the target’s inputs. Tax is{' '}
            {pct(ASSUMPTIONS.taxRate, 0)}.
          </p>
        </Panel>
      </div>
    </>
  );
}

function ProjectionTable({ a, rows }: { a: Analysis; rows: Analysis['dcf']['rows'] }) {
  const t = a.target;
  const lines: Array<[string, (r: (typeof rows)[number]) => number, string?]> = [
    ['Revenue', (r) => r.revenue],
    ['EBITDA', (r) => r.ebitda, 'font-semibold'],
    ['Less D&A', (r) => -r.da],
    ['EBIT', (r) => r.ebit],
    ['Less tax at 21%', (r) => -r.taxes],
    ['Plus D&A', (r) => r.da],
    ['Less capex', (r) => -r.capex],
    ['Less change in working capital', (r) => -r.deltaNwc],
    ['Free cash flow', (r) => r.ufcf, 'total'],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm tabular-nums">
        <caption className="sr-only">US dollars. Negatives in parentheses.</caption>
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 text-left font-normal">$</th>
            <th className="py-2 text-right font-medium">2025 actual</th>
            {rows.map((r) => (
              <th key={r.year} className="py-2 text-right font-medium">
                {r.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map(([name, get, cls]) => (
            <tr
              key={name}
              className={
                cls === 'total' ? 'border-t border-ink font-bold' : `border-b border-line ${cls ?? ''}`
              }
            >
              <td className="py-2 pr-4 text-left">{name}</td>
              <td className="py-2 text-right text-muted">
                {name === 'Revenue' ? acct(t.revenue[2]) : name === 'EBITDA' ? acct(t.ebitda[2]) : ''}
              </td>
              {rows.map((r) => (
                <td key={r.year} className="py-2 text-right">
                  {acct(get(r))}
                </td>
              ))}
            </tr>
          ))}
          <tr className="text-xs text-muted">
            <td className="py-2">EBITDA margin</td>
            <td className="py-2 text-right">{pct(t.ebitda[2] / t.revenue[2])}</td>
            {rows.map((r) => (
              <td key={r.year} className="py-2 text-right">
                {pct(r.margin)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- LBO ---------- */

function LboTab({ a }: { a: Analysis }) {
  const l = a.lbo;
  return (
    <>
      <TabIntro
        what="Your return if you pay this price, borrow the amount you entered, use the profits to pay down the loan and sell in a few years."
        why="It shows whether the deal pays you enough for the risk, and the most you can pay and still hit the return you want."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <Stat
            label="Return on equity (IRR)"
            value={l.irr != null ? pct(l.irr) : 'n/a'}
            prov="calculated"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Money multiple"
            value={l.moic != null ? times(l.moic, 2) : 'n/a'}
            prov="calculated"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label={`Most you can pay for ${pct(a.deal.targetIrr, 0)}`}
            value={l.maxMultipleAtTarget != null ? usd(l.maxMultipleAtTarget * a.verifiedEbitda) : 'n/a'}
            note={l.maxMultipleAtTarget != null ? `${times(l.maxMultipleAtTarget)} EBITDA` : undefined}
            prov="calculated"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Lowest debt coverage"
            value={<span className={l.minDscr < 1.25 ? 'text-risk' : ''}>{times(l.minDscr, 2)}</span>}
            note="Cash flow before debt ÷ interest + required principal"
            prov="calculated"
            emphasis
          />
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Sources and uses">
          <div className="grid grid-cols-2 gap-6">
            <SU title="Sources" items={l.sources} />
            <SU title="Uses" items={l.uses} />
          </div>
        </Panel>
        <Panel title="Debt left at year end">
          <Columns
            labels={['Close', ...l.years.map((y) => String(y.year))]}
            values={[l.debt, ...l.years.map((y) => y.closingDebt)]}
            color={COLORS.target}
          />
        </Panel>
      </div>
      <Panel title="Cash flow and debt paydown" aside="All free cash goes to paying down debt">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm tabular-nums">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-2 text-left font-normal">$</th>
                {l.years.map((y) => (
                  <th key={y.year} className="py-2 text-right font-medium">
                    {y.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['EBITDA', (y) => y.ebitda],
                  ['Less interest', (y) => -y.interest],
                  ['Less tax at 21%', (y) => -y.taxes],
                  ['Less capex', (y) => -y.capex],
                  ['Less change in working capital', (y) => -y.deltaNwc],
                  ['Free cash flow to equity', (y) => y.fcf],
                  ['Debt paid down', (y) => y.paydown],
                  ['Debt at year end', (y) => y.closingDebt],
                ] as Array<[string, (y: Analysis['lbo']['years'][number]) => number]>
              ).map(([name, get]) => (
                <tr
                  key={name}
                  className={
                    name === 'Free cash flow to equity'
                      ? 'border-t border-ink font-bold'
                      : 'border-b border-line'
                  }
                >
                  <td className="py-2 pr-4">{name}</td>
                  {l.years.map((y) => (
                    <td key={y.year} className="py-2 text-right">
                      {acct(get(y))}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="text-xs text-muted">
                <td className="py-2">Debt coverage</td>
                {l.years.map((y) => (
                  <td key={y.year} className={`py-2 text-right ${y.dscr < 1.25 ? 'text-risk' : ''}`}>
                    {Number.isFinite(y.dscr) ? times(y.dscr, 2) : 'no debt'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          Exit in {a.deal.holdYears} years at {times(a.deal.exitMultiple)} {usd(l.exitEbitda)} of EBITDA ={' '}
          {usd(l.exitEv)}. Less remaining debt, plus cash, leaves {usd(l.exitEquity)} for you on{' '}
          {usd(l.equity)} invested.
        </p>
      </Panel>
      <Panel title="Sensitivity: IRR by entry and exit multiple">
        <Grid
          colHead={l.grid.entries.map((m) => `Pay ${times(m)}`)}
          rowHead={l.grid.exits.map((m) => `Exit ${times(m)}`)}
          cells={l.grid.irr.map((row) => row.map((v) => (v == null ? '—' : pct(v))))}
          center={[l.grid.exits.indexOf(a.deal.exitMultiple), l.grid.entries.indexOf(a.deal.offerMultiple)]}
          corner=""
        />
      </Panel>
    </>
  );
}

function SU({ title, items }: { title: string; items: Array<{ name: string; amount: number }> }) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      <dl className="flex flex-col gap-2 text-sm">
        {items.map((i) => (
          <Row key={i.name} k={i.name} v={usd(i.amount)} />
        ))}
        <div className="border-t border-ink pt-2">
          <Row k="Total" v={usd(total)} bold />
        </div>
      </dl>
    </div>
  );
}

/* ---------- Combined ---------- */

function CombinedTab({ a }: { a: Analysis }) {
  const p = a.proForma;
  return (
    <>
      <TabIntro
        what="Your company after the deal: combined sales, profit, debt and cash, with synergies phased in."
        why="A good deal makes your whole company stronger. Watch that debt and cash don’t get stretched too thin."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <Stat
            label="Combined 2025 revenue"
            value={usd(p.years[0].revenue)}
            prov="calculated"
            note={`+${pct(p.revenueAccretion, 0)} for you`}
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="EBITDA added, with synergies"
            value={`+${pct(p.ebitdaAccretion, 0)}`}
            prov="calculated"
            note="Target + kept synergies, over your EBITDA"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Debt / EBITDA"
            value={`${times(p.leverageBuyerToday, 2)} → ${times(p.leverageAtClose, 2)}`}
            prov="calculated"
            note="You today, then combined at close"
            emphasis
          />
        </Panel>
        <Panel>
          <Stat
            label="Cash after the equity check"
            value={<span className={p.cashLeft < 0 ? 'text-risk' : ''}>{usd(p.cashLeft)}</span>}
            note={`${usd(p.buyerCash)} on hand − ${usd(p.equityNeeded)}`}
            prov="calculated"
            emphasis
          />
        </Panel>
      </div>
      <Panel title="Combined EBITDA" aside="Each company on its own growth path, plus phased-in synergies">
        <StackedColumns
          labels={p.years.map((y) => (y.year === 2025 ? '2025 actual' : String(y.year)))}
          series={[
            { name: a.buyer.name, color: COLORS.buyer, values: p.years.map((y) => y.buyerEbitda) },
            { name: a.target.name, color: COLORS.target, values: p.years.map((y) => y.targetEbitda) },
            { name: 'Kept synergies', color: COLORS.syn, values: p.years.map((y) => y.synergies) },
          ]}
        />
      </Panel>
      <Panel title="Side by side, 2025">
        <Table
          head={['', a.buyer.name, a.target.name, 'Combined']}
          rows={[
            [
              'Revenue',
              usd(a.buyer.revenue[2]),
              usd(a.target.revenue[2]),
              usd(a.buyer.revenue[2] + a.target.revenue[2]),
            ],
            [
              'EBITDA',
              usd(a.buyer.ebitda[2]),
              usd(a.target.ebitda[2]),
              usd(a.buyer.ebitda[2] + a.target.ebitda[2]),
            ],
            [
              'EBITDA margin',
              pct(a.buyer.ebitda[2] / a.buyer.revenue[2]),
              pct(a.target.ebitda[2] / a.target.revenue[2]),
              pct((a.buyer.ebitda[2] + a.target.ebitda[2]) / (a.buyer.revenue[2] + a.target.revenue[2])),
            ],
            [
              'Revenue growth, 2023–25 per year',
              pct(Math.sqrt(a.buyer.revenue[2] / a.buyer.revenue[0]) - 1),
              pct(Math.sqrt(a.target.revenue[2] / a.target.revenue[0]) - 1),
              '',
            ],
            ['Debt', usd(a.buyer.debt), `${usd(a.target.debt)} (paid off by seller)`, usd(p.debtAtClose)],
          ]}
        />
      </Panel>
    </>
  );
}

/* ---------- Shared ---------- */

function Table({ head, rows, foot }: { head: string[]; rows: ReactNode[][]; foot?: ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {head.map((h, i) => (
              <th key={i} className={`py-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-line">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2.5 pr-3 tabular-nums ${ci === 0 ? 'text-left font-medium' : 'text-right'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot ? (
          <tfoot>
            <tr className="border-t border-ink font-bold">
              {foot.map((cell, ci) => (
                <td key={ci} className={`py-2.5 pr-3 tabular-nums ${ci === 0 ? 'text-left' : 'text-right'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function Grid({
  colHead,
  rowHead,
  cells,
  center,
  corner,
}: {
  colHead: string[];
  rowHead: string[];
  cells: string[][];
  center: [number, number];
  corner: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs text-muted">
            <th className="py-2 text-left font-normal">{corner}</th>
            {colHead.map((h) => (
              <th key={h} className="py-2 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, ri) => (
            <tr key={rowHead[ri]} className="border-t border-line">
              <th className="py-2 text-left text-xs font-medium text-muted">{rowHead[ri]}</th>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2 text-right ${ri === center[0] && ci === center[1] ? 'bg-green font-semibold text-card' : ''}`}
                >
                  <span className="px-1.5">{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${bold ? 'font-semibold' : ''}`}>
      <dt className={bold ? '' : 'text-muted'}>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function Assumptions() {
  return (
    <details className="group border border-line bg-card p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-lg text-green">
        Assumptions DealSpan made for you
        <span className="font-sans text-sm font-normal text-muted group-open:hidden">
          Show {ASSUMPTION_NOTES.length}
        </span>
        <span className="hidden font-sans text-sm font-normal text-muted group-open:inline">Hide</span>
      </summary>
      <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {ASSUMPTION_NOTES.map((n) => (
          <div
            key={n.name}
            className="flex items-start justify-between gap-4 border-b border-line pb-3 text-sm"
          >
            <div>
              <div className="font-medium">{n.name}</div>
              <div className="text-xs leading-5 text-muted">{n.why}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums">{n.value}</span>
              <Prov label="assumed" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <Swatch color={COLORS.line} /> Everything else on this page is either something you typed or
        calculated from it.
      </p>
    </details>
  );
}
