# pnl.

A personal profit and loss journal with quick daily entries, a pixel-inspired interface, and light and dark themes.

## First release

- English and Russian interface languages, with a saved language preference.
- Daily trading PnL: an amount after fees and an optional note.
- Separate salary and other income entries that do not affect trading statistics.
- A calendar, cumulative PnL chart, twelve-month comparison, and entry list.
- Monthly summaries, profitable-day percentage, and maximum drawdown.
- Editing, confirmed deletion, and server-side storage.
- A separate journal for each authenticated user.
- A demo with sample data. Demo changes are temporary and never enter the personal journal.

All amounts are entered in USD and stored as integer cents. Currency conversion is not supported. Each date supports multiple entries, including multiple entries from the same source. Adding an entry creates a separate record; editing and deleting affect only the selected record. Daily totals sum all entries, while trading statistics exclude salary and other income. A zero trading result counts as a recorded day. The profitable-day percentage measures days, not individual trades. Drawdown starts from zero cumulative PnL at the beginning of the selected month. Comparisons use recorded data only; months may be incomplete.

Monthly summaries use deterministic calculations, without generative AI or forecasts. Exchange integrations, a mobile app, and AI analysis are potential future additions.

## Development

Built with React, TypeScript, Vinext, and Cloudflare D1. Interface primitives reuse the installed component library. The hosted first release uses ChatGPT sign-in and is private by default. Hosting outside Sites requires a trusted authentication layer: never trust `oai-authenticated-user-*` headers received directly from the public internet.

Requires Node.js 22.13 or later.

```sh
npm run install:ci
npm run build
```

Apply each pending migration to the local database once, in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_uneven_randall.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_complex_giant_girl.sql
npm run dev
```

The local development server uses a test identity supplied by the preview plugin. This behavior is limited to development. Production has no sign-in bypass; the server checks API access and scopes every database operation to the authenticated user. Journal entries are not stored in the browser; `localStorage` is used only for theme and language preferences.

Checks:

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs
python3 tests/migration_test.py
npm run build
```

To test the API against the local production server, run `npm start -- --port 8787`, followed by `python3 tests/api_smoke.py http://localhost:8787`. The script creates isolated test records and removes them after verification.

## Branches

- `main` holds the release intended for deployment.
- `develop` integrates completed work.
- `feature/<name>` holds an individual task before it is merged into `develop`.

Use short, descriptive commit subjects without prefixes such as `feat:`. Promote releases from `develop` to `main` after builds and checks pass.

## Design and attribution

Project author: Tommy. Developed with AI assistance. Source code and history are maintained in a private repository.

The calendar workflows in [TradeZella](https://www.tradezella.com/blog/pnl-calendar) and [Tradervue](https://www.tradervue.com/pnl-calendar) informed the research. The interface was implemented independently.

Pixelify Sans is distributed under the SIL Open Font License. A copy is included in `public/pixelify-license.txt`.

When supported by the browser, WebMCP exposes navigation to a selected month. It has not yet been validated in a supported browser context and is not required for ordinary use.

### Share cards

Use Share in the header to export the selected month’s trading PnL, or Share beside an entry to export that entry. Cards follow the current language and theme and download as 1200 × 1200 PNG images. Supported browsers can open the native share sheet; otherwise Share downloads the image. Demo cards are labeled. Notes, account details, and other income are excluded from monthly trading cards. Images are generated locally in the browser.

### Development workflow

1. Create a feature branch from the latest `develop`.
2. Open a pull request targeting `develop`. The `Validate journal` check runs TypeScript, calculation and translation tests, migration tests, the production build, and local API tests.
3. Merge the pull request with a merge commit once the checks pass, then delete the completed feature branch.
4. Release through a separate `develop` → `main` pull request. Keep `develop` after the merge. Coordinate the release with deployment; GitHub Actions currently validates changes and does not deploy the site.

Both `develop` and `main` also run checks after pushes. Until repository branch protection is available, following the pull request and passing-check policy is a maintainer responsibility.
