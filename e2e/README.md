# Playwright E2E — rabbit-web

Browser end-to-end tests for the shop flow (login → catalog → order →
payment), split by outcome:

```
e2e/
  happy/all-success.spec.ts     # everything succeeds: card payment → paid
  failed/fail-paid-cod.spec.ts  # COD is declined (402) → pending → retry with card → paid
  support/helpers.ts            # login / buy / submit-payment / order-row helpers
```

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
