import type { ReactNode, RefObject } from 'react';
import { FigureValue, MoneyFigure } from '@/components/money-figure';
import type { Deal, DealLine, LenderCase } from '@/lib/bridge';
import { DISCLAIMER, GREENRIDGE_STORY, PEDAGOGY } from '@/lib/copy';
import { formatCompact } from '@/lib/money';
import { CITED_DEALS, THIN_SET_NOTE } from '@/lib/precedents';

const BUYER_LABEL: Record<Deal['buyerType'], string> = {
  sba: 'SBA',
  searcher: 'Searcher',
  independent_sponsor: 'Independent sponsor',
  strategic_add_on: 'Strategic add-on',
};

export function BridgeScreen({
  deal,
  headingRef,
  onEdit,
}: {
  deal: Deal;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
}) {
  const supportText =
    deal.supportedLow.cents === deal.supportedHigh.cents
      ? formatCompact(deal.supportedHigh.cents)
      : `${formatCompact(deal.supportedLow.cents)}–${formatCompact(deal.supportedHigh.cents)}`;
  const accepted = deal.lines.filter((line) => line.classification === 'accepted');
  const rejected = deal.lines.filter((line) => line.classification !== 'accepted');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {deal.targetName || 'Untitled deal'}
          {deal.industry ? ` · ${deal.industry}` : ''} · {deal.metric} · {deal.period} · Buyer type{' '}
          {BUYER_LABEL[deal.buyerType]} (user-entered)
        </p>
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          onClick={onEdit}
        >
          Edit inputs
        </button>
      </div>

      <section className="flex flex-col gap-4">
        <h1
          id="bridge"
          ref={headingRef}
          tabIndex={-1}
          data-testid="bridge-headline"
          className="text-3xl font-semibold tracking-tight outline-none sm:text-4xl"
        >
          Seller says {formatCompact(deal.sellerSays.cents)}. Documents support {supportText}.
        </h1>
        <p className="text-lg text-neutral-700">Here’s every line and why.</p>
        {deal.exampleId === 'greenridge' ? (
          <p className="max-w-3xl text-sm leading-6 text-neutral-700">{GREENRIDGE_STORY}</p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <HeroStat label="Seller says">
            <MoneyFigure figure={deal.sellerSays} emphasize />
          </HeroStat>
          <HeroStat label="Documents support">
            <MoneyFigure figure={deal.supportedHigh} emphasize />
            {deal.supportedLow.cents !== deal.supportedHigh.cents ? (
              <span className="mt-2 block text-sm text-neutral-600">
                Low end <MoneyFigure figure={deal.supportedLow} />
              </span>
            ) : (
              <span className="mt-2 block text-sm text-neutral-600">Low and high match.</span>
            )}
          </HeroStat>
          <HeroStat label="Gap">
            <MoneyFigure figure={deal.gap} emphasize />
          </HeroStat>
        </div>
        <p className="text-sm text-neutral-600">{deal.footingDetail}</p>
        <p
          data-testid="disclaimer"
          className="rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-800"
        >
          {DISCLAIMER}
        </p>
      </section>

      <section className="max-w-3xl text-sm leading-6 text-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-950">How SDE is being used</h2>
        <p className="mt-2">{PEDAGOGY}</p>
        <p className="mt-2">
          Starting point: {deal.reportedBasis}. <MoneyFigure figure={deal.reported} />
        </p>
        {deal.revenue ? (
          <p className="mt-2">
            Revenue <MoneyFigure figure={deal.revenue} />
            {deal.marginText ? (
              <span>
                {' '}
                Documents-supported earnings are {deal.marginText} of that revenue (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                  calculated
                </span>
                ).
              </span>
            ) : null}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">P&L, tax return, and bank deposits</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="rounded-md border border-neutral-200 p-3 text-sm">
            <span className="block font-medium">P&L profit</span>
            <FigureValue figure={deal.proof.pnl} />
          </li>
          <li className="rounded-md border border-neutral-200 p-3 text-sm">
            <span className="block font-medium">Tax-return profit</span>
            <FigureValue figure={deal.proof.tax} />
          </li>
          <li className="rounded-md border border-neutral-200 p-3 text-sm">
            <span className="block font-medium">Stated bank deposits</span>
            <FigureValue figure={deal.proof.deposits} />
          </li>
          <li className="rounded-md border border-neutral-200 p-3 text-sm">
            <span className="block font-medium">Stated receipts</span>
            <FigureValue figure={deal.proof.receipts} />
          </li>
        </ul>
        <ul className="flex flex-col gap-2">
          {deal.notices.map((notice) => (
            <li
              key={notice.text}
              className={
                notice.level === 'warn'
                  ? 'rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950'
                  : 'rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700'
              }
            >
              {notice.text}
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-600">
          Add-backs are {deal.intensityTotal?.text ?? 'not computed'} of reported profit (
          <span className="uppercase">{deal.intensityTotal?.label}</span>, all lines). Inflated add-backs are{' '}
          {deal.intensityInflated?.text ?? 'not computed'} ({deal.intensityInflated?.source ?? 'not computed'}
          ). The warning uses the inflated share. Totals are not rewritten.
        </p>
      </section>

      {deal.noAddBacks ? (
        <p className="text-sm text-neutral-700">
          No add-backs were provided. Documents-supported earnings equal reported profit.
        </p>
      ) : null}

      <LineGroup title="Accepted" lines={accepted} empty="Nothing was accepted." />
      {deal.contrast ? (
        <p className="rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm leading-6">
          {deal.contrast}
        </p>
      ) : null}
      <LineGroup title="Rejected or cut" lines={rejected} empty="Nothing was rejected." />

      <section className="grid gap-3 sm:grid-cols-2">
        <p className="text-sm">
          Accepted add-backs <MoneyFigure figure={deal.acceptedTotal} />
        </p>
        <p className="text-sm">
          Rejected or cut <MoneyFigure figure={deal.rejectedTotal} />
        </p>
        <p className="text-sm">
          Seller total from the lines <MoneyFigure figure={deal.managementAdjusted} />
        </p>
      </section>

      <section data-testid="so-what" className="flex flex-col gap-4 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold">So what for the price</h2>
        <p className="max-w-3xl text-sm leading-6 text-neutral-700">
          This is arithmetic on the gap. It is not a purchase price, not a valuation, and not a reason to
          change the bridge.
        </p>
        {deal.multipleRaw && deal.overpay && deal.priceOnClaimed && deal.priceOnSupportedHigh ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <HeroStat label={`Overpay at ${deal.multipleRaw}×`}>
              <MoneyFigure figure={deal.overpay} emphasize />
            </HeroStat>
            <HeroStat label="On the seller total">
              <MoneyFigure figure={deal.priceOnClaimed} emphasize />
            </HeroStat>
            <HeroStat label="On documents-supported earnings">
              <MoneyFigure figure={deal.priceOnSupportedHigh} emphasize />
              {deal.priceOnSupportedLow && deal.supportedLow.cents !== deal.supportedHigh.cents ? (
                <span className="mt-2 block text-sm">
                  Low end <MoneyFigure figure={deal.priceOnSupportedLow} />
                </span>
              ) : null}
            </HeroStat>
          </div>
        ) : (
          <p className="text-sm text-neutral-700">
            No multiple was entered, so overpay is not calculated and no price is implied. The multiple is
            never filled in on its own.
          </p>
        )}
      </section>

      {deal.lender ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">So what for financing</h2>
          <p className="max-w-3xl text-sm leading-6 text-neutral-700">{deal.lender.note}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <LenderCard title="On the seller total" item={deal.lender.claimed} />
            <LenderCard title="On documents-supported earnings" item={deal.lender.supported} />
          </div>
          <p className="text-sm text-neutral-600">
            Illustrative SBA 7(a) sizing only. Not a commitment to lend. The earnings gap changes the
            estimate; it does not approve or decline a loan.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cited closings, not comps</h2>
        <p className="max-w-3xl text-sm leading-6 text-neutral-700">{THIN_SET_NOTE}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Acquirer
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Target
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Disclosed value
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {CITED_DEALS.map((dealRow) => (
                <tr key={dealRow.citation} className="border-b border-neutral-100 align-top">
                  <td className="py-2 pr-3 tabular-nums">{dealRow.date}</td>
                  <td className="py-2 pr-3">{dealRow.acquirer}</td>
                  <td className="py-2 pr-3">
                    {dealRow.target}
                    <span className="mt-1 block text-xs text-neutral-500">
                      {dealRow.industry} · {dealRow.band}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{dealRow.disclosed}</td>
                  <td className="py-2 pr-3">
                    <a className="underline" href={dealRow.citation} target="_blank" rel="noreferrer">
                      Cited filing or release
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="border-t border-neutral-200 pt-4 text-sm leading-6 text-neutral-700">{DISCLAIMER}</p>
    </div>
  );
}

function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function LineGroup({ title, lines, empty }: { title: string; lines: DealLine[]; empty: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {lines.length === 0 ? <p className="text-sm text-neutral-600">{empty}</p> : null}
      {lines.map((line) => (
        <article
          key={line.id}
          className={
            line.classification === 'accepted'
              ? 'rounded-md border border-neutral-200 p-4'
              : 'rounded-md border border-red-200 bg-red-50 p-4'
          }
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">{line.description}</h3>
            <span className="text-sm font-medium">
              {line.classification === 'accepted'
                ? 'Accepted'
                : line.classification === 'rejected'
                  ? 'Rejected'
                  : 'Cut'}
            </span>
          </div>
          {line.years.length > 0 ? (
            <p className="mt-1 text-xs text-neutral-500">Years: {line.years.join(', ')}</p>
          ) : null}
          {line.role ? <p className="mt-1 text-xs text-neutral-500">Role: {line.role}</p> : null}
          <p className="mt-3 text-sm">
            Seller add-back <MoneyFigure figure={line.management} />
          </p>
          <p className="mt-1 text-sm">
            Counted <MoneyFigure figure={line.countedHigh} />
            {line.qoeLowCents !== line.qoeHighCents ? (
              <span className="mt-1 block">
                Low end <MoneyFigure figure={line.countedLow} />
              </span>
            ) : null}
          </p>
          <p className="mt-3 text-sm leading-6">{line.rationale}</p>
          {line.question ? (
            <p
              data-testid={line.id === 'mower' ? 'mower-question' : undefined}
              className="mt-3 rounded-md bg-white px-3 py-2 text-sm leading-6"
            >
              <span className="font-medium">Ask the seller. </span>
              {line.question}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function LenderCard({ title, item }: { title: string; item: LenderCase }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4 text-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2">
        Earnings <MoneyFigure figure={item.earnings} />
      </p>
      <p className="mt-2">
        Replacement wage subtracted <MoneyFigure figure={item.wage} />
      </p>
      <p className="mt-2">
        Cash flow used in the estimate <MoneyFigure figure={item.cashFlow} />
      </p>
      {item.price ? (
        <p className="mt-2">
          Illustrative max price <MoneyFigure figure={item.price} />
          {item.dscrText ? (
            <span className="mt-1 block text-neutral-600">
              DSCR at that price: {item.dscrText} (calculated).
            </span>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-neutral-700">No price. Engine status: {item.status}.</p>
      )}
      {item.stressedPrice ? (
        <p className="mt-2">
          At +250 bp <MoneyFigure figure={item.stressedPrice} />
        </p>
      ) : null}
    </div>
  );
}
