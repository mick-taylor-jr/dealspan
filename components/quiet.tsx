import type { ReactNode } from 'react';
import { formatCents } from '@/lib/money';
import type { ProvenanceLabel } from '@/lib/types';

export function Tag({ label }: { label: ProvenanceLabel }) {
  return <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{label}</span>;
}

export function QuietMoney({
  cents,
  label,
  source,
  size = 'md',
}: {
  cents: number;
  label: ProvenanceLabel;
  source: string;
  size?: 'md' | 'lg';
}) {
  return (
    <span title={source} className="inline-flex items-baseline gap-2">
      <span className={size === 'lg' ? 'text-5xl font-semibold tracking-tight tabular-nums' : 'tabular-nums'}>
        {formatCents(cents)}
      </span>
      <Tag label={label} />
    </span>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm text-stone-500">{children}</span>;
}
