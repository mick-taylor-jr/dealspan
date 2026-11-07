'use client';

import type { CSSProperties } from 'react';
import InkOrbitFeatures from '@/components/ui/ink-orbit-features';

/** The ink-orbit feature bento, recolored to the DealSpan brand: beige, paper, deal green, no hatching or glows. */
const BRAND = {
  '--ib-page': 'transparent',
  '--ib-hatch': 'transparent',
  '--ib-paper': '#FBF8F1',
  '--ib-card': '#FBF8F1',
  '--ib-raise': '#FBF8F1',
  '--ib-ink': '#1F4A37',
  '--ib-soft': '#1D2520',
  '--ib-muted': '#5F665F',
  '--ib-faint': '#8A8F84',
  '--ib-line': '#DDD4C2',
  '--ib-line-strong': '#CDC2AC',
  '--ib-bracket': '#CDC2AC',
  '--ib-inv': '#1F4A37',
  '--ib-inv-ink': '#FBF8F1',
  '--ib-shadow': 'none',
  '--ib-sans': 'Inter, Arial, ui-sans-serif, system-ui, sans-serif',
  padding: 0,
} as CSSProperties;

const OVERRIDES = `
.ds-orbit .ib-h2{font-family:Lora,Georgia,serif;font-weight:600;color:#1F4A37;letter-spacing:-.015em}
.ds-orbit .ib-muted{color:#A8843C}
.ds-orbit .ib-tag{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#A8843C;background:transparent;border:0;padding:0}
.ds-orbit .ib-diagram > path[fill^="url"]{display:none}
.ds-orbit .ib-presence{fill:#2E6A50;animation:none}
.ds-orbit .ib-glow{animation:none}
.ds-orbit .ib-node{filter:none!important}
.ds-orbit .ib-card h3{font-size:14px}
.ds-orbit .ib-card p{font-size:13px}
`;

export function ReportFeatures({ values, labels }: { values: number[]; labels: string[] }) {
  return (
    <>
      <style>{OVERRIDES}</style>
      <InkOrbitFeatures
        className="ds-orbit"
        theme="light"
        brand="DealSpan"
        style={BRAND}
        tag="Inside the report"
        title={'One report, *four checks*\nOne fair price'}
        collaboration={{
          title: 'Your numbers and the seller’s',
          description:
            'Enter both companies once. Your partner, broker and lender read the same figures, and every assumption is labeled.',
        }}
        reports={{
          title: 'A report you can hand to a lender',
          description: 'Excel and PDF exports carry the fair-price stamp, the sources and the questions to ask the seller.',
        }}
        integrations={{
          title: 'Comps, LBO, DCF and SBA',
          description: 'Comparable sales, an LBO, a DCF and SBA 7(a) loan sizing all run off the same verified earnings.',
          tools: ['Comps', 'LBO', 'DCF', 'SBA'],
        }}
        insights={{
          title: 'Earnings, forecast',
          description: 'The sample target’s verified EBITDA for 2023–2025 and the DCF’s five-year projection. Scrub to read each year.',
          values,
          labels,
          forecastFrom: 3,
        }}
      />
    </>
  );
}
