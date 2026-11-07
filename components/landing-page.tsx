import Link from 'next/link';

const steps = [
  [
    '01',
    'Enter both companies',
    'Drop in your financial statements and the target’s CIM or P&L, or type three years of results.',
  ],
  ['02', 'Set the deal terms', 'Choose an offer, a financing plan and how long you plan to own it.'],
  ['03', 'Test the combination', 'Describe the synergies and how well the two companies fit together.'],
  [
    '04',
    'Review the analysis',
    'Good, average and bad prices, DCF, LBO, precedent sales and financing in one place.',
  ],
];

// Product facts only: each number below is something the app does, not a market statistic.
const facts = [
  ['76', 'Sold businesses with public prices, each scored 1–100 on how close it is to your target.'],
  ['SBA 7(a)', 'Loan rules used to size your bank loan and the cash you put in, with every source linked.'],
  ['0', 'Numbers calculated by AI. Claude reads documents and finds deals; the math is fixed code.'],
];

export function LandingPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <section className="grid gap-12 border-b border-line py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.18em] text-muted">
            A clearer way to buy a business
          </p>
          <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-.045em] text-balance sm:text-7xl">
            Know what you’re really buying.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Put in your company and the one you want to buy. DealSpan checks the seller’s earnings claims,
            values the business with a DCF, an LBO and precedent sales, and shows how to pay for it.
          </p>
          <Link
            href="/deal"
            className="mt-8 inline-flex h-12 items-center bg-signal px-6 text-sm font-semibold text-white hover:bg-signal/90"
          >
            Start a deal{' '}
            <span className="ml-4" aria-hidden>
              →
            </span>
          </Link>
        </div>
        <div className="grid grid-cols-1 divide-y divide-line border-y border-line">
          {facts.map(([big, text]) => (
            <div key={big} className="py-5">
              <div className="text-3xl font-semibold tracking-tight text-signal">{big}</div>
              <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="py-16 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">
              From first look to offer
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">How it works</h2>
          </div>
          <Link href="/deal" className="text-sm font-semibold text-ink underline underline-offset-4">
            Start a deal →
          </Link>
        </div>
        <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <article key={number} className="border-b border-r border-line p-6">
              <span className="font-mono text-sm text-signal">{number}</span>
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="flex flex-col items-start justify-between gap-5 border-t border-line py-12 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Make your next offer with a reason behind it.</h2>
          <p className="mt-2 text-sm text-muted">
            Start with your company, the target and the numbers you can support.
          </p>
        </div>
        <Link
          href="/deal"
          className="inline-flex h-12 items-center bg-signal px-6 text-sm font-semibold text-white"
        >
          Start a deal{' '}
          <span className="ml-4" aria-hidden>
            →
          </span>
        </Link>
      </section>
    </main>
  );
}
