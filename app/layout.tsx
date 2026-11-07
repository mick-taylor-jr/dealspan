import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { WorkspaceProvider } from '@/components/workspace';
import { DISCLAIMER } from '@/lib/copy';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dealspan',
  description: 'What to pay for a $1–50M company, from documents-supported EBITDA.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <WorkspaceProvider>
          <div className="flex-1">{children}</div>
          <footer className="px-6 py-8 text-center text-xs leading-5 text-stone-400">{DISCLAIMER}</footer>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
