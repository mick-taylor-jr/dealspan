'use client';

import { useState } from 'react';
import { COLORS, Swatch } from '@/components/ui';
import { usd, usdShort } from '@/lib/format';
import type { FieldRow } from '@/lib/model';

function niceTicks(min: number, max: number, count = 5) {
  const span = max - min || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; ; v += step) {
    ticks.push(v);
    if (v >= max - step * 0.001) break;
  }
  return ticks;
}

/** Valuation ranges by method, with your offer and the asking price as vertical markers. */
export function FootballField({
  rows,
  offer,
  asking,
}: {
  rows: FieldRow[];
  offer: number;
  asking: number | null;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const values = rows.flatMap((r) => [r.low, r.high]).concat(offer, asking ?? offer);
  const ticks = niceTicks(Math.min(...values) * 0.85, Math.max(...values) * 1.05);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  return (
    <div>
      <div className="mb-9 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Swatch color={COLORS.target} /> Standalone value of the target
        </span>
        <span className="flex items-center gap-2">
          <Swatch color={COLORS.syn} /> Value to you with synergies
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-0.5 bg-ink" /> Your offer
        </span>
        {asking ? (
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-0 border-l-2 border-dashed border-risk" /> Asking
            price
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(7.5rem,13rem)_1fr]">
        <div className="hidden flex-col sm:flex">
          {rows.map((row) => (
            <div key={row.id} className="flex h-16 flex-col justify-center pr-2">
              <span className="text-sm font-medium leading-5">{row.name}</span>
              <span className="text-xs leading-4 text-faint">{row.detail}</span>
            </div>
          ))}
        </div>
        <div className="relative mx-10">
          {rows.map((row) => {
            const active = hover === row.id;
            return (
              <div
                key={row.id}
                className="relative h-16 border-b border-line/70 outline-none"
                onMouseEnter={() => setHover(row.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(row.id)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${row.name}: ${usd(row.low)} to ${usd(row.high)}`}
              >
                <span className="absolute -left-10 top-1 text-xs font-medium sm:hidden">{row.name}</span>
                <div
                  className="absolute top-[62%] h-6 -translate-y-1/2 rounded transition-opacity sm:top-1/2"
                  style={{
                    left: `${x(row.low)}%`,
                    width: `${Math.max(0.8, x(row.high) - x(row.low))}%`,
                    background: row.id === 'strategic' ? COLORS.syn : COLORS.target,
                    opacity: hover && !active ? 0.4 : 1,
                  }}
                />
                <span
                  className="absolute top-[62%] -translate-x-full -translate-y-1/2 pr-2 text-xs tabular-nums text-muted sm:top-1/2"
                  style={{ left: `${x(row.low)}%` }}
                >
                  {usdShort(row.low)}
                </span>
                <span
                  className="absolute top-[62%] -translate-y-1/2 pl-2 text-xs tabular-nums text-muted sm:top-1/2"
                  style={{ left: `${x(row.high)}%` }}
                >
                  {usdShort(row.high)}
                </span>
                {active ? (
                  <div
                    role="tooltip"
                    className="absolute top-full z-10 -mt-2 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-sm"
                    style={{ left: `${Math.min(60, x(row.low))}%` }}
                  >
                    <div className="font-medium">{row.name}</div>
                    <div className="tabular-nums text-muted">
                      {usd(row.low)} – {usd(row.high)}
                    </div>
                    <div className="tabular-nums text-faint">Midpoint {usd((row.low + row.high) / 2)}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: `${rows.length * 4}rem` }}
          >
            <Marker left={x(offer)} label={`Offer ${usdShort(offer)}`} solid />
            {asking ? <Marker left={x(asking)} label={`Ask ${usdShort(asking)}`} below /> : null}
          </div>
          <div className="relative h-7">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-2 -translate-x-1/2 text-[11px] tabular-nums text-faint"
                style={{ left: `${x(t)}%` }}
              >
                {usdShort(t)}
              </span>
            ))}
          </div>
        </div>
      </div>
      {asking ? <div className="h-6" /> : null}
    </div>
  );
}

function Marker({
  left,
  label,
  solid,
  below,
}: {
  left: number;
  label: string;
  solid?: boolean;
  below?: boolean;
}) {
  return (
    <div className="absolute inset-y-0" style={{ left: `${left}%` }}>
      <div className={`h-full ${solid ? 'w-0.5 bg-ink' : 'w-0 border-l-2 border-dashed border-risk'}`} />
      <span
        className={`absolute ${below ? '-bottom-12' : '-top-6'} -translate-x-1/2 whitespace-nowrap rounded px-1.5 text-[11px] font-semibold ${
          solid ? 'bg-ink text-white' : 'bg-risk-soft text-risk'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export type StackSeries = { name: string; color: string; values: number[] };

/** Stacked columns: buyer, target and synergy EBITDA per year. */
export function StackedColumns({ labels, series }: { labels: string[]; series: StackSeries[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((s, ser) => s + ser.values[i], 0));
  const ticks = niceTicks(0, Math.max(...totals) * 1.08, 4);
  const top = ticks[ticks.length - 1];
  const H = 220;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-2">
            <Swatch color={s.color} /> {s.name}
          </span>
        ))}
      </div>
      <div className="relative flex gap-3" style={{ height: H + 24 }}>
        <div className="relative w-12 shrink-0" style={{ height: H + 24 }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2 text-[11px] tabular-nums text-faint"
              style={{ bottom: `${(t / top) * H + 24}px` }}
            >
              {usdShort(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-line"
              style={{ bottom: `${(t / top) * H + 24}px` }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-6 flex items-end justify-around" style={{ height: H }}>
            {labels.map((label, i) => {
              let acc = 0;
              return (
                <div
                  key={label}
                  className="relative flex h-full w-full flex-col items-center justify-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className="mb-1 text-xs font-medium tabular-nums">{usdShort(totals[i])}</span>
                  <div className="flex w-6 flex-col-reverse gap-[2px] sm:w-8">
                    {series.map((s, si) => {
                      const h = (s.values[i] / top) * H;
                      acc += s.values[i];
                      const last =
                        si === series.length - 1 || series.slice(si + 1).every((n) => n.values[i] === 0);
                      return s.values[i] > 0 ? (
                        <div
                          key={s.name}
                          style={{ height: Math.max(1, h - 2), background: s.color }}
                          className={last ? 'rounded-t' : ''}
                        />
                      ) : null;
                    })}
                  </div>
                  <span className="absolute -bottom-6 text-xs text-muted">{label}</span>
                  {hover === i ? (
                    <div
                      role="tooltip"
                      className="absolute bottom-full z-10 mb-2 w-48 rounded-lg border border-line bg-white p-2.5 text-xs shadow-sm"
                    >
                      <div className="mb-1 font-medium">{label}</div>
                      {series.map((s) => (
                        <div key={s.name} className="flex items-center justify-between gap-2 tabular-nums">
                          <span className="flex items-center gap-1.5 text-muted">
                            <Swatch color={s.color} />
                            {s.name}
                          </span>
                          {usdShort(s.values[i])}
                        </div>
                      ))}
                      <div className="mt-1 flex justify-between border-t border-line pt-1 font-medium tabular-nums">
                        <span>Total</span>
                        {usdShort(acc)}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single-series columns: debt balance over the hold. */
export function Columns({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const top = Math.max(...values, 1) * 1.1;
  const H = 160;
  return (
    <div className="flex items-end justify-around gap-2 border-b border-line" style={{ height: H + 24 }}>
      {labels.map((label, i) => (
        <div key={label} className="flex flex-col items-center gap-1" title={`${label}: ${usd(values[i])}`}>
          <span className="text-[11px] tabular-nums text-muted">{usdShort(values[i])}</span>
          <div
            className="w-6 rounded-t sm:w-7"
            style={{ height: Math.max(1, (values[i] / top) * H), background: color }}
          />
          <span className="pb-1 text-xs text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** One bar per sold business: its price as a multiple of profit, with your offer and the middle of the market marked. */
export function MultipleBars({
  rows,
  offer,
  median,
}: {
  rows: Array<{ id: string; name: string; sub: string; multiple: number; highlight?: boolean }>;
  offer: number;
  median: number;
}) {
  const max = Math.ceil(Math.max(...rows.map((r) => r.multiple), offer, median) + 0.5);
  const x = (v: number) => (v / max) * 100;
  const ticks = Array.from({ length: Math.floor(max / 2) + 1 }, (_, i) => i * 2);
  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Swatch color={COLORS.target} /> Price ÷ profit
        </span>
        <span className="flex items-center gap-2">
          <Swatch color={COLORS.syn} /> Also one of your closest matches
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-0.5 bg-ink" /> Your offer
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-0 border-l-2 border-dashed border-muted" /> Middle
          of the market
        </span>
      </div>
      <div className="grid grid-cols-[minmax(7rem,15rem)_1fr] gap-x-4">
        <div className="flex flex-col">
          {rows.map((r) => (
            <div key={r.id} className="flex h-11 flex-col justify-center">
              <span className="truncate text-sm font-medium leading-5" title={r.name}>
                {r.name}
              </span>
              <span className="truncate text-xs leading-4 text-faint">{r.sub}</span>
            </div>
          ))}
        </div>
        <div className="relative mr-10">
          {rows.map((r) => (
            <div key={r.id} className="relative h-11 border-b border-line/60">
              <div
                className="absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-r"
                style={{ width: `${x(r.multiple)}%`, background: r.highlight ? COLORS.syn : COLORS.target }}
                title={`${r.name}: ${r.multiple.toFixed(1)}×`}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 pl-2 text-xs font-medium tabular-nums"
                style={{ left: `${x(r.multiple)}%` }}
              >
                {r.multiple.toFixed(1)}×
              </span>
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ height: `${rows.length * 2.75}rem` }}
          >
            <div className="absolute inset-y-0" style={{ left: `${x(median)}%` }}>
              <div className="h-full w-0 border-l-2 border-dashed border-muted" />
            </div>
            <div className="absolute inset-y-0" style={{ left: `${x(offer)}%` }}>
              <div className="h-full w-0.5 bg-ink" />
              <span className="absolute -top-6 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 text-[11px] font-semibold text-white">
                Your offer {offer.toFixed(1)}×
              </span>
            </div>
          </div>
          <div className="relative h-7">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-2 -translate-x-1/2 text-[11px] tabular-nums text-faint"
                style={{ left: `${x(t)}%` }}
              >
                {t}×
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A single 100% bar that splits the price into its funding sources. */
export function SplitBar({ parts }: { parts: Array<{ name: string; amount: number; color: string }> }) {
  const total = parts.reduce((s, p) => s + p.amount, 0) || 1;
  return (
    <div>
      <div className="flex h-10 w-full gap-[2px] overflow-hidden rounded-lg">
        {parts
          .filter((p) => p.amount > 0)
          .map((p) => (
            <div
              key={p.name}
              className="h-full"
              style={{ width: `${(p.amount / total) * 100}%`, background: p.color }}
              title={`${p.name}: ${usd(p.amount)}`}
            />
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {parts.map((p) => (
          <span key={p.name} className="flex items-center gap-2">
            <Swatch color={p.color} />
            <span className="text-muted">{p.name}</span>
            <span className="font-semibold tabular-nums">{usd(p.amount)}</span>
            <span className="text-xs text-faint">{Math.round((p.amount / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
