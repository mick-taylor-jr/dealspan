import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { WorkspaceProvider } from '@/components/workspace';
import './globals.css';

export const metadata: Metadata = {
  title: 'DealSpan',
  description:
    'Enter your company and the one you want to buy. Get a DCF, LBO, precedents, synergies, SBA financing and a fit scorecard.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col bg-page text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <WorkspaceProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </WorkspaceProvider>
      </body>
    </html>
  );
}
