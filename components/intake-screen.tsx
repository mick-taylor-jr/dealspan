'use client';

import type { ReactNode } from 'react';
import { BareMoney, Choice, MoneyInput, NumberInput, SelectInput, TextInput } from '@/components/fields';
import { useWorkspace } from '@/components/workspace';
import { usd } from '@/lib/format';
import { INDUSTRIES } from '@/lib/industries';
import { num, YEARS, type CompanyInput, type Intake, type SynergyInput } from '@/lib/types';

const INDUSTRY_OPTIONS = INDUSTRIES.map((item) => ({ value: item.name, label: item.label }));

type Update = (fn: (draft: Intake) => Intake) => void;

/** One intake step. The wizard decides which one is on screen. */
export function IntakeStep({ step }: { step: number }) {
  const { intake, setIntake } = useWorkspace();
  const update: Update = (fn) => setIntake((prev) => ({ ...fn(prev), demo: false }));
  const setTarget = (patch: Partial<Intake['target']>) =>
    update((p) => ({ ...p, target: { ...p.target, ...patch } }));
  if (step === 0)
    return (
      <Card
        title="Your company"
        note="The acquirer. It sets how you would pay, what you bring to the target and the combined company."
      >
        <ProfileFields company={intake.buyer} onChange={(buyer) => update((p) => ({ ...p, buyer }))} />
        <FinancialFields title="Your company" company={intake.buyer} onChange={(buyer) => update((p) => ({ ...p, buyer }))} />
      </Card>
    );
  if (step === 1)
    return (
      <Card title="The target" note="The company you want to buy, and what the seller is asking for it.">
        <div className="border-l-2 border-green bg-page px-4 py-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr] sm:items-start">
            <div>
              <MoneyInput
                label="Asking price (required)"
                value={intake.target.askingPrice}
                onChange={(askingPrice) => setTarget({ askingPrice })}
                hint="The seller’s or broker’s listed price. The Gap is measured against it."
                large
              />
            </div>
            <MoneyInput
              label="Earnings (EBITDA) the seller claims"
              value={intake.target.sellerEbitda}
              onChange={(sellerEbitda) => setTarget({ sellerEbitda })}
              hint="Optional. From the listing. Compared with what the documents support."
            />
          </div>
        </div>
        <ProfileFields
          company={intake.target}
          onChange={(company) => update((p) => ({ ...p, target: { ...p.target, ...company } }))}
        />
      </Card>
    );
  if (step === 2)
    return (
      <Card
        title="Financials"
        note="The target’s numbers, as the documents support them. Every valuation model runs on these, not on the seller’s claim."
      >
        <FinancialFields
          title={intake.target.name || 'The target'}
          company={intake.target}
          onChange={(company) => update((p) => ({ ...p, target: { ...p.target, ...company } }))}
          target
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            label="EBITDA margin by 2030"
            suffix="%"
            value={intake.target.marginTarget}
            onChange={(marginTarget) => setTarget({ marginTarget })}
            hint="Optional. Blank keeps today’s margin."
          />
        </div>
      </Card>
    );
  if (step === 3) return <SynergySection intake={intake} update={update} />;
  if (step === 4) return <FitSection intake={intake} update={update} />;
  return <DealSection intake={intake} update={update} />;
}

export function DemoControls() {
  const { intake, loadDemo, clear } = useWorkspace();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <button type="button" onClick={loadDemo} className="btn-outline h-9 px-4">
        {intake.demo ? 'Demo loaded' : 'Load the demo deal'}
      </button>
      <button type="button" onClick={clear} className="text-sm text-muted underline underline-offset-4 hover:text-ink">
        Clear every field
      </button>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="border border-line bg-card p-5 sm:p-6">
      <SectionHead title={title} note={note} />
      <div className="flex flex-col gap-7">{children}</div>
    </section>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-2xl text-green">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{note}</p>
    </div>
  );
}

