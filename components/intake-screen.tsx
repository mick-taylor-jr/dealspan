'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { DocumentImport } from '@/components/document-import';
import { BareMoney, Choice, MoneyInput, NumberInput, SelectInput, TextInput } from '@/components/fields';
import { useWorkspace } from '@/components/workspace';
import { DEMO_STORIES } from '@/lib/demo';
import { usd } from '@/lib/format';
import { subsectorsFor } from '@/lib/comps';
import { INDUSTRIES } from '@/lib/industries';
import { num, YEARS, type CompanyInput, type Intake, type SynergyInput } from '@/lib/types';

const INDUSTRY_OPTIONS = INDUSTRIES.map((item) => ({ value: item.name, label: item.label }));

export function IntakeScreen() {
  const { intake, setIntake, missing, loadDemo, clear, analysis } = useWorkspace();
  const update = (fn: (draft: Intake) => Intake) => setIntake((prev) => ({ ...fn(prev), demo: false }));
  const buyerMissing = missing.filter((m) => m.section === 'buyer').length;
  const targetMissing = missing.filter((m) => m.section === 'target').length;
  const dealMissing = missing.filter((m) => m.section === 'deal').length;

  return (
    <div className="pb-32">
      <Hero onDemo={loadDemo} demo={intake.demo} />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pt-10 sm:px-8">
        <DocumentImport />
        <div className="grid gap-6 lg:grid-cols-2">
          <CompanyCard
            role="buyer"
            title="Your company"
            subtitle="The acquirer. Used for synergies, the combined company and how you pay."
            company={intake.buyer}
            missing={buyerMissing}
            onChange={(buyer) => update((prev) => ({ ...prev, buyer }))}
          />
          <CompanyCard
            role="target"
            title="Company you want to buy"
            subtitle="The target. Every valuation model runs on these numbers."
            company={intake.target}
            missing={targetMissing}
            onChange={(company) => update((prev) => ({ ...prev, target: { ...prev.target, ...company } }))}
          >
            <TextInput
              label="Type of work"
              value={intake.target.subsector}
              suggestions={subsectorsFor(intake.target.industry)}
              onChange={(subsector) => update((p) => ({ ...p, target: { ...p.target, subsector } }))}
              hint="Used to rank past sales by how close they are to this company. Pick from the list for a match, or type your own."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <MoneyInput
                label="EBITDA the seller claims"
                value={intake.target.sellerEbitda}
                onChange={(sellerEbitda) => update((p) => ({ ...p, target: { ...p.target, sellerEbitda } }))}
                hint="Optional. Compared with the 2025 EBITDA above."
              />
              <MoneyInput
                label="Asking price"
                value={intake.target.askingPrice}
                onChange={(askingPrice) => update((p) => ({ ...p, target: { ...p.target, askingPrice } }))}
                hint="Optional."
              />
              <NumberInput
                label="EBITDA margin by 2030"
                suffix="%"
                value={intake.target.marginTarget}
                onChange={(marginTarget) => update((p) => ({ ...p, target: { ...p.target, marginTarget } }))}
                hint="Optional. Blank keeps today’s margin."
              />
            </div>
          </CompanyCard>
        </div>

        <DealSection intake={intake} missing={dealMissing} update={update} />
        <SynergySection intake={intake} update={update} />
        <FitSection intake={intake} update={update} />

        <div className="flex justify-start">
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            Clear every field
          </button>
        </div>
      </div>

      <RunBar count={missing.length} ready={analysis != null} firstMissing={missing[0]} />
    </div>
  );
}

function Hero({ onDemo, demo }: { onDemo: () => void; demo: boolean }) {
  return (
    <header className="bg-pine text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <div className="flex flex-col gap-6">
          <span className="text-sm font-semibold tracking-tight text-white/70">Dealspan</span>
          <h1 className="max-w-xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            Two companies in. A price you can defend out.
          </h1>
          <p className="max-w-lg text-base leading-7 text-white/75">
            Enter your company and the one you want to buy. Dealspan builds the DCF, LBO and precedents on the
            target, then shows what the two are worth together and whether the fit is real.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onDemo}
              className="h-11 rounded-full bg-white px-5 text-sm font-semibold text-pine hover:bg-white/90"
            >
              {demo ? 'Demo loaded' : 'Load the demo deal'}
            </button>
            <span className="text-sm text-white/60">Fills both companies with a labeled hypothetical.</span>
          </div>
        </div>
        <DealDiagram demo={demo} />
      </div>
    </header>
  );
}

