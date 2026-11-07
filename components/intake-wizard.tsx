'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IntakeScreen } from '@/components/intake-screen';
import { useWorkspace } from '@/components/workspace';

const STEPS = ['Your company', 'Target', 'The deal', 'Synergies', 'Fit'];
const HEADINGS: Record<string, number> = {
  'Your company': 0,
  'Company you want to buy': 1,
  'The deal': 2,
  Synergies: 3,
  Fit: 4,
};

export function IntakeWizard() {
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const { analysis } = useWorkspace();
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('section').forEach((section) => {
      const heading = section.querySelector('h2')?.textContent?.trim();
      if (heading && heading in HEADINGS) section.dataset.intakeStep = String(HEADINGS[heading]);
    });
  }, []);
  return (
    <div ref={root} data-active-step={step} className="intake-wizard">
      <div className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">Deal intake · Step {step + 1} of 5</p><h1 className="mt-2 text-2xl font-semibold">{STEPS[step]}</h1></div><span className="text-sm text-muted">{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span></div>
        <ol className="mb-7 grid grid-cols-5 border-y border-line" aria-label="Deal intake progress">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={`border-r border-line px-2 py-3 text-center text-[11px] leading-4 sm:px-3 sm:text-xs ${index === step ? 'font-semibold text-signal' : index < step ? 'text-ink' : 'text-muted'}`}><span className="mr-1 hidden font-mono sm:inline">0{index + 1}</span>{label}</li>)}</ol>
      </div>
      <IntakeScreen />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 pb-8 sm:px-8">
        <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="h-11 border border-line px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Back</button>
        {step < 4 ? <button type="button" onClick={() => { setStep((current) => Math.min(4, current + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="h-11 bg-signal px-6 text-sm font-semibold text-white">Next</button> : analysis ? <Link href="/results" className="inline-flex h-11 items-center bg-signal px-6 text-sm font-semibold text-white">Run the analysis</Link> : <span className="text-sm text-muted">Complete the required fields to run the analysis.</span>}
      </div>
    </div>
  );
}
