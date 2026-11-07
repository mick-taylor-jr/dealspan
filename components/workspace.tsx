'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { buildDeal, type Deal } from '@/lib/bridge';
import { emptyComps, type CompsInput } from '@/lib/comps';
import { defaultDcf, type DcfInput } from '@/lib/dcf';
import { greenridgeIntake } from '@/lib/greenridge';
import { isIndustry } from '@/lib/industries';
import { emptyLbo, type LboInput } from '@/lib/lbo';
import { multiplyCents, parsePositiveDecimal } from '@/lib/money';
import type { SynergyLine } from '@/lib/synergy';
import { emptyIntake, type Intake } from '@/lib/types';

export type Submission = {
  intake: Intake;
  claimedCents: number;
  revenueCents: number | null;
  supportedCents: number | null;
  askCents: number | null;
  payCents: number | null;
  deal: Deal | null;
};

type WorkspaceValue = {
  intake: Intake;
  setIntake: (intake: Intake) => void;
  submission: Submission | null;
  loadExample: () => void;
  submit: () => void;
  canSubmit: boolean;
  comps: CompsInput;
  setComps: (comps: CompsInput) => void;
  dcf: DcfInput;
  setDcf: (dcf: DcfInput) => void;
  lbo: LboInput;
  setLbo: (lbo: LboInput) => void;
  buyerMode: 'standalone' | 'addon';
  setBuyerMode: (mode: 'standalone' | 'addon') => void;
  synergies: SynergyLine[];
  setSynergies: (lines: SynergyLine[]) => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

function moneyCents(raw: string): number | null {
  if (!/^\d+$/.test(raw) || raw === '0') return null;
  const cents = Number(raw) * 100;
  return Number.isSafeInteger(cents) ? cents : null;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [comps, setComps] = useState<CompsInput>(emptyComps);
  const [dcf, setDcf] = useState<DcfInput>(defaultDcf);
  const [lbo, setLbo] = useState<LboInput>(emptyLbo);
  const [buyerMode, setBuyerMode] = useState<'standalone' | 'addon'>('standalone');
  const [synergies, setSynergies] = useState<SynergyLine[]>([]);

  const canSubmit =
    isIndustry(intake.industry) &&
    intake.fromYear <= intake.toYear &&
    moneyCents(intake.claimedEarningsRaw) != null &&
    parsePositiveDecimal(intake.multipleRaw) != null;

  const value = useMemo<WorkspaceValue>(
    () => ({
      intake,
      setIntake,
      submission,
      loadExample: () => setIntake(greenridgeIntake()),
      submit: () => {
        const claimedCents = moneyCents(intake.claimedEarningsRaw);
        if (!isIndustry(intake.industry) || claimedCents == null || !parsePositiveDecimal(intake.multipleRaw))
          return;
        if (intake.fromYear > intake.toYear) return;
        const next: Intake = {
          ...intake,
          metric: 'EBITDA',
          claimPeriod:
            intake.fromYear === intake.toYear
              ? String(intake.fromYear)
              : `${intake.fromYear}–${intake.toYear}`,
        };
        const built = next.taxProfitRaw.trim() ? buildDeal(next) : null;
        const deal = built?.ok ? built.deal : null;
        const supportedCents = deal ? deal.supportedHigh.cents : null;
        const revenueCents = moneyCents(next.revenueRaw);
        const ask = multiplyCents(claimedCents, next.multipleRaw);
        const pay = supportedCents == null ? null : multiplyCents(supportedCents, next.multipleRaw);
        setSubmission({
          intake: next,
          claimedCents,
          revenueCents,
          supportedCents,
          askCents: ask?.cents ?? null,
          payCents: pay?.cents ?? null,
          deal,
        });
        router.push('/results');
      },
      canSubmit,
      comps,
      setComps,
      dcf,
      setDcf,
      lbo,
      setLbo,
      buyerMode,
      setBuyerMode,
      synergies,
      setSynergies,
    }),
    [intake, submission, canSubmit, comps, dcf, lbo, buyerMode, synergies, router],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace missing');
  return value;
}