function DealDiagram({ demo }: { demo: boolean }) {
  return (
    <div className="flex flex-col gap-3 self-center">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <div className="mb-2 h-1 w-8 rounded-full bg-[#4fc79a]" />
          <div className="text-sm font-semibold">{demo ? 'Northline Grounds Co.' : 'Your company'}</div>
          <p className="mt-1 text-xs leading-5 text-white/60">
            {demo
              ? DEMO_STORIES.buyer.split('. ').slice(0, 1).join('. ') + '.'
              : 'Revenue, EBITDA, debt, cash, how you operate.'}
          </p>
        </div>
        <div className="flex items-center text-2xl font-light text-white/40" aria-hidden>
          +
        </div>
        <div className="rounded-xl border border-white/15 bg-white/5 p-4">
          <div className="mb-2 h-1 w-8 rounded-full bg-[#e2b04a]" />
          <div className="text-sm font-semibold">{demo ? 'Greenridge Landscape Co.' : 'The target'}</div>
          <p className="mt-1 text-xs leading-5 text-white/60">
            {demo
              ? DEMO_STORIES.target.split('. ').slice(0, 1).join('. ') + '.'
              : 'Three years of history and everything the models need.'}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4 text-sm leading-6 text-white/80">
        <span className="font-semibold text-white">You get:</span> good, average and bad prices, financing for
        each, an LBO with debt paydown, synergies after haircuts, the combined company, and a fit scorecard
        with questions for the seller.
      </div>
      {demo ? (
        <p className="text-xs leading-5 text-white/55">
          {DEMO_STORIES.target.split('. ').slice(-2).join('. ')}
        </p>
      ) : null}
    </div>
  );
}

function SectionHead({ title, note, missing }: { title: string; note: string; missing?: number }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{note}</p>
      </div>
      {missing != null ? <Progress missing={missing} /> : null}
    </div>
  );
}

