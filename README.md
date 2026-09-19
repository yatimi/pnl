# pnl.

A private profit and loss journal with a public demo, daily entries, calendar, charts, monthly statistics, and PNG share cards. English and Russian UI, light/dark themes, and USD/EUR/UAH currencies.

## Live site

- Website: [pnl-xi.vercel.app](https://pnl-xi.vercel.app)
- Public demo: [pnl-xi.vercel.app/demo](https://pnl-xi.vercel.app/demo)

Deployment verified on September 11, 2026: the sign-in page and demo are publicly accessible, NBP exchange rates load, and anonymous journal API requests return HTTP 401. GitHub sign-in is configured and the site owner confirmed successful login. End-to-end record persistence and two-account isolation checks on the hosted service remain pending. Google, Apple, and email sign-in are not available in the app.

## Runtime

The public version runs on standard Next.js on Vercel, with Supabase Auth and PostgreSQL. GitHub OAuth sign-in, secure callbacks, and sign-out use the official Supabase SDK. Journal routes verify the session with Supabase; client-supplied identity headers are ignored. Database row-level policies independently restrict all reads and writes to the signed-in owner. No service-role key is used by the application.

Amounts are stored as integer minor units in their original currency. New entries default to USD. The display currency converts each record with the latest NBP (National Bank of Poland) table A rates, rounded once to minor units. Historical totals are current-rate estimates, not historical FX accounting. The rate date and source appear in the journal and converted share cards. Missing rates do not invent values: original records remain accessible, and totals needing conversion are hidden. Trading statistics exclude salary and other income.

`/demo` is public and temporary; it never writes sample data to the database. Authenticated journals are private. Language, theme, and display currency preferences are device-local.

## Local development

Requires Node.js 22.13+.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key. Never put a service-role key in a `NEXT_PUBLIC_` variable.
3. Apply `supabase/migrations/202609110001_journal.sql` once to a new Supabase project.
4. Run `npm run dev`; open http://localhost:3000.

Without Supabase configuration, the public demo remains available and sign-in is explicitly unavailable. The app never enables a development authentication bypass.

## Vercel release setup

- Create a Supabase project in an EU region. Apply the migration before release.
- Create a GitHub OAuth App with only profile/email access. Set its callback to the Supabase project callback URL, and configure its client ID/secret in Supabase Auth → GitHub. Disable unused email/password signup. No SMTP service is required.
- Set the Supabase Auth site URL to the final HTTPS Vercel/custom domain. Allow that exact site's `/auth/callback` plus localhost only for local development. Use a separate test project for previews rather than broad production redirect wildcards.
- Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel before building. `vercel.json` selects Next.js and Frankfurt execution.
- Test real GitHub sign-in, sign-out, and CRUD from two separate accounts before public launch. The code and CI tests cannot verify SMTP delivery or remote project settings.

The previous Sites deployment remains a separate legacy service. `.openai/hosting.json`, `drizzle/`, `db/schema.ts`, `drizzle.config.ts`, and the unused Sites build scripts preserve its identity and migration history; they are not used by the Next.js runtime. Do not deploy this Next.js release archive through the old Sites pipeline. Existing Sites user IDs must be mapped explicitly to verified new Supabase accounts when transferring records; never infer ownership from a submitted email or identifier. The old database must be retained until transfer is verified.

## Validation

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs
python3 tests/migration_test.py
npm run build
npm start -- --port 8787
python3 tests/api_smoke.py http://localhost:8787
```

CI also runs `tests/rls.sql` against an isolated PostgreSQL database to verify owner isolation, anonymous denial, immutable ownership, and monetary constraints. Never run that test fixture against production.

## Branches and releases

Feature branches target `develop`. Wait for `Validate journal`, then merge with a merge commit. Release with a separate `develop` → `main` pull request, preserving `develop`. Coordinate that merge with a verified Vercel deployment; a GitHub merge alone is not evidence of deployment. Delete completed feature branches after confirming their changes were merged.

## Attribution

Author: Tommy. Pixelify Sans uses the SIL Open Font License; see `public/pixelify-license.txt`. Demo entries reproduce the supplied August–September 2026 calendars (42 entries), treating the source USDT amounts as USD 1:1 before display conversion. Share cards omit notes and account details; monthly cards contain trading PnL only.

## Periods and market overview

The journal supports Monday–Sunday weeks, months, calendar years, all history, and inclusive custom ranges. The chart, statistics, entry list, and PNG share card use the selected range. Profitable-day percentage includes logged breakeven days in its denominator; it is not a trade win rate. Calendar weekly totals include only the selected days visible in that month. On mobile, totals appear beneath each week. All-history reads remain paginated and restricted to the authenticated owner.

The optional Market panel shows up to five gainers or losers among active Binance spot USDT pairs with at least 1,000,000 USDT in rolling 24-hour quote volume. It loads only while expanded and refreshes every minute. Public data comes from data-api.binance.vision without an API key. Snapshots are cached for one minute, exchange metadata for an hour; failed refreshes show an error and label any retained client snapshot as potentially outdated. Market prices retain sub-cent precision separately from journal amounts, which remain integer cents.
