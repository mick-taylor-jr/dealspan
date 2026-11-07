'use client';

import { useEffect, useState, type CSSProperties } from 'react';

/**
 * The DealSpan mark: a serif "D" in two pieces. The stem stays put; the bowl slides right to open a gap,
 * with a thin gold line on its left edge. Closed is the seller's asking price, open is the fair price.
 */

const GREEN = '#1F4A37';
const BEIGE = '#F4EFE4';
const GOLD = '#A8843C';

export type LogoProps = {
  /** Height of the mark in px. */
  size?: number;
  /** How far the bowl is slid open, 0–10. The resting logo is 5. */
  gap?: number;
  /** Green on light backgrounds, beige on green ones. The gold never changes. */
  color?: 'green' | 'beige';
  withWordmark?: boolean;
  /** Hide the gold edge, e.g. when the asking price is at or below the fair price. Defaults to hiding it at gap 0. */
  edge?: boolean;
  /** Start closed and open once, about 0.8s after mount (the landing-page nav). */
  openOnLoad?: boolean;
  /** Widen to gap 7 while hovered (the nav logo). */
  hoverOpen?: boolean;
  /** Slide 0 → 6 → 0 on a loop, for loading states. */
  loading?: boolean;
  /** Accessible name. Omit to hide the mark from assistive tech. */
  title?: string;
  className?: string;
};

export function Logo({
  size = 28,
  gap = 5,
  color = 'green',
  withWordmark = false,
  edge,
  openOnLoad = false,
  hoverOpen = false,
  loading = false,
  title,
  className = '',
}: LogoProps) {
  const [opened, setOpened] = useState(!openOnLoad);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!openOnLoad) return;
    const t = window.setTimeout(() => setOpened(true), 800);
    return () => window.clearTimeout(t);
  }, [openOnLoad]);

  const fill = color === 'beige' ? BEIGE : GREEN;
  const resting = Math.max(0, Math.min(10, gap));
  // A logo that stops being the landing-page intro (client navigation) is simply open.
  const isOpen = opened || !openOnLoad;
  const current = loading ? 0 : !isOpen ? 0 : hovered && hoverOpen ? Math.max(7, resting) : resting;
  const showEdge = loading ? true : edge ?? current > 0;
  const width = (size * 45) / 40;
  const style = { '--gap': `${current}px`, '--edge': showEdge ? 1 : 0 } as CSSProperties;

  return (
    <span
      className={`inline-flex items-center ${className}`}
      onMouseEnter={hoverOpen ? () => setHovered(true) : undefined}
      onMouseLeave={hoverOpen ? () => setHovered(false) : undefined}
      onFocus={hoverOpen ? () => setHovered(true) : undefined}
      onBlur={hoverOpen ? () => setHovered(false) : undefined}
    >
      <svg
        className={`ds-logo shrink-0 ${loading ? 'ds-logo-loading' : ''}`}
        data-intro={openOnLoad ? '' : undefined}
        viewBox="2 0 45 40"
        width={width}
        height={size}
        style={style}
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
      >
        <path d="M2 3H17V6.8H15.2V33.2H17V37H2L7.1 33V7Z" fill={fill} />
        <g className="bowl">
          <path
            d="M17 3H20C30 3 37 10 37 20C37 30 30 37 20 37H17V33.2H20C25.2 33.2 29.2 29 29.2 20C29.2 11 25.2 6.8 20 6.8H17Z"
            fill={fill}
          />
          <rect className="edge" x="17" y="3" width="1.8" height="34" fill={GOLD} />
        </g>
      </svg>
      {withWordmark ? (
        <span
          className="font-serif leading-none tracking-[-0.01em]"
          style={{ color: fill, fontSize: Math.round(size * 0.7), marginLeft: 10 }}
        >
          DealSpan
        </span>
      ) : null}
    </span>
  );
}

/** Gap width for the living logo: min(10, overpay% × 26). Closed when the ask is at or below fair value. */
export function livingGap(overpayShare: number) {
  return overpayShare > 0 ? Math.min(10, overpayShare * 26) : 0;
}
