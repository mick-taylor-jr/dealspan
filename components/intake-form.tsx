import type { ReactNode } from 'react';
import {
  blankLine,
  type AddBackCategory,
  type AddBackInput,
  type BuyerType,
  type Intake,
  type Metric,
} from '@/lib/types';

const CATEGORIES: Array<{ value: AddBackCategory; label: string }> = [
  { value: 'owner_comp', label: 'Owner compensation' },
  { value: 'owner_perk', label: 'Owner benefit' },
  { value: 'personal', label: 'Personal expense' },
  { value: 'one_time', label: 'One-time item' },
  { value: 'related_party', label: 'Related-party labor that stays' },
  { value: 'projected_savings', label: 'Projected savings' },
  { value: 'unreported_cash', label: 'Extra cash sales' },
  { value: 'other', label: 'Other / not specific' },
];

export function IntakeForm({
  intake,
  errors,
  onChange,
  onSubmit,
}: {
  intake: Intake;
  errors: string[] | null;
  onChange: (intake: Intake) => void;
  onSubmit: () => void;
}) {
  function patch(partial: Partial<Intake>) {
    onChange({ ...intake, ...partial, exampleId: null });
  }

  function patchLine(id: string, partial: Partial<AddBackInput>) {
    onChange({
      ...intake,
      exampleId: null,
      lines: intake.lines.map((line) => (line.id === id ? { ...line, ...partial } : line)),
    });
  }

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {errors && errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <p className="font-medium">The bridge was not built.</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Working title" hint="Optional. The example uses a hypothetical name.">
          <input
            className={inputClass}
            value={intake.targetName}
            onChange={(event) => patch({ targetName: event.target.value })}
          />
        </Field>
        <Field label="Industry" hint="Optional.">
          <input
            className={inputClass}
            value={intake.industry}
            onChange={(event) => patch({ industry: event.target.value })}
          />
        </Field>
        <Field label="Earnings metric" hint="SDE is the path for an owner-operated business.">
          <select
            className={inputClass}
            value={intake.metric}
            onChange={(event) => patch({ metric: event.target.value as Metric })}
          >
            <option value="SDE">SDE</option>
            <option value="EBITDA">EBITDA</option>
          </select>
        </Field>
        <Field label="Period the claim covers">
          <input
            className={inputClass}
            value={intake.claimPeriod}
            onChange={(event) => patch({ claimPeriod: event.target.value })}
            placeholder="2024 or 2023–2025"
          />
        </Field>
        <Field
          label="Seller claimed earnings"
          hint="What the seller or broker says. Optional if the lines already add up."
        >
          <input
            className={inputClass}
            inputMode="decimal"
            value={intake.claimedEarningsRaw}
            onChange={(event) => patch({ claimedEarningsRaw: event.target.value })}
          />
        </Field>
        <Field label="Buyer type" hint="Saved as user-entered. It does not change the bridge math.">
          <select
            className={inputClass}
            value={intake.buyerType}
            onChange={(event) => patch({ buyerType: event.target.value as BuyerType })}
          >
            <option value="sba">SBA</option>
            <option value="searcher">Searcher</option>
            <option value="independent_sponsor">Independent sponsor</option>
            <option value="strategic_add_on">Strategic add-on</option>
          </select>
        </Field>
        <Field
          label="Multiple"
          hint="Optional. Leave blank unless you want overpay arithmetic. Not a valuation."
        >
          <input
            className={inputClass}
            inputMode="decimal"
            value={intake.multipleRaw}
            onChange={(event) => patch({ multipleRaw: event.target.value })}
            placeholder="2.8"
          />
        </Field>
        <Field label="Revenue" hint="Optional. User-entered if you type it. Not taken from a filing.">
          <input
            className={inputClass}
            inputMode="decimal"
            value={intake.revenueRaw}
            onChange={(event) => patch({ revenueRaw: event.target.value })}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Proof for the same period</h2>
          <p className="mt-1 text-sm text-neutral-600">
            P&L, tax return, and bank deposits are requested, not a gate. A blank channel stays blank. Files
            stay in this browser tab: they are not uploaded, not saved, and not read.
          </p>
        </div>
        <Field label="Bridge starting point">
          <select
            className={inputClass}
            value={intake.reportedBasis}
            onChange={(event) => patch({ reportedBasis: event.target.value as Intake['reportedBasis'] })}
          >
            <option value="tax_return_profit">Tax-return profit</option>
            <option value="pnl_profit">P&L profit</option>
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tax-return profit">
            <input
              className={inputClass}
              inputMode="decimal"
              value={intake.taxProfitRaw}
              onChange={(event) => patch({ taxProfitRaw: event.target.value })}
            />
          </Field>
          <FileField
            label="Tax return file"
            fileName={intake.taxFileName}
            onFile={(taxFileName) => patch({ taxFileName })}
          />
          <Field label="P&L profit">
            <input
              className={inputClass}
              inputMode="decimal"
              value={intake.pnlProfitRaw}
              onChange={(event) => patch({ pnlProfitRaw: event.target.value })}
            />
          </Field>
          <FileField
            label="P&L file"
            fileName={intake.pnlFileName}
            onFile={(pnlFileName) => patch({ pnlFileName })}
          />
          <Field
            label="Stated total bank deposits"
            hint="Only if the statement prints a total. Do not add the deposit lines."
          >
            <input
              className={inputClass}
              inputMode="decimal"
              value={intake.depositsRaw}
              onChange={(event) => patch({ depositsRaw: event.target.value })}
            />
          </Field>
          <FileField
            label="Bank deposit file"
            fileName={intake.depositsFileName}
            onFile={(depositsFileName) => patch({ depositsFileName })}
          />
          <Field
            label="Stated revenue or gross receipts"
            hint="Optional. Used only to compare with deposits, not with profit."
          >
            <input
              className={inputClass}
              inputMode="decimal"
              value={intake.receiptsRaw}
              onChange={(event) => patch({ receiptsRaw: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Add-back lines</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Role and amount only. No Social Security numbers, addresses, or customer names.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            onClick={() => onChange({ ...intake, exampleId: null, lines: [...intake.lines, blankLine()] })}
          >
            Add a line
          </button>
        </div>
        {intake.lines.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No add-backs yet. The bridge can still show reported profit alone.
          </p>
        ) : null}
        {intake.lines.map((line, index) => (
          <fieldset key={line.id} className="rounded-md border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-medium">Line {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Description">
                <input
                  className={inputClass}
                  value={line.description}
                  onChange={(event) => patchLine(line.id, { description: event.target.value })}
                />
              </Field>
              <Field label="Amount">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={line.amountRaw}
                  onChange={(event) => patchLine(line.id, { amountRaw: event.target.value })}
                />
              </Field>
              <Field label="Category">
                <select
                  className={inputClass}
                  value={line.category}
                  onChange={(event) => {
                    const category = event.target.value as AddBackInput['category'];
                    patchLine(line.id, {
                      category,
                      claimedOneTime: category === 'one_time' ? true : line.claimedOneTime,
                    });
                  }}
                >
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Years" hint="Comma-separated when the same item appears more than once.">
                <input
                  className={inputClass}
                  value={line.yearsRaw}
                  onChange={(event) => patchLine(line.id, { yearsRaw: event.target.value })}
                  placeholder="2023, 2024, 2025"
                />
              </Field>
              <Field label="Name in the seller question" hint="Optional. Defaults to the description.">
                <input
                  className={inputClass}
                  value={line.shortName}
                  onChange={(event) => patchLine(line.id, { shortName: event.target.value })}
                />
              </Field>
              {line.category === 'owner_comp' || line.category === 'related_party' ? (
                <Field label="Role">
                  <input
                    className={inputClass}
                    value={line.role}
                    onChange={(event) => patchLine(line.id, { role: event.target.value })}
                  />
                </Field>
              ) : null}
              {line.category === 'related_party' ? (
                <Field label="Work that remains" hint='The example uses "the books".'>
                  <input
                    className={inputClass}
                    value={line.functionLabel}
                    onChange={(event) => patchLine(line.id, { functionLabel: event.target.value })}
                  />
                </Field>
              ) : null}
              {line.category === 'related_party' ? (
                <Field label="Replacement cost" hint="Leave blank to count none. Blank is not zero.">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={line.replacementRaw}
                    onChange={(event) => patchLine(line.id, { replacementRaw: event.target.value })}
                  />
                </Field>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={line.claimedOneTime}
                  onChange={(event) => patchLine(line.id, { claimedOneTime: event.target.checked })}
                />
                Seller calls this one-time
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={line.documented}
                  onChange={(event) => patchLine(line.id, { documented: event.target.checked })}
                />
                A document in this session supports this line
              </label>
              <button
                type="button"
                className="text-neutral-600 underline"
                onClick={() =>
                  onChange({
                    ...intake,
                    exampleId: null,
                    lines: intake.lines.filter((item) => item.id !== line.id),
                  })
                }
              >
                Remove
              </button>
            </div>
          </fieldset>
        ))}
      </section>

      <button type="submit" className="rounded-md bg-neutral-950 px-4 py-3 text-sm font-medium text-white">
        Show the earnings bridge
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

function FileField({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName: string | null;
  onFile: (name: string | null) => void;
}) {
  return (
    <Field label={label} hint={fileName ? `In this tab only: ${fileName}` : 'Not uploaded.'}>
      <input
        className="text-sm"
        type="file"
        onChange={(event) => onFile(event.target.files?.[0]?.name ?? null)}
      />
    </Field>
  );
}

const inputClass = 'h-10 rounded-md border border-neutral-300 px-3 text-sm';
