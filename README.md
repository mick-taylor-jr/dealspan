# Dealspan

Buyer earnings bridge for a small acquisition. The buyer types the seller’s claimed earnings, the add-backs, and the proof they have (P&L, tax return, bank deposits). The screen then shows what the seller says, what the documents support, and why each line was accepted, rejected, or cut.

This is a discussion aid for a searcher or lender. It is not a formal quality-of-earnings report, not a valuation opinion, and not a credit decision or commitment to lend.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- ESLint
- pnpm

Money math is deterministic TypeScript in integer cents. There is no LLM, no API key, and no environment variable.

## Run locally

Requires Node.js 22 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and choose **Load Greenridge Landscape Co. example**. That case is a labeled hypothetical, not a real company. Files attached in the browser stay in the tab and are not uploaded.

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Deploy

Import this GitHub repository in Vercel. Next.js is detected automatically. No environment variables are required.
