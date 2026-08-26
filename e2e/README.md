# Playwright E2E — rabbit-web

Browser end-to-end tests for the shop flow (login → catalog → order →
payment), split by outcome:

```
e2e/
  happy/all-success.spec.ts     # everything succeeds: card payment → paid
  failed/fail-paid-cod.spec.ts  # COD is declined (402) → pending → retry with card → paid
  flows/all-users.spec.ts       # 11 users × full journey, screenshots → custom report
  data/users.ts                 # the 11-user matrix (user_001–005 qa · bob/alice admin · 033–066 member)
  reporters/flow-reporter.ts    # distills a flows run into e2e/report/flow-report.json
  report/build-report.mjs       # renders that JSON → e2e-report/index.html (single file)
  support/helpers.ts            # login / buy / submit-payment / order-row helpers
```

## Canary flow report (11 users)

`npm run test:e2e:canary` walks the shopper journey — landing → login →
shop → buy → checkout → card → **payment result** (the flow ends on that
page) — once per user in `data/users.ts`, five screenshots per user, then
builds `e2e-report/index.html`: one card per user with a prominent role
badge, per-step pass pills, and the five screenshots inline in a single
filmstrip (click any screenshot to zoom). All images are base64-embedded,
so the single file opens offline anywhere.

The deploy marker each landing page served is still captured per user in
`e2e/report/flow-report.json` (useful when analyzing a run), it is just
not rendered in the report.

Role labels are not decorative either — every test asserts the role
returned by `/api/auth/me` against the matrix, so a mislabeled user
fails the run instead of the report.

The two flows are deterministic by design — `card` always succeeds and
`cod` is always declined by the mock gateway — so no sleeps or retries
are needed to keep either spec stable. The happy specs log in as `alice`,
the failed specs as `bob`, so the two suites never read each other's
rows in the shared order table.

## Prerequisites

The tests drive a running stack; they never start one.

**kind cluster (default target)** — bring the whole shop up, served by
Traefik at `https://localhost` with an mkcert local CA cert (the config
sets `ignoreHTTPSErrors` for exactly this):

```bash
cd ../rabbit-k8s-assignment
make up
```

**local dev** — `npm run dev` in this repo with the BFF pointed at
reachable backends (e.g. port-forwards into the cluster):

```bash
AUTH_URL=... CATALOG_URL=... ORDER_URL=... npm run dev
```

## Run

```bash
npm run test:e2e         # against https://localhost (kind cluster)
npm run test:e2e:local   # against http://localhost:3000 (npm run dev)
npm run test:e2e:canary  # 11-user canary flow run → custom report → opens it
npm run test:e2e:report  # open the HTML report from the last run
```

Any other target: `BASE_URL=https://shop.example.com npx playwright test`.

## Notes

- Specs create real orders in MariaDB; runs are sequential (`workers: 1`)
  so shared state never makes a run flake.
- The order id is learned from the `/pay?order_id=…` redirect — the specs
  never assume an id, so reruns against a used database just work.
- Traces, screenshots, and video are kept for failures under
  `test-results/`; the report lands in `playwright-report/` (both gitignored).
