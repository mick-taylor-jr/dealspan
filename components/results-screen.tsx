'use client';

import Link from 'next/link';
import { useState } from 'react';
import { QuietMoney, Tag } from '@/components/quiet';
import { useWorkspace } from '@/components/workspace';
import { MODEL_ASSUMPTIONS } from '@/lib/case';
import { formatCents } from '@/lib/money';
import { isIndustry } from '@/lib/industries';
import { CITED_DEALS, THIN_SET_NOTE } from '@/lib/precedents';

const TABS = ['Overview', 'Comps', 'Precedents', 'DCF', 'LBO', 'Synergies'] as const;
type Tab = (typeof TABS)[number];

export function ResultsScreen() {
  const { caseFile } = useWorkspace();
  const [tab, setTab] = useState<Tab>('Overview');
  if (!caseFile) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-sm text-stone-600">
        No companies yet.{' '}
        <Link className="underline" href="/">
          Start
        </Link>
      </div>
    );
  }
  const { intake } = caseFile;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{intake.targetName}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {intake.exampleId ? 'Hypothetical · ' : ''}
            {intake.buyerName} · {intake.claimPeriod}
          </p>
        </div>
        <Link href="/" className="text-sm text-stone-500 underline">
          Edit
        </Link>
      </header>
      <nav className="flex gap-5 overflow-x-auto border-b border-stone-200">
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
  const { caseFile } = useWorkspace();
  if (!caseFile) return null;
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-stone-500">Pay</p>
        <QuietMoney
          cents={caseFile.payCents}
          label="calculated"
          source="Supported EBITDA × offer multiple"
          size="lg"
        />
        <p className="mt-4 text-sm text-stone-500">
          Ask{' '}
          <QuietMoney cents={caseFile.askCents} label="calculated" source="Seller EBITDA × offer multiple" />
        </p>
        {caseFile.askCents > caseFile.payCents ? (
          <p className="mt-2 text-sm text-stone-500">
            <QuietMoney
              cents={caseFile.askCents - caseFile.payCents}
              label="calculated"
              source="Ask minus supported price"
            />{' '}
            above supported EBITDA
          </p>
        ) : null}
      </div>
      <p className="max-w-xl text-sm text-stone-600">{caseFile.fit.notes[caseFile.fit.notes.length - 1]}</p>
      <details className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm">Earnings check</summary>
        <div className="mt-4 flex flex-col gap-2">
          {caseFile.deal?.lines.map((line) => (
            <p key={line.id} className="flex justify-between gap-3 text-sm">
              <span>
                {line.description}{' '}
                <span className="text-stone-400">
                  {line.classification === 'accepted' ? 'Accepted' : 'Rejected'}
                </span>
              </span>
              <QuietMoney cents={line.managementCents} label="user-entered" source={line.rationale} />
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}

function Comps() {
  return (
    <section className="flex max-w-xl flex-col gap-3 text-sm text-stone-600">
      <p>No confirmed peers. The set is thin.</p>
      <p>
        Size discount {MODEL_ASSUMPTIONS.discountLowBps / 100}–{MODEL_ASSUMPTIONS.discountHighBps / 100}%{' '}
        <Tag label="assumed" />
      </p>
      <p>No public benchmark was entered, so a raw multiple is not applied.</p>
    </section>
  );
}

function Precedents() {
  const { caseFile } = useWorkspace();
  if (!caseFile || !isIndustry(caseFile.intake.industry)) return null;
  const rows = CITED_DEALS.filter((deal) => deal.industry === caseFile.intake.industry);
  const landscaping = /landscap/i.test(
    `${caseFile.intake.targetDescription} ${caseFile.intake.buyerDescription}`,
  );
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-stone-500">{THIN_SET_NOTE}</p>
      {landscaping ? (
        <p className="text-sm text-stone-500">The cited set has no landscaping closings.</p>
      ) : null}
      <ul>
        {rows.map((deal) => (
          <li key={deal.citation} className="border-t border-stone-200 py-4 text-sm">
            <p className="font-medium">
              {deal.acquirer} · {deal.target}
            </p>
            <p className="text-stone-500">
              {deal.date} · {deal.disclosed}
            </p>
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
  const { caseFile } = useWorkspace();
  if (!caseFile) return null;
  const { dcf, debt, cash } = caseFile;
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-stone-500">Gordon equity</p>
        {dcf.gordonEquityCents != null ? (
          <QuietMoney
            cents={wholeDollars(dcf.gordonEquityCents)}
            label="calculated"
            source="FCFF and Gordon terminal value, minus net debt"
            size="lg"
          />
        ) : (
          <p className="text-3xl text-stone-300">—</p>
        )}
        <p className="mt-3 text-sm text-stone-500">
          Exit equity{' '}
          <QuietMoney
            cents={wholeDollars(dcf.exitEquityCents)}
            label="calculated"
            source="Year-5 EBITDA × 6.0×, minus net debt"
          />
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Fact label="Risk-free" value="4.0%" tag="assumed" />
        <Fact label="Beta" value="1.00" tag="assumed" />
        <Fact label="ERP" value="5.0%" tag="assumed" />
        <Fact label="Size" value="5.0%" tag="assumed" />
        <Fact label="Company" value="2.0%" tag="assumed" />
        <Fact label="Tax" value="21%" tag="assumed" />
        <Fact label="Debt weight" value="25%" tag="assumed" />
        <Fact label="WACC" value={`${(dcf.waccBps / 100).toFixed(1)}%`} tag="calculated" />
        <Fact label="Terminal g" value="2.5%" tag="assumed" />
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-stone-400">
              <th className="py-1 pr-3 font-medium">Year</th>
              <th className="py-1 pr-3 font-medium">EBITDA</th>
              <th className="py-1 font-medium">FCFF</th>
            </tr>
          </thead>
          <tbody>
            {dcf.years.map((year, index) => (
              <tr key={index} className="border-t border-stone-100">
                <td className="py-1 pr-3">{index + 1}</td>
                <td className="py-1 pr-3 tabular-nums">{formatCents(wholeDollars(year.ebitdaCents))}</td>
                <td className="py-1 tabular-nums">{formatCents(wholeDollars(year.fcffCents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-stone-500">
        Debt <QuietMoney cents={debt.cents} label={debt.label} source="Target interest-bearing debt" /> · Cash{' '}
        <QuietMoney cents={cash.cents} label={cash.label} source="Target cash" />
      </p>
      <p className="text-sm text-stone-500">
        {dcf.methodsReconcile
          ? 'Gordon growth and the 6.0× exit can both be read. They are not blended.'
          : 'Gordon growth and the 6.0× exit do not economically reconcile. They are not blended.'}
      </p>
      {caseFile.dcf.envelope ? (
        <p className="text-sm text-stone-500">
          Grid {formatCents(wholeDollars(caseFile.dcf.envelope.lowCents))}–
          {formatCents(wholeDollars(caseFile.dcf.envelope.highCents))} <Tag label="calculated" />
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs tabular-nums">
          <tbody>
            {dcf.grid.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-stone-100 px-2 py-1 text-stone-600">
                    {cell.invalid || cell.equityCents == null ? '—' : shortMoney(cell.equityCents)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LboTab() {
  const { caseFile } = useWorkspace();
  if (!caseFile) return null;
  const { lbo } = caseFile;
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-stone-500">MOIC</p>
        <p className="text-5xl font-semibold tracking-tight tabular-nums">
          {(lbo.moicThousandths / 1000).toFixed(2)}× <Tag label="calculated" />
        </p>
        <p className="mt-3 text-sm text-stone-500">
          IRR {lbo.irrBps == null ? '—' : `${(lbo.irrBps / 100).toFixed(1)}%`} <Tag label="calculated" />
        </p>
      </div>
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <p>
          Price{' '}
          <QuietMoney cents={lbo.priceCents} label="calculated" source="Supported EBITDA × offer multiple" />
        </p>
        <p>
          Debt{' '}
          <QuietMoney
            cents={lbo.debtCents}
            label={caseFile.debt.label}
            source="Target interest-bearing debt"
          />
        </p>
        <p>
          Equity <QuietMoney cents={lbo.equityCents} label="calculated" source="Price minus debt" />
        </p>
        <p className="text-stone-500">
          Rate 10%, amort 10 years, hold 5 years, exit 6.0×, tax 21% <Tag label="assumed" />
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-stone-400">
            <th className="py-1 font-medium">Year</th>
            <th className="py-1 font-medium">Open</th>
            <th className="py-1 font-medium">Interest</th>
            <th className="py-1 font-medium">Paydown</th>
            <th className="py-1 font-medium">Close</th>
          </tr>
        </thead>
        <tbody>
          {lbo.schedule.map((year) => (
            <tr key={year.year} className="border-t border-stone-100 tabular-nums">
              <td className="py-1">{year.year}</td>
              <td>{formatCents(year.openCents)}</td>
              <td>{formatCents(year.interestCents)}</td>
              <td>{formatCents(year.paydownCents)}</td>
              <td>{formatCents(year.closeCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SynergyTab() {
  const { caseFile } = useWorkspace();
  if (!caseFile) return null;
  const { intake, synergies, fit } = caseFile;
  return (
    <section className="flex max-w-xl flex-col gap-5 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <article>
          <h2 className="font-medium">{intake.buyerName}</h2>
          <p className="mt-1 text-stone-600">{intake.buyerDescription}</p>
        </article>
        <article>
          <h2 className="font-medium">{intake.targetName}</h2>
          <p className="mt-1 text-stone-600">{intake.targetDescription}</p>
        </article>
      </div>
      <ul className="flex flex-col gap-2 text-stone-700">
        {fit.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {synergies.lines.map((line) => (
        <p key={line.description}>
          {line.description}{' '}
          <QuietMoney cents={line.retained.cents} label="calculated" source={line.haircut.source} />
        </p>
      ))}
      <p className="text-stone-500">Do not pay more.</p>
    </section>
  );
}

function Fact({ label, value, tag }: { label: string; value: string; tag: 'assumed' | 'calculated' }) {
  return (
    <div>
      <dt className="text-stone-400">{label}</dt>
      <dd>
        {value} <Tag label={tag} />
      </dd>
    </div>
  );
}

function wholeDollars(cents: number) {
  return Math.round(cents / 100) * 100;
}

function shortMoney(cents: number) {
  const dollars = Math.round(cents / 100);
  const sign = dollars < 0 ? '-' : '';
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs}`;
}
