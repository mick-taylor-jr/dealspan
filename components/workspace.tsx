'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { buildCase, type CaseFile } from '@/lib/case';
import { greenridgeIntake } from '@/lib/greenridge';
import { isIndustry } from '@/lib/industries';
import { parsePositiveDecimal } from '@/lib/money';
import { emptyIntake, type Intake } from '@/lib/types';

type WorkspaceValue = {
  intake: Intake;
  setIntake: (intake: Intake) => void;
  caseFile: CaseFile | null;
  loadExample: () => void;
  submit: () => void;
  canSubmit: boolean;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

function filled(raw: string) {
  return /^\d+$/.test(raw) && raw !== '0';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [intake, setIntake] = useState<Intake>(emptyIntake);
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const canSubmit =
    intake.buyerName.trim() !== '' &&
    intake.targetName.trim() !== '' &&
    isIndustry(intake.buyerIndustry) &&
    isIndustry(intake.industry) &&
    intake.fromYear <= intake.toYear &&
    filled(intake.buyerRevenueRaw) &&
    filled(intake.buyerEbitdaRaw) &&
    filled(intake.revenueRaw) &&
    filled(intake.claimedEarningsRaw) &&
    parsePositiveDecimal(intake.multipleRaw) != null;

  const value = useMemo<WorkspaceValue>(
    () => ({
      intake,
      setIntake,
      caseFile,
      loadExample: () => setIntake(greenridgeIntake()),
      submit: () => {
        if (!canSubmit) return;
        const next: Intake = {
          ...intake,
          metric: 'EBITDA',
          claimPeriod:
            intake.fromYear === intake.toYear ? String(intake.fromYear) : `${intake.fromYear}–${intake.toYear}`,
        };
        const built = buildCase(next);
        if (!built) return;
        setCaseFile(built);
        router.push('/results');
      },
      canSubmit,
    }),
    [intake, caseFile, canSubmit, router],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace missing');
  return value;
}
