'use client';

import Link from 'next/link';
import { useState } from 'react';
import { QuietMoney, Tag } from '@/components/quiet';
import { useWorkspace } from '@/components/workspace';
import { sizeAdjustedComps } from '@/lib/comps';
import { runDcf } from '@/lib/dcf';
import { isIndustry } from '@/lib/industries';
import { runLbo } from '@/lib/lbo';
import { formatCents } from '@/lib/money';
import { CITED_DEALS, THIN_SET_NOTE } from '@/lib/precedents';
import { synergyView } from '@/lib/synergy';

const TABS = ['Overview', 'Comps', 'Precedents', 'DCF', 'LBO', 'Synergies'] as const;
type Tab = (typeof TABS)[number];

export function ResultsScreen() {
  const workspace = useWorkspace();
  const [tab, setTab] = useState<Tab>('Overview');
  const { submission } = workspace;
  if (!submission) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <p className="text-stone-600">
          No company yet.{' '}
          <Link className="underline" href="/">
            Start
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {submission.intake.targetName || 'Untitled'}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {submission.intake.exampleId ? 'Hypothetical · ' : ''}
            {submission.intake.industry} · {submission.intake.claimPeriod}
          </p>
        </div>
        <Link href="/" className="text-sm text-stone-500 underline">
          Edit
        </Link>
      </header>
      <nav className="flex gap-6 overflow-x-auto border-b border-stone-200">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={
              tab === item
                ? 'border-b-2 border-stone-900 pb-3 text-sm font-medium'
                : 'pb-3 text-sm text-stone-500'
            }
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === 'Overview' ? <Overview /> : null}
      {tab === 'Comps' ? <Comps /> : null}
      {tab === 'Precedents' ? <Precedents /> : null}
      {tab === 'DCF' ? <DcfTab /> : null}
      {tab === 'LBO' ? <LboTab /> : null}
      {tab === 'Synergies' ? <SynergyTab /> : null}
    </div>
  );
}

