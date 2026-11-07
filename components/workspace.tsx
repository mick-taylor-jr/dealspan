'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoIntake } from '@/lib/demo';
import { cacheKey, type AiDeal, type PrecedentQuery } from '@/lib/ai-precedents';
import { industryLabel } from '@/lib/industries';
import { analyze, findMissing, type Analysis, type Missing } from '@/lib/model';
import { num } from '@/lib/types';
import { emptyIntake, type Intake } from '@/lib/types';

export type AiState = {
  key: string;
  status: 'idle' | 'loading' | 'ok' | 'not-configured' | 'error';
  deals: AiDeal[];
  rejected: number;
  searches: number;
  message?: string;
};

const AI_IDLE: AiState = { key: '', status: 'idle', deals: [], rejected: 0, searches: 0 };
const AI_KEY = 'dealspan:ai:';

type WorkspaceValue = {
  ai: AiState;
  findPrecedents: () => void;
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
  const [ai, setAi] = useState<AiState>(AI_IDLE);

  const query = useMemo<PrecedentQuery | null>(() => {
    if (missing.length) return null;
    const ebitda = num(intake.target.ebitda[2]);
    const revenue = num(intake.target.revenue[2]);
    if (!ebitda || !revenue) return null;
    return {
      industry: intake.target.industry,
      industryLabel: industryLabel(intake.target.industry),
      subsector: intake.target.subsector ?? '',
      description: intake.target.description,
      location: intake.target.location,
      ebitda,
      revenue,
    };
  }, [intake, missing]);
  const queryKey = query ? cacheKey(query) : '';

  const findPrecedents = useCallback(() => {
    if (!query) return;
    const k = cacheKey(query);
    if (ai.key === k && ai.status !== 'idle') return;
    try {
      const saved = sessionStorage.getItem(AI_KEY + k);
      if (saved) {
        setAi({ ...(JSON.parse(saved) as AiState), key: k });
        return;
      }
    } catch {
      // ignore
    }
    setAi({ ...AI_IDLE, key: k, status: 'loading' });
    fetch('/api/precedents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: Omit<AiState, 'key'>) => {
        const next: AiState = { ...body, key: k };
        setAi((prev) => (prev.key === k ? next : prev));
        if (body.status === 'ok') {
          try {
            sessionStorage.setItem(AI_KEY + k, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
      })
      .catch(() =>
        setAi((prev) =>
          prev.key === k
            ? {
                ...AI_IDLE,
                key: k,
                status: 'error',
                message: 'The AI search did not finish. Showing database deals only.',
              }
            : prev,
        ),
      );
  }, [query, ai.key, ai.status]);

  const analysis = useMemo(() => {
    if (missing.length) return null;
    const aiDeals = ai.key === queryKey && ai.status === 'ok' ? ai.deals : [];
    return analyze(intake, aiDeals);
  }, [intake, missing, ai, queryKey]);

  const value = useMemo<WorkspaceValue>(
    () => ({
      intake,
      setIntake,
      missing,
      analysis,
      ai: ai.key === queryKey ? ai : AI_IDLE,
      findPrecedents,
      loadDemo: () => setIntake(demoIntake()),
      clear: () => setIntake(emptyIntake()),
      ready,
    }),
    [intake, setIntake, missing, analysis, ready, ai, queryKey, findPrecedents],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
