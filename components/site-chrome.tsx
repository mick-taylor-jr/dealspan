'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';

/** Slim sticky nav: the DealSpan mark only. 56px tall; the results tabs stick under it. */
export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-card">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-8">
        <Link href="/" aria-label="DealSpan intake" className="flex items-center">
          <Logo size={26} withWordmark hoverOpen openOnLoad={path === '/'} />
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs leading-5 text-muted sm:flex-row sm:items-start sm:gap-8 sm:px-8">
        <Logo size={22} withWordmark />
        <p className="max-w-3xl">
          DealSpan is a buyer-facing underwriting tool for discussion with a searcher, partner or lender. It
          is not a formal quality-of-earnings report, not a valuation opinion, and not a credit decision or
          commitment to lend.
        </p>
      </div>
    </footer>
  );
}