function Overview() {
  const { submission, buyerMode, synergies } = useWorkspace();
  if (!submission) return null;
  const view = synergyView(buyerMode, synergies);
  const pay = submission.payCents;
  const ask = submission.askCents;
  return (
    <section className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-stone-500">Pay</p>
        {pay != null ? (
          <QuietMoney
            cents={pay}
            label="calculated"
            source="Documents-supported EBITDA × multiple"
            size="lg"
          />
        ) : (
          <p className="text-5xl font-semibold tracking-tight text-stone-300">—</p>
        )}
        {ask != null ? (
          <p className="mt-4 text-sm text-stone-500">
            Ask <QuietMoney cents={ask} label="calculated" source="Seller EBITDA × multiple" />
          </p>
        ) : null}
        {pay != null && ask != null && ask > pay ? (
          <p className="mt-2 text-sm text-stone-500">
            <QuietMoney cents={ask - pay} label="calculated" source="Ask minus supported price" /> above
            supported EBITDA
          </p>
        ) : null}
      </div>
      <p className="text-sm text-stone-600">
        {buyerMode === 'standalone' || view.blocked
          ? 'Standalone. Do not pay for synergies.'
          : view.lines.length
            ? 'Add-on upside only. Price stays on supported EBITDA.'
            : 'Add-on, but no synergies stated. Price unchanged.'}
      </p>
      <details className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm">Earnings check</summary>
        <div className="mt-4 flex flex-col gap-3">
          {submission.deal ? (
            submission.deal.lines.map((line) => (
              <p key={line.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  {line.description}{' '}
                  <span className="text-stone-400">
                    {line.classification === 'accepted' ? 'Accepted' : 'Rejected'}
                  </span>
                </span>
                <QuietMoney cents={line.managementCents} label="user-entered" source={line.rationale} />
              </p>
            ))
          ) : (
            <p className="text-sm text-stone-500">No proof lines.</p>
          )}
          {submission.supportedCents != null ? (
            <p className="text-sm">
              Supported{' '}
              <QuietMoney
                cents={submission.supportedCents}
                label="calculated"
                source="Accepted lines plus tax-return profit"
              />
            </p>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function Comps() {
  const { comps, setComps, submission } = useWorkspace();
  if (!submission) return null;
  const result = sizeAdjustedComps(comps, submission.supportedCents);
  return (
    <section className="flex flex-col gap-6">
      <p className="text-sm text-stone-500">No confirmed peers. The set is thin.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <SmallField
          label="Benchmark"
          suffix="×"
          value={comps.benchmarkRaw}
          onChange={(benchmarkRaw) => setComps({ ...comps, benchmarkRaw: cleanDecimal(benchmarkRaw) })}
        />
        <SmallField
          label="Discount low"
          suffix="%"
          value={comps.discountLowRaw}
          onChange={(discountLowRaw) => setComps({ ...comps, discountLowRaw: cleanDecimal(discountLowRaw) })}
        />
        <SmallField
          label="Discount high"
          suffix="%"
          value={comps.discountHighRaw}
          onChange={(discountHighRaw) =>
            setComps({ ...comps, discountHighRaw: cleanDecimal(discountHighRaw) })
          }
        />
      </div>
      {result.status === 'need-benchmark' ? <p className="text-sm">No benchmark entered.</p> : null}
      {result.status === 'need-discount' ? <p className="text-sm">Discount required — enter one.</p> : null}
      {result.status === 'ready' ? (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            {formatTimes(result.multipleLow.cents)}–{formatTimes(result.multipleHigh.cents)}{' '}
            <Tag label="calculated" />
          </p>
          {result.valueLow && result.valueHigh ? (
            <p>
              {formatCents(result.valueLow.cents)}–{formatCents(result.valueHigh.cents)}{' '}
              <Tag label="calculated" />
            </p>
          ) : (
            <p className="text-stone-500">Needs documents-supported EBITDA.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Precedents() {
  const { submission } = useWorkspace();
  if (!submission || !isIndustry(submission.intake.industry)) return null;
  const rows = CITED_DEALS.filter((deal) => deal.industry === submission.intake.industry);
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">{THIN_SET_NOTE}</p>
      <ul className="flex flex-col">
        {rows.map((deal) => (
          <li key={deal.citation} className="flex flex-col gap-1 border-t border-stone-200 py-4 text-sm">
            <span className="font-medium">
              {deal.acquirer} · {deal.target}
            </span>
            <span className="text-stone-500">
              {deal.date} · {deal.disclosed}
            </span>
            <a className="text-stone-500 underline" href={deal.citation} target="_blank" rel="noreferrer">
              Source
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DcfTab() {
  const { dcf, setDcf, submission } = useWorkspace();
  if (!submission?.revenueCents || submission.supportedCents == null) {
    return <p className="text-sm text-stone-500">Needs revenue and supported EBITDA.</p>;
  }
  const run = runDcf(dcf, submission.revenueCents, submission.supportedCents);
  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <PercentField
          label="Risk-free"
          value={dcf.rfBps}
          onChange={(rfBps) => setDcf({ ...dcf, rfBps })}
          hint="user-entered"
        />
        <NumberField
          label="Beta"
          value={dcf.betaThousandths}
          scale={1000}
          onChange={(betaThousandths) => setDcf({ ...dcf, betaThousandths })}
          hint="user-entered"
        />
        <PercentField
          label="ERP"
          value={dcf.erpBps}
          onChange={(erpBps) => setDcf({ ...dcf, erpBps: erpBps ?? dcf.erpBps })}
          hint="assumed"
        />
        <PercentField
          label="Size premium"
          value={dcf.sizeBps}
          onChange={(sizeBps) => setDcf({ ...dcf, sizeBps: sizeBps ?? dcf.sizeBps })}
          hint="assumed"
        />
        <PercentField
          label="Company premium"
          value={dcf.companyBps}
          onChange={(companyBps) => setDcf({ ...dcf, companyBps: companyBps ?? dcf.companyBps })}
          hint="assumed"
        />
        <PercentField
          label="Terminal g"
          value={dcf.gBps}
          onChange={(gBps) => setDcf({ ...dcf, gBps: gBps ?? dcf.gBps })}
          hint="assumed"
        />
      </div>
      {run?.gordonEquityCents != null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-500">Gordon equity</p>
          <QuietMoney
            cents={run.gordonEquityCents}
            label="calculated"
            source="Five-year FCFF plus Gordon terminal value. Debt not entered, treated as zero by assumption."
            size="lg"
          />
          <p className="text-sm text-stone-500">
            Exit-multiple equity{' '}
            <QuietMoney
              cents={run.exitEquityCents}
              label="calculated"
              source="EBITDA in year 5 × assumed 6.0×"
            />
          </p>
          {run.envelope ? (
            <p className="text-sm text-stone-500">
              Grid {formatCents(run.envelope.lowCents)}–{formatCents(run.envelope.highCents)}{' '}
              <Tag label="calculated" />
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Add a risk-free rate and a beta.</p>
      )}
    </section>
  );
}

function LboTab() {
  const { lbo, setLbo, submission } = useWorkspace();
  if (!submission) return null;
  const price = submission.payCents ?? submission.askCents;
  const ebitda = submission.supportedCents ?? submission.claimedCents;
  const run = price == null ? null : runLbo(lbo, ebitda, price);
  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SmallField
          label="Debt"
          prefix="$"
          value={lbo.debtRaw ? Number(lbo.debtRaw).toLocaleString('en-US') : ''}
          onChange={(value) => setLbo({ ...lbo, debtRaw: value.replace(/\D/g, '').slice(0, 12) })}
        />
        <PercentField
          label="Rate"
          value={lbo.rateBps}
          onChange={(rateBps) => setLbo({ ...lbo, rateBps })}
          hint="user-entered"
        />
        <NumberField
          label="Amort years"
          value={lbo.amortYears}
          scale={1}
          onChange={(amortYears) => setLbo({ ...lbo, amortYears })}
          hint="user-entered"
        />
        <NumberField
          label="Exit multiple"
          value={lbo.exitThousandths}
          scale={1000}
          onChange={(exitThousandths) => setLbo({ ...lbo, exitThousandths })}
          hint="user-entered"
        />
        <PercentField
          label="EBITDA growth"
          value={lbo.growthBps}
          onChange={(growthBps) => setLbo({ ...lbo, growthBps })}
          hint="user-entered"
        />
      </div>
      {run ? (
        <div>
          <p className="text-sm text-stone-500">MOIC</p>
          <p className="text-5xl font-semibold tracking-tight tabular-nums">
            {(run.moicThousandths / 1000).toFixed(2)}× <Tag label="calculated" />
          </p>
          <p className="mt-3 text-sm text-stone-500">
            Equity{' '}
            <QuietMoney
              cents={run.equityCents}
              label="calculated"
              source="Price minus the debt you entered"
            />
          </p>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Enter debt. It is not estimated.</p>
      )}
    </section>
  );
}

function SynergyTab() {
  const { buyerMode, setBuyerMode, synergies, setSynergies } = useWorkspace();
  const view = synergyView(buyerMode, synergies);
  return (
    <section className="flex flex-col gap-6">
      <div className="flex gap-2">
        {(['standalone', 'addon'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setBuyerMode(mode)}
            className={
              mode === buyerMode
                ? 'rounded-full bg-stone-900 px-4 py-2 text-sm text-white'
                : 'rounded-full border border-stone-200 px-4 py-2 text-sm'
            }
          >
            {mode === 'standalone' ? 'Standalone' : 'Add-on'}
          </button>
        ))}
      </div>
      {view.blocked ? <p className="text-sm">Synergies do not change the price.</p> : null}
      {!view.blocked ? (
        <>
          <button
            type="button"
            className="self-start text-sm text-stone-500 underline"
            onClick={() =>
              setSynergies([
                ...synergies,
                { id: crypto.randomUUID(), kind: 'cost', description: '', amountRaw: '' },
              ])
            }
          >
            Add a stated synergy
          </button>
          {synergies.map((line) => (
            <div key={line.id} className="grid gap-3 sm:grid-cols-3">
              <select
                className={smallClass}
                value={line.kind}
                onChange={(event) =>
                  setSynergies(
                    synergies.map((item) =>
                      item.id === line.id
                        ? { ...item, kind: event.target.value as 'cost' | 'revenue' }
                        : item,
                    ),
                  )
                }
              >
                <option value="cost">Cost</option>
                <option value="revenue">Revenue</option>
              </select>
              <input
                className={smallClass}
                value={line.description}
                placeholder="Description"
                onChange={(event) =>
                  setSynergies(
                    synergies.map((item) =>
                      item.id === line.id ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
              />
              <span className={`${smallClass} flex items-center gap-2`}>
                <span className="text-stone-400">$</span>
                <input
                  className="w-full bg-transparent tabular-nums outline-none"
                  value={line.amountRaw ? Number(line.amountRaw).toLocaleString('en-US') : ''}
                  onChange={(event) =>
                    setSynergies(
                      synergies.map((item) =>
                        item.id === line.id
                          ? { ...item, amountRaw: event.target.value.replace(/\D/g, '').slice(0, 12) }
                          : item,
                      ),
                    )
                  }
                />
              </span>
            </div>
          ))}
          {view.lines.map((line) => (
            <p key={line.description} className="text-sm">
              {line.description}{' '}
              <QuietMoney cents={line.retained.cents} label="calculated" source={line.haircut.source} />
            </p>
          ))}
          <p className="text-sm text-stone-500">Do not pay more.</p>
        </>
      ) : null}
    </section>
  );
}

function SmallField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className={`${smallClass} flex items-center gap-2`}>
        {prefix ? <span className="text-stone-400">{prefix}</span> : null}
        <input
          className="w-full bg-transparent outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="text-stone-400">{suffix}</span> : null}
      </span>
    </label>
  );
}

function PercentField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  hint: 'assumed' | 'user-entered';
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex items-center gap-2 text-stone-500">
        {label} <Tag label={hint} />
      </span>
      <input
        className={smallClass}
        inputMode="decimal"
        value={value == null ? '' : (value / 100).toString()}
        onChange={(event) => {
          const cleaned = cleanDecimal(event.target.value);
          onChange(cleaned === '' ? null : Math.round(Number(cleaned) * 100));
        }}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  scale,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  scale: number;
  onChange: (value: number | null) => void;
  hint: 'assumed' | 'user-entered';
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex items-center gap-2 text-stone-500">
        {label} <Tag label={hint} />
      </span>
      <input
        className={smallClass}
        inputMode="decimal"
        value={value == null ? '' : (value / scale).toString()}
        onChange={(event) => {
          const cleaned = cleanDecimal(event.target.value);
          onChange(cleaned === '' ? null : Math.round(Number(cleaned) * scale));
        }}
      />
    </label>
  );
}

function cleanDecimal(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (!rest.length) return whole ?? '';
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

function formatTimes(thousandths: number) {
  return `${(thousandths / 1_000).toFixed(1)}×`;
}

const smallClass = 'h-11 rounded-xl border border-stone-200 bg-white px-3';
