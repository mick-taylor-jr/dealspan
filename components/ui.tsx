import type { ReactNode } from 'react';
import type { Label } from '@/lib/types';

const LABEL_STYLE: Record<Label, string> = {
  'user-entered': 'bg-[#eef1ee] text-muted',
  calculated: 'bg-syn-soft text-[#2a5c94]',
  assumed: 'bg-warn-soft text-[#7a4f00]',
  cited: 'bg-buyer-soft text-[#0e6145]',
};

export function Prov({ label }: { label: Label }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium ${LABEL_STYLE[label]}`}
    >
      {label}
    </span>
  );
}

export function Stat({
  label,
  value,
  note,
  prov,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  prov?: Label;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={`tabular-nums tracking-tight ${emphasis ? 'text-3xl font-semibold' : 'text-xl font-semibold'}`}
      >
        {value}
      </span>
      {note || prov ? (
        <span className="flex flex-wrap items-center gap-2 text-xs text-faint">
          {prov ? <Prov label={prov} /> : null}
          {note}
        </span>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      {title ? (
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold">{title}</h3>
          {aside ? <div className="text-sm text-muted">{aside}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
      style={{ background: color }}
    />
  );
}

export const COLORS = {
  buyer: '#14845e',
  target: '#b07a10',
  syn: '#3d7dc4',
  ink: '#17201c',
  line: '#dde3de',
};
