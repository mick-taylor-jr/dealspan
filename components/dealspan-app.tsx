'use client';

import { useEffect, useRef, useState } from 'react';
import { buildDeal, type Deal } from '@/lib/bridge';
import { ANALOGY, DISCLAIMER, PITCH } from '@/lib/copy';
import { greenridgeIntake } from '@/lib/greenridge';
import { emptyIntake, type Intake } from '@/lib/types';
import { BridgeScreen } from '@/components/bridge-screen';
import { IntakeForm } from '@/components/intake-form';

export function DealspanApp() {
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [phase, setPhase] = useState<'edit' | 'bridge'>('edit');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (phase === 'bridge') headingRef.current?.focus();
  }, [phase, deal]);

  function publish(next: Intake) {
    const result = buildDeal(next);
    setIntake(next);
    if (!result.ok) {
      setDeal(null);
      setErrors(result.errors);
      setPhase('edit');
      return;
    }
    setErrors(null);
    setDeal(result.deal);
    setPhase('bridge');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6">
        <div>
          {phase === 'bridge' ? (
            <p className="text-sm font-medium text-neutral-500">Dealspan</p>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">Dealspan</h1>
          )}
          <p className="mt-2 max-w-3xl text-lg leading-7">{PITCH}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">{ANALOGY}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            data-testid="load-example"
            className="rounded-md bg-neutral-950 px-4 py-3 text-sm font-medium text-white"
            onClick={() => publish(greenridgeIntake())}
          >
            Load Greenridge Landscape Co. example
          </button>
          <p className="max-w-xl text-xs leading-5 text-neutral-500">
            Labeled hypothetical, not a real company. Fills the example inputs, including a 2.8× multiple.
            Nothing is saved on a server.
          </p>
        </div>
      </header>

      {phase === 'bridge' && deal ? (
        <BridgeScreen deal={deal} headingRef={headingRef} onEdit={() => setPhase('edit')} />
      ) : (
        <>
          <IntakeForm intake={intake} errors={errors} onChange={setIntake} onSubmit={() => publish(intake)} />
          <p className="text-sm leading-6 text-neutral-700">{DISCLAIMER}</p>
        </>
      )}
    </div>
  );
}
