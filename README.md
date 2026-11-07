# Dealspan

A buyer enters **two companies**: their own (the acquirer) and the company they want to buy (the target). Every number
is entered once, on the intake page. The results workspace then builds, with no further inputs:

- **Overview**: verdict, a football field of value ranges (comps, DCF, LBO, DCF plus synergies) against your offer
  and the asking price, and an earnings check (seller-claimed vs supported EBITDA).
- **Fit**: both company profiles, a qualitative fit scorecard, the deal thesis and questions for the seller.
- **Synergies**: each cost and revenue synergy before and after haircuts, phase-in, value at your multiple.
- **DCF**: five-year unlevered free cash flow, WACC build-up, perpetuity and exit-multiple terminal values,
  WACC × growth sensitivity.
- **LBO**: sources and uses, cash sweep debt paydown, IRR / MOIC, debt coverage, most you can pay for your target
  return, entry × exit sensitivity.
- **Financing**: SBA 7(a) loan and buyer cash at your offer and at the good, average and bad prices and buyer cash under SOP 50 10 8.1 (coverage, 10% equity, $5M cap), each number sourced.
- **Deal prices**: good, average and bad prices (the average of the standalone methods’ low ends, midpoints and high ends) shown on the football field and financed side by side with your offer.
- **Precedents**: every sale in the target’s industry charted as price ÷ profit, with details and source links.
- **Combined**: buyer + target + phased synergies, leverage before and after, cash left after the equity check.

Tax is 21%. Every other assumption is listed on screen and labeled `assumed`. The demo button loads two
hypothetical companies (Northline Grounds Co. buying Greenridge Landscape Co.); neither is real.

Deal data comes from the DealSpan comparable deals workbook (76 deals, Deals tab). Math is deterministic TypeScript in `lib/` (`model.ts`, `comps.ts`, `financing.ts`, `fit.ts`, `assumptions.ts`). Inputs are kept in the browser tab’s session storage only.

## Start from a document (optional, uses Claude)

The intake page can read a broker listing, teaser, CIM or P&L about the target and fill its blank fields. Claude only
copies values the document states, each with the quote (and page) it came from, and the user checks every one before
running. Rules, enforced in `lib/extract.ts` and its tests:

- Only the target is filled, and only fields that are blank. Anything the user typed is kept and the difference listed.
- Reported EBITDA (before add-backs) can fill the three-year table; adjusted EBITDA only fills "EBITDA the seller
  claims"; SDE fills nothing.
- No calculating or estimating. Values without a quote, unknown fields and out-of-range numbers are dropped.
- The math never comes from AI. Every model still runs on the deterministic code above.

The document is sent to Anthropic for that one request and not stored. The feature is hidden unless
`ANTHROPIC_API_KEY` is set. Copy `.env.example` to `.env.local` for local work (each teammate uses their own key).
On Vercel, set the variables under Project → Settings → Environment Variables:

| Variable                  | Needed | What it does                                                                                |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`       | yes    | Turns the feature on. Server-only; never prefix with `NEXT_PUBLIC_`.                        |
| `DEALSPAN_AI_MODEL`       | no     | Defaults to `claude-haiku-5-5`. `claude-sonnet-5-5` reads messy CIMs better and costs more. |
| `DEALSPAN_AI_ACCESS_CODE` | no     | If set, users must enter it before importing, so strangers can’t spend the credits.         |

Set a monthly spend limit in the Anthropic Console as well; the built-in rate limit (12 imports per hour per IP) is
best-effort.

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
