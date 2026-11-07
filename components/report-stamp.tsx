import { Logo } from '@/components/Logo';
import { usd } from '@/lib/format';

/** The fair-price stamp: the mark, a gold FAIR PRICE label, the price in Lora and what it rests on. */
export function ReportStamp({ fair, asking }: { fair: number; asking: number | null }) {
  return (
    <div className="inline-flex max-w-full items-center gap-4 border-2 border-green bg-card px-4 py-3 outline outline-1 outline-offset-[3px] outline-line sm:px-5">
      <Logo size={36} />
      <div className="min-w-0">
        <div className="eyebrow">Fair price</div>
        <div className="font-serif text-[28px] leading-tight text-green tabular-nums">{usd(fair)}</div>
        <div className="text-xs leading-5 text-muted">
          {asking != null ? `Asking ${usd(asking)} · ` : ''}DCF, LBO, comps and SBA financing
        </div>
      </div>
    </div>
  );
}
