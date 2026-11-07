'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DemoControls, IntakeStep } from '@/components/intake-screen';
import { useWorkspace } from '@/components/workspace';
import { askingPriceSet, readiness, STEPS, type CheckState } from '@/lib/readiness';

export function IntakeWizard() {
  const [step, setStep] = useState(0);
  const { intake, analysis, missing } = useWorkspace();
  const r = readiness(intake);
  const hasAsk = askingPriceSet(intake);
  const canRun = analysis != null && hasAsk;
  const last = STEPS.length - 1;
  const go = (next: number) => {
    setStep(Math.max(0, Math.min(last, next)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const dealName =
    intake.target.name.trim() && intake.buyer.name.trim()
      ? `${intake.buyer.name.trim()} → ${intake.target.name.trim()}`
      : intake.target.name.trim() || 'New deal';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="eyebrow">
            Deal intake · Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-2 break-words font-serif text-3xl text-green sm:text-4xl">{dealName}</h1>
          <div className="mt-4">
            <DemoControls />
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-5xl leading-none text-green tabular-nums" aria-live="polite">
            {r.percent}%
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Deal readiness</div>
        </div>
      </div>

      <ol className="mt-8 grid grid-cols-6 gap-1.5" aria-label="Intake steps">
        {STEPS.map((label, i) => {
          const done = r.stepDone[i];
          const current = i === step;
          return (
            <li key={label} className="min-w-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={current ? 'step' : undefined}
                className="flex w-full flex-col gap-2 text-left"
              >
                <span aria-hidden className={`h-1.5 w-full ${done ? 'bg-green' : current ? 'bg-green-2/40' : 'bg-line'}`} />
                <span
                  className={`flex items-center gap-1 truncate text-[11px] leading-4 sm:text-xs ${current ? 'font-bold text-ink' : done ? 'text-green' : 'text-muted'}`}
                >
                  {done ? (
                    <span aria-hidden className="text-green">
                      ✓
                    </span>
                  ) : null}
                  <span className={current ? '' : 'hidden sm:inline'}>{label}</span>
                  {!current ? <span className="sm:hidden">{String(i + 1).padStart(2, '0')}</span> : null}
                  <span className="sr-only">{done ? ' (complete)' : ''}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div>
          <IntakeStep step={step} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="btn-outline">
              Back
            </button>
            {step < last ? (
              <button type="button" onClick={() => go(step + 1)} className="btn-solid">
                Next: {STEPS[step + 1]}
              </button>
            ) : canRun ? (
              <Link href="/results" className="btn-solid">
                Run the report
              </Link>
            ) : (
              <span className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-muted">
                  {!hasAsk
                    ? 'Add the asking price in The target to run the report.'
                    : `${missing.length} required ${missing.length === 1 ? 'field is' : 'fields are'} still empty.`}
                </span>
                <span aria-disabled="true" className="btn-solid">
                  Run the report
                </span>
              </span>
            )}
          </div>
        </div>
        <Checklist items={r.items} onGo={go} />
      </div>
    </div>
  );
}

const MARK: Record<CheckState, { sym: string; cls: string; word: string }> = {
  done: { sym: '✓', cls: 'text-green', word: 'done' },
  partial: { sym: '…', cls: 'text-gold', word: 'partly done' },
  missing: { sym: '✗', cls: 'text-brick', word: 'missing' },
};

function Checklist({
  items,
  onGo,
}: {
  items: ReturnType<typeof readiness>['items'];
  onGo: (step: number) => void;
}) {
  return (
    <aside className="border-l-2 border-green bg-card px-5 py-5 lg:sticky lg:top-[116px]" aria-label="Diligence checklist">
      <h2 className="font-serif text-lg text-green">Diligence checklist</h2>
      <p className="mt-1 text-xs leading-5 text-muted">Updates as you type. Optional items sharpen the report.</p>
      <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
        {items.map((item) => {
          const m = MARK[item.state];
          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => onGo(item.step)}
                className="flex w-full items-start gap-2.5 py-2 text-left text-sm hover:text-green"
              >
                <span aria-hidden className={`w-3 shrink-0 font-semibold ${m.cls}`}>
                  {m.sym}
                </span>
                <span className="flex-1">
                  {item.label}
                  {!item.required ? <span className="text-muted"> · optional</span> : null}
                </span>
                <span className="sr-only">{m.word}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
