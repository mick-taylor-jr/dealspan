import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { WorkspaceProvider } from '@/components/workspace';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dealspan',
  description:
    'Enter your company and the one you want to buy. Get a DCF, LBO, comps, precedents, synergies and a fit scorecard.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <WorkspaceProvider>
          <div className="flex-1">{children}</div>
          <footer className="mx-auto max-w-3xl px-6 py-10 text-center text-xs leading-5 text-faint">
            Dealspan is a buyer-facing underwriting tool for discussion with a searcher, partner or lender. It
            is not a formal quality-of-earnings report, not a valuation opinion, and not a credit decision or
            commitment to lend.
          </footer>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
