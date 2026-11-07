import type { Metadata } from 'next';
import Link from 'next/link';
import { WorkspaceProvider } from '@/components/workspace';
import './globals.css';

export const metadata: Metadata = {
  title: 'DealSpan — know what you’re really buying',
  description:
    'Enter your company and the one you want to buy. Get good, average and bad prices, a DCF, LBO, precedent sales, financing, synergies and a fit scorecard.',
  icons: { icon: '/favicon.svg' },
};

function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 32" width="34" height="28">
      <rect x="2" y="9" width="6" height="21" fill="#14213D" />
      <rect x="32" y="9" width="6" height="21" fill="#14213D" />
      <rect x="0" y="3" width="40" height="6" fill="#D62839" />
      <rect x="12" y="15" width="16" height="3" fill="#14213D" opacity=".35" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <WorkspaceProvider>
          <header className="no-print border-b border-line bg-white">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
              <Link href="/" className="flex items-center gap-2.5" aria-label="DealSpan home">
                <Mark />
                <span className="text-xl font-bold tracking-tight">
                  Deal<span className="text-signal">Span</span>
                </span>
              </Link>
              <Link
                href="/deal"
                className="text-sm font-semibold text-ink underline decoration-signal underline-offset-4"
              >
                Start a deal
              </Link>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="no-print mx-auto max-w-3xl px-6 py-10 text-center text-xs leading-5 text-faint">
            DealSpan is a buyer-facing underwriting tool for discussion with a searcher, partner or lender. It
            is not a formal quality-of-earnings report, valuation opinion, credit decision or commitment to
            lend.
          </footer>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