function ProfileFields({
  company,
  onChange,
}: {
  company: CompanyInput;
  onChange: (company: CompanyInput) => void;
}) {
  const set = <K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) =>
    onChange({ ...company, [key]: value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput label="Name" value={company.name} onChange={(v) => set('name', v)} />
      <SelectInput label="Industry" value={company.industry} options={INDUSTRY_OPTIONS} onChange={(v) => set('industry', v)} />
      <TextInput
        className="sm:col-span-2"
        label="What the company does"
        multiline
        value={company.description}
        onChange={(v) => set('description', v)}
      />
      <TextInput label="Where it operates" value={company.location} onChange={(v) => set('location', v)} />
      <TextInput label="Main customers" value={company.customers} onChange={(v) => set('customers', v)} />
      <NumberInput
        label="Employees"
        suffix="people"
        places={0}
        value={company.employees}
        onChange={(v) => set('employees', v)}
      />
    </div>
  );
}

function FinancialFields({
  title,
  company,
  onChange,
  target,
}: {
  title: string;
  company: CompanyInput;
  onChange: (company: CompanyInput) => void;
  target?: boolean;
}) {
  const set = <K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) =>
    onChange({ ...company, [key]: value });
  const rev = num(company.revenue[2]);
  const ebitda = num(company.ebitda[2]);
  const margin = rev && ebitda != null ? `${((ebitda / rev) * 100).toFixed(1)}% margin in 2025` : null;
  return (
    <>
      <div>
        <div className="mb-2 flex items-baseline justify-between border-b border-line pb-2">
          <h3 className="text-sm font-semibold">Three years of results</h3>
          {margin ? <span className="text-xs text-muted tabular-nums">{margin}</span> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-x-2 border-spacing-y-1.5 text-sm">
            <thead>
              <tr className="text-xs text-muted">
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
        {target ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            Use EBITDA you can back up with documents. The models price off 2025.
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 border-b border-line pb-2 text-sm font-semibold">2025 balance sheet and cash needs</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyInput label="D&A" value={company.da} onChange={(v) => set('da', v)} />
          <MoneyInput label="Capex" value={company.capex} onChange={(v) => set('capex', v)} hint="Equipment, trucks, etc." />
          <MoneyInput
            label="Net working capital"
            value={company.nwc}
            onChange={(v) => set('nwc', v)}
            hint="Receivables + inventory − payables."
          />
          <MoneyInput label="Debt" value={company.debt} onChange={(v) => set('debt', v)} />
          <MoneyInput label="Cash" value={company.cash} onChange={(v) => set('cash', v)} />
          <NumberInput label="Rate on that debt" suffix="%" value={company.debtRate} onChange={(v) => set('debtRate', v)} />
          <NumberInput
            label="Revenue growth per year"
            suffix="%"
            value={company.growth}
            onChange={(v) => set('growth', v)}
            hint="Your best estimate for 2026–2030."
          />
        </div>
      </div>
    </>
  );
}

function DealSection({ intake, update }: { intake: Intake; update: Update }) {
  const d = intake.deal;
  const set = (key: keyof Intake['deal'], value: string) =>
    update((p) => ({ ...p, deal: { ...p.deal, [key]: value } }));
  const ebitda = num(intake.target.ebitda[2]);
  const mult = num(d.offerMultiple);
  const lev = num(d.leverage);
  return (
    <section className="border border-line bg-card p-5 sm:p-6">
      <SectionHead
        title="Deal terms"
        note="How you would pay. The LBO, DCF discount rate and returns all come from here, so the model tabs never ask for more."
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
      <p className="mt-5 text-xs leading-5 text-muted">
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
    <section className="border border-line bg-card p-5 sm:p-6">
      <SectionHead
        title="Synergies"
        note="What changes because these two companies combine. Enter yearly amounts once fully running. Dealspan haircuts them before using any."
      />
      <div className="flex flex-col gap-3">
        {intake.synergies.map((line) => (
          <div
            key={line.id}
            className="grid items-end gap-3 border border-line bg-page p-3 sm:grid-cols-[auto_1fr_12rem_auto]"
          >
            <div
              className="flex border border-line bg-card p-0.5"
              role="group"
              aria-label="Synergy type"
            >
              {(['cost', 'revenue'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={line.kind === kind}
                  onClick={() => setLine(line.id, { kind })}
                  className={`h-9 px-3 text-sm ${line.kind === kind ? 'bg-green font-semibold text-card' : 'text-muted hover:text-ink'}`}
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
              className="h-10 px-3 text-sm text-muted underline-offset-4 hover:text-brick hover:underline"
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
          className="btn-outline h-10"
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
    <section className="border border-line bg-card p-5 sm:p-6">
      <SectionHead
        title="Fit & risk"
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
