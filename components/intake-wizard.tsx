'use client';

import { useState } from 'react';
import { IntakeScreen } from '@/components/intake-screen';
import { useWorkspace } from '@/components/workspace';

const STEPS = ['Your company', 'Target', 'The deal', 'Synergies', 'Fit'];

/** Ben's five-step intake. Each step renders one part of IntakeScreen; the run bar stays at the bottom. */
export function IntakeWizard() {
  const [step, setStep] = useState(0);
  const { missing } = useWorkspace();
  const left = (section: 'buyer' | 'target' | 'deal') => missing.filter((m) => m.section === section).length;
  const counts = [left('buyer'), left('target'), left('deal'), 0, 0];
  const go = (next: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">
              Deal intake, step {step + 1} of {STEPS.length}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">{STEPS[step]}</h1>
          </div>
          <span className="text-sm text-muted">{Math.round(((step + 1) / STEPS.length) * 100)}% through</span>
        </div>
        <ol className="grid grid-cols-5 border-y border-line" aria-label="Deal intake steps">
          {STEPS.map((label, index) => (
            <li key={label} className="border-r border-line last:border-r-0">
              <button
                type="button"
                onClick={() => go(index)}
                aria-current={index === step ? 'step' : undefined}
                className={`w-full px-2 py-3 text-center text-[11px] leading-4 sm:px-3 sm:text-xs ${
                  index === step ? 'font-semibold text-signal' : 'text-ink hover:text-signal'
                }`}
              >
                <span className="mr-1 hidden font-mono sm:inline">0{index + 1}</span>
                {label}
                {counts[index] ? <span className="ml-1 text-faint">({counts[index]})</span> : null}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <IntakeScreen step={step} />
      <div className="mx-auto -mt-24 flex w-full max-w-6xl items-center justify-between gap-3 px-5 pb-32 sm:px-8">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="h-11 border border-line px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="h-11 bg-signal px-6 text-sm font-semibold text-white"
          >
            Next: {STEPS[step + 1]}
          </button>
        ) : (
          <span className="text-sm text-muted">
            Use “Run the analysis” at the bottom when every field is filled.
          </span>
        )}
      </div>
    </div>
  );
}
