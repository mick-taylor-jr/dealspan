import type { ReactNode } from 'react';
import type { Label } from '@/lib/types';

const LABEL_STYLE: Record<Label, string> = {
  'user-entered': 'bg-page text-muted',
  calculated: 'bg-green-soft text-green',
  assumed: 'bg-gold-soft text-[#7a5d22]',
  cited: 'bg-page-2 text-ink',
};

export function Prov({ label }: { label: Label }) {
  return (
    <span className={`inline-flex h-5 items-center px-1.5 text-[11px] font-medium ${LABEL_STYLE[label]}`}>
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
        className={`tabular-nums ${emphasis ? 'font-serif text-3xl text-green' : 'font-serif text-2xl text-green'}`}
      >
        {value}
      </span>
      {note || prov ? (
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
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
    <section className="border border-line bg-card p-5 sm:p-6">
      {title ? (
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="font-serif text-lg text-green">{title}</h3>
          {aside ? <div className="text-sm text-muted">{aside}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: color }} />;
}

/** Chart colors. Deal green and the lighter chart green carry the data; the pale tint marks synergies. */
export const COLORS = {
  buyer: '#1F4A37',
  target: '#2E6A50',
  syn: '#A3BBA9',
  ink: '#1D2520',
  line: '#DDD4C2',
};
