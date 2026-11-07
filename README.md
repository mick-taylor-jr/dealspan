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

Deal data comes from the DealSpan comparable deals workbook (76 deals, Deals tab). Math is deterministic TypeScript in `lib/` (`model.ts`, `comps.ts`, `financing.ts`, `fit.ts`, `assumptions.ts`). No API keys or environment
variables. Inputs are kept in the browser’s local storage only.

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## AI precedent search (optional)

Set `ANTHROPIC_API_KEY` in Vercel (Settings → Environment Variables) to let the Precedents tab ask Claude, with web
search, for more comparable sales. The key stays on the server (`app/api/precedents`). A sale is kept only if its source
link came back in the search results and it lists both a price and an EBITDA; kept sales are scored with the same 1–100
rules and marked "Found by AI". Without the key the app uses the 76-deal workbook only. `DEALSPAN_AI_MODEL` overrides the
model (default `claude-sonnet-5-5`).
