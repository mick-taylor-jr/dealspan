import Link from 'next/link';
import { BeforeAfter } from '@/components/before-after';
import { ReportFeatures } from '@/components/report-features';
import { SampleReportLink } from '@/components/site-chrome';
import { usd, usdShort } from '@/lib/format';
import { sbaSupportedPrice, theGap } from '@/lib/gap';
import { analyze } from '@/lib/model';
import { SAMPLE_NAME, SAMPLE_PITCH, sampleIntake } from '@/lib/sample';

const STEPS = [
  ['01', 'Your company', 'Your revenue, earnings, cash and debt. They set how you would pay and what you bring.'],
  ['02', 'The target', 'The seller’s asking price, the earnings they claim and the earnings the documents support.'],
  ['03', 'Fit and risk', 'Owner dependence, customer concentration and key people, scored, with questions for the seller.'],
  ['04', 'The fair price', 'DCF, LBO, comps and SBA financing land on one fair price, and the gap to the ask.'],
];

const STATS = [
  ['$350K', 'Median small-business sale price, 2025.'],
  ['4–7%', 'Of that price is what a formal quality-of-earnings review costs, so most buyers skip it.'],
  ['$3M', 'Deal size above which the SBA requires earnings verification.'],
];

export function LandingPage() {
  const a = analyze(sampleIntake())!;
  const g = theGap(a);
  const dcf = a.field.find((f) => f.id === 'dcf')!;
  const comps = a.field.find((f) => f.id === 'precedents' || f.id === 'public');
  const asking = g.asking ?? 0;
  const values = [...a.target.ebitda, ...a.dcf.rows.map((r) => r.ebitda)];
  const labels = ['2023', '2024', '2025', ...a.dcf.rows.map((r) => String(r.year))];

  return (
    <main id="main">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
        <div>
          <p className="eyebrow">Acquisition diligence for small businesses</p>
          <h1 className="mt-4 max-w-xl font-serif text-[40px] leading-[1.05] tracking-[-0.02em] text-green text-balance sm:text-[56px]">
            Know if the price is fair before you sign.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-ink">
            Drag across the deal. On the left, what the seller is asking. On the right, what the business is
            actually worth.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/deal" className="btn-solid">
              Start a deal
            </Link>
            <SampleReportLink className="btn-outline">View a sample report</SampleReportLink>
          </div>
        </div>
        <BeforeAfter
          title={`${SAMPLE_NAME} · FY2025`}
          asking={usd(asking)}
          fair={usd(g.fair)}
          gap={usd(g.gap ?? 0)}
          gapShare={g.share ?? 0}
          seller={[
            { label: 'Claimed earnings (EBITDA)', value: usd(SAMPLE_PITCH.claimedEbitda) },
            { label: 'Multiple implied', value: `${(asking / SAMPLE_PITCH.claimedEbitda).toFixed(1)}×`, note: 'claimed' },
            { label: '“One-time” add-backs', value: usd(SAMPLE_PITCH.addBacks), note: 'recurring' },
          ]}
          worth={[
            { label: 'DCF value', value: `${usdShort(dcf.low)}–${usdShort(dcf.high)}` },
            ...(comps ? [{ label: 'Comps range', value: `${usdShort(comps.low)}–${usdShort(comps.high)}` }] : []),
            { label: 'Max price the SBA loan supports', value: usd(sbaSupportedPrice(a)) },
            { label: 'Verified earnings', value: usd(a.verifiedEbitda) },
          ]}
        />
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto grid w-full max-w-6xl divide-y divide-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {STATS.map(([value, text]) => (
            <div key={value} className="py-7 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <div className="font-serif text-4xl text-green tabular-nums">{value}</div>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="border-t-2 border-green pt-6">
          <p className="eyebrow">From first look to offer</p>
          <h2 className="mt-2 font-serif text-3xl text-green">How it works</h2>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
          {STEPS.map(([n, title, text]) => (
            <article key={n} className="lg:px-6 lg:first:pl-0 lg:last:pr-0">
              <span className="font-serif text-2xl text-gold">{n}</span>
              <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        <ReportFeatures values={values} labels={labels} />
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-5 border-t border-line pt-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-2xl text-green">Walk in knowing the gap.</h2>
            <p className="mt-2 text-sm text-muted">Start with your company, the target and the asking price.</p>
          </div>
          <Link href="/deal" className="btn-solid">
            Start a deal
          </Link>
        </div>
      </section>
    </main>
  );
}
