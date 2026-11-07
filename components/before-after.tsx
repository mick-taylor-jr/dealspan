'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Logo, livingGap } from '@/components/Logo';

export type BeforeAfterRow = { label: string; value: string; note?: string };

export type BeforeAfterProps = {
  title: string;
  asking: string;
  fair: string;
  gap: string;
  gapShare: number;
  seller: BeforeAfterRow[];
  worth: BeforeAfterRow[];
};

/** Drag across the deal: the seller's pitch on the left, what the business is worth on the right. */
export function BeforeAfter({ title, asking, fair, gap, gapShare, seller, worth }: BeforeAfterProps) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const moveTo = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging) moveTo(e.clientX);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 5;
    const next =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? pos - step
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? pos + step
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null;
    if (next == null) return;
    e.preventDefault();
    setPos(Math.min(100, Math.max(0, next)));
  };

  return (
    <figure className="m-0">
      <div className="border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="hidden text-xs text-muted sm:inline">Fictional example</span>
        </div>

        <div
          ref={box}
          className={`relative h-[22rem] select-none overflow-hidden sm:h-[23rem] ${dragging ? 'cursor-grabbing' : 'cursor-ew-resize'}`}
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* Left: the seller's asking price (underneath, darker beige). */}
          <div className="absolute inset-0 bg-page-2">
            <div className="flex h-full w-1/2 flex-col p-4 pr-6 sm:p-5 sm:pr-8">
              <span className="eyebrow">Seller’s asking price</span>
              <span className="mt-3 font-serif text-[22px] leading-none text-muted line-through decoration-brick decoration-2 sm:text-[30px]">
                {asking}
              </span>
              <dl className="mt-5 flex flex-col divide-y divide-line border-t border-line text-xs sm:text-sm">
                {seller.map((row) => (
                  <Row key={row.label} row={row} muted />
                ))}
              </dl>
            </div>
          </div>

          {/* Right: what it's worth (on top, clipped at the handle). */}
          <div
            className="absolute inset-0 bg-card"
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
            aria-hidden={pos >= 99}
          >
            <div className="ml-auto flex h-full w-1/2 flex-col p-4 pl-6 sm:p-5 sm:pl-8">
              <span className="eyebrow">What it’s worth</span>
              <span className="mt-3 font-serif text-[22px] leading-none text-green sm:text-[30px]">{fair}</span>
              <dl className="mt-5 flex flex-col divide-y divide-line border-t border-line text-xs sm:text-sm">
                {worth.map((row) => (
                  <Row key={row.label} row={row} />
                ))}
              </dl>
            </div>
          </div>

          {/* The handle. */}
          <div className="absolute inset-y-0 w-0" style={{ left: `${pos}%` }}>
            <div className="absolute inset-y-0 -left-px w-0.5 bg-green" />
            <div
              role="slider"
              tabIndex={0}
              aria-label="Compare the seller’s asking price with what the business is worth"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
              aria-valuetext={pos < 35 ? 'Showing what it’s worth' : pos > 65 ? 'Showing the seller’s pitch' : 'Showing both'}
              onKeyDown={onKey}
              className="absolute top-1/2 -left-5 flex h-10 w-10 -translate-y-1/2 cursor-grab items-center justify-center bg-green text-card"
            >
              <span aria-hidden className="text-lg leading-none">⇆</span>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-green px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="eyebrow">The Gap</span>
              <p className="mt-1 font-serif text-2xl leading-tight text-green sm:text-[28px]">
                {gap} <span className="text-ink">you’d overpay</span>
              </p>
            </div>
            <Logo size={34} gap={livingGap(gapShare)} title={`Gap ${Math.round(gapShare * 100)}% above value`} />
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-muted">Drag the handle to compare · fictional example</figcaption>
    </figure>
  );
}

function Row({ row, muted }: { row: BeforeAfterRow; muted?: boolean }) {
  return (
    <div className="py-2">
      <dt className="text-[11px] leading-4 text-muted sm:text-xs">{row.label}</dt>
      <dd className={`font-semibold tabular-nums ${muted ? 'text-muted' : 'text-ink'}`}>
        {row.value}
        {row.note ? <span className="ml-1 font-normal text-muted">{row.note}</span> : null}
      </dd>
    </div>
  );
}
