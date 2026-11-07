'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoIntake } from '@/lib/demo';
import { analyze, findMissing, type Analysis, type Missing } from '@/lib/model';
import { emptyIntake, type Intake } from '@/lib/types';

type WorkspaceValue = {
  intake: Intake;
  setIntake: (next: Intake | ((prev: Intake) => Intake)) => void;
  missing: Missing[];
  analysis: Analysis | null;
  loadDemo: () => void;
  clear: () => void;
  ready: boolean;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
const KEY = 'dealspan:intake:v4';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [intake, setIntakeState] = useState<Intake>(emptyIntake);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Clear inputs saved by earlier versions, which kept the demo across visits.
      localStorage.removeItem('dealspan:intake:v2');
      localStorage.removeItem('dealspan:intake:v3');
      // Inputs live only for this browser tab. The demo is restored only on the results page
      // (so a refresh there still works); the intake page always opens empty unless the user typed.
      const saved = sessionStorage.getItem(KEY);
      const parsed = saved ? (JSON.parse(saved) as Intake) : null;
      const onResults = window.location.pathname.startsWith('/results');
      if (parsed && (!parsed.demo || onResults)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore once after mount
        setIntakeState({ ...emptyIntake(), ...parsed });
      } else if (parsed?.demo) {
        sessionStorage.removeItem(KEY);
      }
    } catch {
      // Storage can be unavailable; start empty.
    }
    setReady(true);
  }, []);

  const setIntake = useCallback((next: Intake | ((prev: Intake) => Intake)) => {
    setIntakeState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        sessionStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        // ignore
      }
      return value;
    });
  }, []);

  const missing = useMemo(() => findMissing(intake), [intake]);
  const analysis = useMemo(() => (missing.length ? null : analyze(intake)), [intake, missing]);

  const value = useMemo<WorkspaceValue>(
    () => ({
      intake,
      setIntake,
      missing,
      analysis,
      loadDemo: () => setIntake(demoIntake()),
      clear: () => setIntake(emptyIntake()),
      ready,
    }),
    [intake, setIntake, missing, analysis, ready],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
