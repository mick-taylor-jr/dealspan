'use client';

import { FieldLabel } from '@/components/quiet';
import { useWorkspace } from '@/components/workspace';
import { INDUSTRIES, YEAR_OPTIONS } from '@/lib/industries';
import type { Intake } from '@/lib/types';

export function IntakeScreen() {
  const { intake, setIntake, loadExample, submit, canSubmit } = useWorkspace();

  function patch(partial: Partial<Intake>) {
    const next = { ...intake, ...partial, exampleId: partial.exampleId === undefined ? null : intake.exampleId };
    if (partial.exampleId) next.exampleId = partial.exampleId;
    if (next.fromYear > next.toYear) next.toYear = next.fromYear;
    setIntake(next);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dealspan</h1>
      <form
        className="flex flex-col gap-12"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) submit();
        }}
      >
        <div className="grid gap-12 lg:grid-cols-2">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Your company</h2>
            <Text label="Name" value={intake.buyerName} onChange={(buyerName) => patch({ buyerName })} />
            <Text label="What you do" value={intake.buyerDescription} onChange={(buyerDescription) => patch({ buyerDescription })} />
            <Industry label="Industry" value={intake.buyerIndustry} onChange={(buyerIndustry) => patch({ buyerIndustry })} />
            <Text label="Market" value={intake.buyerMarket} onChange={(buyerMarket) => patch({ buyerMarket })} />
            <Text label="Customers" value={intake.buyerCustomers} onChange={(buyerCustomers) => patch({ buyerCustomers })} />
            <Money label="Revenue" digits={intake.buyerRevenueRaw} onDigits={(buyerRevenueRaw) => patch({ buyerRevenueRaw })} />
            <Money label="EBITDA" digits={intake.buyerEbitdaRaw} onDigits={(buyerEbitdaRaw) => patch({ buyerEbitdaRaw })} />
            <Money label="Debt" digits={intake.buyerDebtRaw} onDigits={(buyerDebtRaw) => patch({ buyerDebtRaw })} />
            <Money label="Cash" digits={intake.buyerCashRaw} onDigits={(buyerCashRaw) => patch({ buyerCashRaw })} />
            <Percent label="Growth" value={intake.buyerGrowthRaw} onChange={(buyerGrowthRaw) => patch({ buyerGrowthRaw })} />
            <Text label="Shared customers" value={intake.sharedCustomers} onChange={(sharedCustomers) => patch({ sharedCustomers })} />
            <Text label="Territory overlap" value={intake.territoryOverlap} onChange={(territoryOverlap) => patch({ territoryOverlap })} />
            <Text label="Back office overlap" value={intake.opsOverlap} onChange={(opsOverlap) => patch({ opsOverlap })} />
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Company you want to acquire</h2>
            <Text label="Name" value={intake.targetName} onChange={(targetName) => patch({ targetName })} />
            <Text label="What they do" value={intake.targetDescription} onChange={(targetDescription) => patch({ targetDescription })} />
            <Industry label="Industry" value={intake.industry} onChange={(industry) => patch({ industry })} />
            <Text label="Market" value={intake.targetMarket} onChange={(targetMarket) => patch({ targetMarket })} />
            <Text label="Customers" value={intake.targetCustomers} onChange={(targetCustomers) => patch({ targetCustomers })} />
            <div className="grid grid-cols-2 gap-4">
              <Year label="From" value={intake.fromYear} years={YEAR_OPTIONS} onChange={(fromYear) => patch({ fromYear })} />
              <Year
                label="To"
                value={intake.toYear}
                years={YEAR_OPTIONS.filter((year) => year >= intake.fromYear)}
                onChange={(toYear) => patch({ toYear })}
              />
            </div>
            <Money label="Revenue" digits={intake.revenueRaw} onDigits={(revenueRaw) => patch({ revenueRaw })} />
            <Money label="Seller EBITDA" digits={intake.claimedEarningsRaw} onDigits={(claimedEarningsRaw) => patch({ claimedEarningsRaw })} />
            <Money label="Debt" digits={intake.targetDebtRaw} onDigits={(targetDebtRaw) => patch({ targetDebtRaw })} />
            <Money label="Cash" digits={intake.targetCashRaw} onDigits={(targetCashRaw) => patch({ targetCashRaw })} />
            <Multiple value={intake.multipleRaw} onChange={(multipleRaw) => patch({ multipleRaw })} />
            <Percent label="Growth" value={intake.targetGrowthRaw} onChange={(targetGrowthRaw) => patch({ targetGrowthRaw })} />
            <Text label="Cost synergy" value={intake.costSynergyName} onChange={(costSynergyName) => patch({ costSynergyName })} />
            <Money label="Cost synergy $" digits={intake.costSynergyRaw} onDigits={(costSynergyRaw) => patch({ costSynergyRaw })} />
            <Text label="Revenue synergy" value={intake.revenueSynergyName} onChange={(revenueSynergyName) => patch({ revenueSynergyName })} />
            <Money label="Revenue synergy $" digits={intake.revenueSynergyRaw} onDigits={(revenueSynergyRaw) => patch({ revenueSynergyRaw })} />
          </section>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 rounded-full bg-stone-900 text-sm font-medium text-white disabled:bg-stone-300"
        >
          Submit
        </button>
      </form>
      <button type="button" className="self-start text-sm text-stone-500 underline" onClick={loadExample}>
        Load demo
      </button>
      {intake.exampleId ? <p className="text-xs text-stone-400">Both companies are hypothetical. Greenridge is not a real company.</p> : null}
    </div>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Industry({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {INDUSTRIES.map((industry) => (
          <option key={industry} value={industry}>
            {industry}
          </option>
        ))}
      </select>
    </label>
  );
}

function Year({
  label,
  value,
  years,
  onChange,
}: {
  label: string;
  value: number;
  years: number[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <select className={fieldClass} value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}

function Money({ label, digits, onDigits }: { label: string; digits: string; onDigits: (digits: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className={shellClass}>
        <span className="text-stone-400">$</span>
        <input
          className="w-full bg-transparent tabular-nums outline-none"
          inputMode="numeric"
          value={digits ? Number(digits).toLocaleString('en-US') : ''}
          onChange={(event) => onDigits(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12))}
        />
      </span>
    </label>
  );
}

function Percent({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className={shellClass}>
        <input
          className="w-full bg-transparent outline-none"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(cleanDecimal(event.target.value))}
        />
        <span className="text-stone-400">%</span>
      </span>
    </label>
  );
}

function Multiple({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>Offer multiple</FieldLabel>
      <span className={shellClass}>
        <input
          className="w-full bg-transparent outline-none"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(cleanDecimal(event.target.value))}
        />
        <span className="text-stone-400">×</span>
      </span>
    </label>
  );
}

function cleanDecimal(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (!rest.length) return whole ?? '';
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

const fieldClass = 'h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none';
const shellClass = 'flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm';
