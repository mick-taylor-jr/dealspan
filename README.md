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
- **Comps**: Damodaran January 2026 public EV/EBITDA for the target’s sector, size-discounted (never applied raw).
- **Precedents**: eight cited small closed deals, filtered to the target’s industry.
- **Combined**: buyer + target + phased synergies, leverage before and after, cash left after the equity check.

Tax is 21%. Every other assumption is listed on screen and labeled `assumed`. The demo button loads two
hypothetical companies (Northline Grounds Co. buying Greenridge Landscape Co.); neither is real.

Math is deterministic TypeScript in `lib/` (`model.ts`, `fit.ts`, `assumptions.ts`). No API keys or environment
variables. Inputs are kept in the browser’s local storage only.

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
