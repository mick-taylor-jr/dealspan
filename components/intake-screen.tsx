'use client';

import { FieldLabel } from '@/components/quiet';
import { useWorkspace } from '@/components/workspace';
import { INDUSTRIES, YEAR_OPTIONS, isIndustry } from '@/lib/industries';
import type { Intake } from '@/lib/types';

export function IntakeScreen() {
  const { intake, setIntake, loadExample, submit, canSubmit } = useWorkspace();

  function patch(partial: Partial<Intake>) {
    const next = { ...intake, ...partial };
    if (next.exampleId && partial.exampleId === undefined) next.exampleId = null;
    if (next.fromYear > next.toYear) next.toYear = next.fromYear;
    setIntake(next);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-10 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Dealspan</h1>
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) submit();
        }}
      >
        <label className="flex flex-col gap-2">
          <FieldLabel>Company</FieldLabel>
          <input
            className={fieldClass}
            value={intake.targetName}
            onChange={(event) => patch({ targetName: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2">
          <FieldLabel>Industry</FieldLabel>
          <select
            className={fieldClass}
            value={intake.industry}
            onChange={(event) => patch({ industry: event.target.value })}
          >
            <option value="">Select</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <FieldLabel>From</FieldLabel>
            <select
              className={fieldClass}
              value={intake.fromYear}
              onChange={(event) => patch({ fromYear: Number(event.target.value) })}
            >
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>To</FieldLabel>
            <select
              className={fieldClass}
              value={intake.toYear}
              onChange={(event) => {
                const toYear = Number(event.target.value);
                patch({ toYear: Math.max(toYear, intake.fromYear) });
              }}
            >
              {YEAR_OPTIONS.filter((year) => year >= intake.fromYear).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
        <MoneyField
          label="Seller EBITDA"
          digits={intake.claimedEarningsRaw}
          onDigits={(claimedEarningsRaw) => patch({ claimedEarningsRaw })}
        />
        <MoneyField
          label="Revenue"
          digits={intake.revenueRaw}
          onDigits={(revenueRaw) => patch({ revenueRaw })}
        />
        <label className="flex flex-col gap-2">
          <FieldLabel>Multiple</FieldLabel>
          <span className={shellClass}>
            <input
              className="w-full bg-transparent outline-none"
              inputMode="decimal"
              value={intake.multipleRaw}
              placeholder="0.0"
              onChange={(event) => patch({ multipleRaw: cleanMultiple(event.target.value) })}
            />
            <span className="text-stone-400">×</span>
          </span>
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 h-12 rounded-full bg-stone-900 text-sm font-medium text-white disabled:bg-stone-300"
        >
          Submit
        </button>
      </form>
      <button type="button" className="self-start text-sm text-stone-500 underline" onClick={loadExample}>
        Load example
      </button>
      {intake.exampleId && isIndustry(intake.industry) ? (
        <p className="text-xs text-stone-400">Hypothetical. Not a real company.</p>
      ) : null}
    </div>
  );
}

function MoneyField({
  label,
  digits,
  onDigits,
}: {
  label: string;
  digits: string;
  onDigits: (digits: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className={shellClass}>
        <span className="text-stone-400">$</span>
        <input
          className="w-full bg-transparent tabular-nums outline-none"
          inputMode="numeric"
          value={digits ? Number(digits).toLocaleString('en-US') : ''}
          onChange={(event) =>
            onDigits(
              event.target.value
                .replace(/\D/g, '')
                .replace(/^0+(?=\d)/, '')
                .slice(0, 12),
            )
          }
        />
      </span>
    </label>
  );
}

function cleanMultiple(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (!rest.length) return whole ?? '';
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

const fieldClass = 'h-12 rounded-xl border border-stone-200 bg-white px-3 text-base outline-none';
const shellClass = 'flex h-12 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3';
