import fs from "node:fs";
import path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

// Companion reporter for e2e/flows — it only knows how to distill a run into
// e2e/report/flow-report.json for build-report.mjs. It is wired in per-run
// (`npm run test:e2e:canary`), never in playwright.config.ts, so running the
// other suites never clobbers a flow report with unrelated tests.
const REPORT_FILE = path.resolve(__dirname, "../report/flow-report.json");

const FLOW_STEPS = ["landing", "login", "shop", "buy", "pay", "result"];

interface StepRecord {
  name: string;
  ok: boolean;
  durationMs: number;
}

interface ShotRecord {
  name: string;
  path: string;
}

interface UserRecord {
  index: number;
  user: string;
  expectedRole: string;
  role: string | null;
  deployMarker: string | null;
  orderId: number | null;
  status: string;
  durationMs: number;
  error: string | null;
  steps: StepRecord[];
  shots: ShotRecord[];
}

interface FlowReport {
  baseURL: string;
  startedAt: string;
  durationMs: number;
  users: UserRecord[];
}

function annotation(test: TestCase, type: string): string | null {
  return test.annotations.find((a) => a.type === type)?.description ?? null;
}

export default class FlowReporter implements Reporter {
  private startedAt = Date.now();
  private baseURL = process.env.BASE_URL ?? "https://localhost";
  private users: UserRecord[] = [];
  private total = 0;
  private done = 0;

  onBegin(config: FullConfig, suite: Suite): void {
    this.startedAt = Date.now();
    // FullConfig's typing of use options is loose here; anything missing
    // falls back to the same default playwright.config.ts uses.
    const fromConfig = (config as { use?: { baseURL?: string } }).use
      ?.baseURL;
    if (fromConfig) this.baseURL = fromConfig;
    this.total = suite.allTests().length;
    this.done = 0;
    process.stdout.write(
      `\nrabbit-web canary flow · ${this.baseURL}\n` +
        `running ${this.total} user flows (sequential, ~3s each)…\n\n`
    );
  }

  // One line per finished user keeps the terminal alive during the run —
  // the alternative (silence until onEnd) reads as a hang on a ~40s suite.
  private progress(test: TestCase, result: TestResult): void {
    this.done += 1;
    const user = annotation(test, "user") ?? test.title;
    const role = annotation(test, "expectedRole") ?? "?";
    const ok = result.status === "passed";
    const mark = ok ? GREEN + "✓" + RESET : RED + "✗" + RESET;
    process.stdout.write(
      `  ${mark} [${this.done}/${this.total}] ${user} (${role}) — ${(result.duration / 1000).toFixed(1)}s\n`
    );
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.progress(test, result);
    const user = annotation(test, "user") ?? test.title;
    const steps: StepRecord[] = [];
    const walk = (list: TestResult["steps"]): void => {
      for (const step of list) {
        if (FLOW_STEPS.includes(step.title)) {
          steps.push({
            name: step.title,
            ok: !step.error,
            durationMs: Math.round(step.duration),
          });
        }
        if (step.steps.length > 0) walk(step.steps);
      }
    };
    walk(result.steps);

    const orderId = annotation(test, "orderId");
    this.users.push({
      index: Number(annotation(test, "index") ?? "999"),
      user,
      expectedRole: annotation(test, "expectedRole") ?? "?",
      role: annotation(test, "role"),
      deployMarker: annotation(test, "deployMarker"),
      orderId: orderId !== null ? Number(orderId) : null,
      status: result.status,
      durationMs: Math.round(result.duration),
      error:
        result.error?.message?.split("\n").slice(0, 6).join("\n") ?? null,
      steps,
      shots: result.attachments
        .filter((a) => a.path && a.contentType === "image/png")
        .map((a) => ({ name: a.name!, path: a.path! })),
    });
  }

  onEnd(result: FullResult): void {
    const report: FlowReport = {
      baseURL: this.baseURL,
      startedAt: new Date(this.startedAt).toISOString(),
      durationMs: Date.now() - this.startedAt,
      users: this.users.sort((a, b) => a.index - b.index),
    };
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    const passed = report.users.filter((u) => u.status === "passed").length;
    const runMark = result.status === "passed" ? GREEN : RED;
    process.stdout.write(
      `\n${runMark}${passed}/${report.users.length} users passed${RESET} · ${(
        report.durationMs / 1000
      ).toFixed(1)}s total\n` +
        `flow data → ${path.relative(process.cwd(), REPORT_FILE)}\n`
    );
  }
}
