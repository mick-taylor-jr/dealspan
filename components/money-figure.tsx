import { formatCents } from '@/lib/money';
import type { Figure, LabeledCents } from '@/lib/types';

export function MoneyFigure({ figure, emphasize = false }: { figure: LabeledCents; emphasize?: boolean }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1">
      <span
        className={
          emphasize ? 'text-3xl font-semibold tracking-tight tabular-nums' : 'font-medium tabular-nums'
        }
      >
        {formatCents(figure.cents)}
      </span>
      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-700">
        {figure.label}
      </span>
      <span className="text-xs text-neutral-500">{figure.location}</span>
    </span>
  );
}

export function FigureValue({ figure }: { figure: Figure }) {
  if (figure.missing) {
    return <span className="text-sm text-neutral-600">Not entered. Not treated as zero.</span>;
  }
  return <MoneyFigure figure={figure} />;
}