function Progress({ missing }: { missing: number }) {
  return missing === 0 ? (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-buyer-soft px-2.5 py-1 text-xs font-medium text-[#0e6145]">
      Complete
    </span>
  ) : (
    <span className="shrink-0 whitespace-nowrap rounded-full bg-[#eef1ee] px-2.5 py-1 text-xs font-medium text-muted">
      {missing} to fill
    </span>
  );
}

function CompanyCard({
  role,
  title,
  subtitle,
  company,
  missing,
  onChange,
  children,
}: {
  role: 'buyer' | 'target';
  title: string;
  subtitle: string;
  company: CompanyInput;
  missing: number;
  onChange: (company: CompanyInput) => void;
  children?: ReactNode;
}) {
  const set = <K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) =>
    onChange({ ...company, [key]: value });
  const accent = role === 'buyer' ? 'bg-buyer' : 'bg-target';
  const rev = num(company.revenue[2]);
  const ebitda = num(company.ebitda[2]);
  const margin = rev && ebitda != null ? `${((ebitda / rev) * 100).toFixed(1)}% margin in 2025` : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-card">
      <div className={`h-1.5 ${accent}`} />
      <div className="flex flex-col gap-7 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{subtitle}</p>
          </div>
          <Progress missing={missing} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Name" value={company.name} onChange={(v) => set('name', v)} />
          <SelectInput
            label="Industry"
            value={company.industry}
            options={INDUSTRY_OPTIONS}
            onChange={(v) => set('industry', v)}
          />
          <TextInput
            className="sm:col-span-2"
            label="What the company does"
            multiline
            value={company.description}
            onChange={(v) => set('description', v)}
          />
          <TextInput
            label="Where it operates"
            value={company.location}
            onChange={(v) => set('location', v)}
          />
          <TextInput label="Main customers" value={company.customers} onChange={(v) => set('customers', v)} />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Three years of results</h3>
            {margin ? <span className="text-xs text-faint">{margin}</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-separate border-spacing-x-2 border-spacing-y-1.5 text-sm">
              <thead>
                <tr className="text-xs text-faint">
                  <th className="w-24 text-left font-normal" />
                  {YEARS.map((year) => (
                    <th key={year} className="text-right font-medium">
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['revenue', 'ebitda'] as const).map((row) => (
                  <tr key={row}>
                    <th className="text-left font-medium">{row === 'revenue' ? 'Revenue' : 'EBITDA'}</th>
                    {YEARS.map((year, index) => (
                      <td key={year}>
                        <BareMoney
                          ariaLabel={`${title} ${row === 'revenue' ? 'revenue' : 'EBITDA'} ${year}`}
                          value={company[row][index]}
                          onChange={(value) => {
                            const next = [...company[row]] as [string, string, string];
                            next[index] = value;
                            set(row, next);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {role === 'target' ? (
            <p className="mt-2 text-xs leading-5 text-faint">
              Use EBITDA you can back up with documents. The models price off 2025.
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">2025 balance sheet and cash needs</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyInput label="D&A" value={company.da} onChange={(v) => set('da', v)} />
            <MoneyInput
              label="Capex"
              value={company.capex}
              onChange={(v) => set('capex', v)}
              hint="Equipment, trucks, etc."
            />
            <MoneyInput
              label="Net working capital"
              value={company.nwc}
              onChange={(v) => set('nwc', v)}
              hint="Receivables + inventory − payables."
            />
            <MoneyInput label="Debt" value={company.debt} onChange={(v) => set('debt', v)} />
            <MoneyInput label="Cash" value={company.cash} onChange={(v) => set('cash', v)} />
            <NumberInput
              label="Rate on that debt"
              suffix="%"
              value={company.debtRate}
              onChange={(v) => set('debtRate', v)}
            />
            <NumberInput
              label="Revenue growth per year"
              suffix="%"
              value={company.growth}
              onChange={(v) => set('growth', v)}
              hint="Your best estimate for 2026–2030."
            />
            <NumberInput
              label="Employees"
              suffix="people"
              places={0}
              value={company.employees}
              onChange={(v) => set('employees', v)}
            />
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function DealSection({
  intake,
  missing,
  update,
}: {
  intake: Intake;
  missing: number;
  update: (fn: (draft: Intake) => Intake) => void;
}) {
  const d = intake.deal;
  const set = (key: keyof Intake['deal'], value: string) =>
    update((p) => ({ ...p, deal: { ...p.deal, [key]: value } }));
  const ebitda = num(intake.target.ebitda[2]);
  const mult = num(d.offerMultiple);
  const lev = num(d.leverage);
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <SectionHead
        title="The deal"
        note="How you would pay. The LBO, DCF discount rate and returns all come from here, so the model tabs never ask for more."
        missing={missing}
      />
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Choice
          label="What kind of buyer are you"
          value={d.buyerType}
          onChange={(v) => update((p) => ({ ...p, deal: { ...p.deal, buyerType: v || 'strategic' } }))}
          options={[
            { value: 'strategic', label: 'A company adding a business' },
            { value: 'financial', label: 'Investor or search fund' },
            { value: 'individual', label: 'First-time buyer' },
          ]}
        />
        <Choice
          label="Will part of the price depend on future results (an earnout)?"
          value={d.earnout}
          onChange={(v) => update((p) => ({ ...p, deal: { ...p.deal, earnout: v } }))}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberInput
          label="Offer, as a multiple of EBITDA"
          suffix="×"
          value={d.offerMultiple}
          onChange={(v) => set('offerMultiple', v)}
          hint={
            ebitda && mult ? `= ${usd(ebitda * mult)} purchase price` : 'Applied to the target’s 2025 EBITDA.'
          }
        />
        <NumberInput
          label="Acquisition debt"
          suffix="× EBITDA"
          value={d.leverage}
          onChange={(v) => set('leverage', v)}
          hint={
            ebitda && lev != null
              ? `= ${usd(ebitda * lev)} borrowed. The Financing tab checks this.`
              : 'The Financing tab tells you how much lenders allow.'
          }
        />
        <NumberInput
          label="Interest rate on new debt"
          suffix="%"
          value={d.rate}
          onChange={(v) => set('rate', v)}
        />
        <NumberInput
          label="Loan term"
          suffix="years"
          places={0}
          value={d.termYears}
          onChange={(v) => set('termYears', v)}
        />
        <NumberInput
          label="Deal fees"
          suffix="% of price"
          value={d.feesPct}
          onChange={(v) => set('feesPct', v)}
          hint="Legal, QoE, lender fees."
        />
        <NumberInput
          label="Exit multiple"
          suffix="×"
          value={d.exitMultiple}
          onChange={(v) => set('exitMultiple', v)}
          hint="What a buyer pays you when you sell."
        />
        <NumberInput
          label="Hold period"
          suffix="years"
          places={0}
          value={d.holdYears}
          onChange={(v) => set('holdYears', v)}
        />
        <NumberInput
          label="Return you need"
          suffix="% a year"
          value={d.targetIrr}
          onChange={(v) => set('targetIrr', v)}
        />
      </div>
      <p className="mt-5 text-xs leading-5 text-faint">
        Assumed for every model: 21% tax rate. The target is bought cash-free and debt-free, so the seller
        pays off its own debt and keeps its cash.
      </p>
    </section>
  );
}

function SynergySection({
  intake,
  update,
}: {
  intake: Intake;
  update: (fn: (draft: Intake) => Intake) => void;
}) {
  const setLine = (id: string, patch: Partial<SynergyInput>) =>
    update((p) => ({ ...p, synergies: p.synergies.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <SectionHead
        title="Synergies"
        note="What changes because these two companies combine. Enter yearly amounts once fully running. Dealspan haircuts them before using any."
      />
      <div className="flex flex-col gap-3">
        {intake.synergies.map((line) => (
          <div
            key={line.id}
            className="grid items-end gap-3 rounded-xl bg-paper p-3 sm:grid-cols-[auto_1fr_12rem_auto]"
          >
            <div
              className="flex rounded-lg border border-line bg-white p-0.5"
              role="group"
              aria-label="Synergy type"
            >
              {(['cost', 'revenue'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={line.kind === kind}
                  onClick={() => setLine(line.id, { kind })}
                  className={`h-9 rounded-md px-3 text-sm ${line.kind === kind ? 'bg-pine text-white' : 'text-muted'}`}
                >
                  {kind === 'cost' ? 'Cost saving' : 'New revenue'}
                </button>
              ))}
            </div>
            <TextInput
              label="Description"
              value={line.description}
              placeholder={
                line.kind === 'cost'
                  ? 'Close one of the two offices'
                  : 'Sell your services to their customers'
              }
              onChange={(description) => setLine(line.id, { description })}
            />
            <MoneyInput
              label={line.kind === 'cost' ? 'Savings per year' : 'Revenue per year'}
              value={line.amount}
              onChange={(amount) => setLine(line.id, { amount })}
            />
            <button
              type="button"
              aria-label={`Remove ${line.description || 'synergy'}`}
              onClick={() =>
                update((p) => ({ ...p, synergies: p.synergies.filter((s) => s.id !== line.id) }))
              }
              className="h-10 rounded-lg px-3 text-sm text-muted hover:bg-white hover:text-risk"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <button
          type="button"
          onClick={() =>
            update((p) => ({
              ...p,
              synergies: [
                ...p.synergies,
                { id: `s${Date.now()}`, kind: 'cost', description: '', amount: '' },
              ],
            }))
          }
          className="h-10 rounded-full border border-line px-4 text-sm font-medium hover:border-ink/30"
        >
          Add a synergy
        </button>
        <div className="w-full sm:w-64">
          <MoneyInput
            label="One-time cost to combine"
            value={intake.integrationCost}
            onChange={(integrationCost) => update((p) => ({ ...p, integrationCost }))}
            hint="Rebranding, systems, severance."
          />
        </div>
      </div>
    </section>
  );
}

function FitSection({ intake, update }: { intake: Intake; update: (fn: (draft: Intake) => Intake) => void }) {
  const f = intake.fit;
  const set = <K extends keyof Intake['fit']>(key: K, value: Intake['fit'][K]) =>
    update((p) => ({ ...p, fit: { ...p.fit, [key]: value } }));
  const lmh = [
    { value: 'low' as const, label: 'Low' },
    { value: 'medium' as const, label: 'Some' },
    { value: 'high' as const, label: 'High' },
  ];
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <SectionHead
        title="Fit"
        note="The part spreadsheets miss. These answers drive the fit scorecard and the questions to ask the seller. Skip any you don’t know."
      />
      <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        <Choice
          label="What they sell compared with you"
          value={f.serviceFit}
          onChange={(v) => set('serviceFit', v)}
          options={[
            { value: 'same', label: 'Same' },
            { value: 'complementary', label: 'Complementary' },
            { value: 'unrelated', label: 'Unrelated' },
          ]}
        />
        <Choice
          label="Where they operate"
          value={f.geography}
          onChange={(v) => set('geography', v)}
          options={[
            { value: 'same', label: 'Same market' },
            { value: 'adjacent', label: 'Next door' },
            { value: 'new', label: 'New region' },
          ]}
        />
        <Choice
          label="Customers you already share"
          value={f.customerOverlap}
          onChange={(v) => set('customerOverlap', v)}
          options={lmh}
        />
        <Choice
          label="Room to cross-sell"
          value={f.crossSell}
          onChange={(v) => set('crossSell', v)}
          options={lmh}
        />
        <Choice
          label="How much it depends on the owner"
          value={f.ownerDependence}
          onChange={(v) => set('ownerDependence', v)}
          options={lmh}
        />
        <Choice
          label="Key employees after close"
          value={f.keyPeople}
          onChange={(v) => set('keyPeople', v)}
          options={[
            { value: 'staying', label: 'Staying' },
            { value: 'unsure', label: 'Unsure' },
            { value: 'leaving', label: 'Leaving' },
          ]}
        />
        <Choice
          label="Culture fit"
          value={f.culture}
          onChange={(v) => set('culture', v)}
          options={[
            { value: 'strong', label: 'Strong' },
            { value: 'workable', label: 'Workable' },
            { value: 'weak', label: 'Weak' },
          ]}
        />
        <Choice
          label="How hard to integrate"
          value={f.integration}
          onChange={(v) => set('integration', v)}
          options={[
            { value: 'low', label: 'Easy' },
            { value: 'medium', label: 'Moderate' },
            { value: 'high', label: 'Hard' },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Largest customer"
            suffix="% of rev."
            places={0}
            value={f.topCustomerPct}
            onChange={(v) => set('topCustomerPct', v)}
          />
          <NumberInput
            label="Recurring revenue"
            suffix="% of rev."
            places={0}
            value={f.recurringPct}
            onChange={(v) => set('recurringPct', v)}
          />
        </div>
        <TextInput
          label="Why this deal, in your words"
          multiline
          value={f.thesis}
          onChange={(v) => set('thesis', v)}
          placeholder="What does owning this company let you do that you can’t do today?"
        />
      </div>
    </section>
  );
}

function RunBar({
  count,
  ready,
  firstMissing,
}: {
  count: number;
  ready: boolean;
  firstMissing?: { section: string; field: string };
}) {
  const where = firstMissing
    ? `${firstMissing.section === 'buyer' ? 'Your company' : firstMissing.section === 'target' ? 'Target' : 'The deal'}: ${firstMissing.field}`
    : '';
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <p className="text-sm text-muted" aria-live="polite">
          {ready ? (
            <span className="font-medium text-ink">Every model has what it needs.</span>
          ) : (
            <>
              <span className="font-medium text-ink">{count} fields left.</span>{' '}
              <span className="hidden sm:inline">Next: {where}</span>
            </>
          )}
        </p>
        {ready ? (
          <Link
            href="/results"
            className="inline-flex h-11 items-center rounded-full bg-pine px-6 text-sm font-semibold text-white hover:bg-pine-2"
          >
            Run the analysis
          </Link>
        ) : (
          <span
            aria-disabled
            className="inline-flex h-11 cursor-not-allowed items-center rounded-full bg-[#cfd6d1] px-6 text-sm font-semibold text-white"
          >
            Run the analysis
          </span>
        )}
      </div>
    </div>
  );
}
