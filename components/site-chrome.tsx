'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useWorkspace } from '@/components/workspace';

const STAGES = ['Sourcing', 'Letter of intent', 'Diligence', 'Financing', 'Close'] as const;
const CURRENT = 2;

/** Nav and deal-stage bar, sticky together. 56px + 44px = 100px; the results tabs stick under it. */
export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-card">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="DealSpan home" className="flex items-center">
          <Logo size={26} withWordmark hoverOpen openOnLoad={path === '/'} />
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:gap-6" aria-label="Main">
          <SampleReportLink className="hidden font-medium text-muted hover:text-green sm:inline" />
          <Link
            href="/deal"
            className={`font-semibold text-green underline decoration-gold decoration-2 underline-offset-[6px] ${path === '/deal' ? '' : 'hover:decoration-green'}`}
          >
            Start a deal
          </Link>
        </nav>
      </div>
      <StageBar />
    </header>
  );
}

function StageBar() {
  return (
    <div className="border-t border-line">
      <ol
        className="mx-auto grid h-11 w-full max-w-6xl grid-cols-[1fr_1fr_1.4fr_1fr_1fr] lg:grid-cols-[1fr_1fr_2fr_1fr_1fr] gap-2 px-4 sm:gap-4 sm:px-8"
        aria-label="Deal stages"
      >
        {STAGES.map((name, i) => {
          const done = i < CURRENT;
          const current = i === CURRENT;
          return (
            <li key={name} aria-current={current ? 'step' : undefined} className="relative flex min-w-0 flex-col">
              <span aria-hidden className="flex h-1 w-full">
                <span className={`h-full ${done || current ? 'bg-green' : 'bg-line'} ${current ? 'w-1/2' : 'w-full'}`} />
                {current ? <span className="h-full w-1/2 bg-line" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <span className="font-serif text-[13px] text-gold">{String(i + 1).padStart(2, '0')}</span>
                <span
                  className={`truncate text-xs ${current ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted'} ${current ? '' : 'hidden md:inline'}`}
                >
                  {name}
                </span>
                {current ? (
                  <span className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-gold lg:inline">
                    DealSpan works here
                  </span>
                ) : null}
              </span>
              <span className="sr-only">{done ? 'done' : current ? 'current stage, DealSpan works here' : 'later'}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo size={22} withWordmark />
        <p>DealSpan · Screening tool, not a valuation opinion or financial advice.</p>
      </div>
    </footer>
  );
}

/** Loads the fictional sample deal and opens its report. */
export function SampleReportLink({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  const { loadSample } = useWorkspace();
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        loadSample();
        router.push('/results');
      }}
    >
      {children ?? 'Sample report'}
    </button>
  );
}
