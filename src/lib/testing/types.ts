// SentinelQA test DSL — the JSON contract shared by AI generation, the
// execution engine, the self-healing resolver and the report.

export type LocatorType = "css" | "id" | "role" | "text";

export interface Locator {
  type: LocatorType;
  css?: string;
  id?: string;
  role?: string;
  name?: string;
  text?: string;
  /** 0-based index among matches, defaults to the first match */
  nth?: number;
}

export type StepAction =
  | "goto"
  | "click"
  | "fill"
  | "expectVisible"
  | "expectText";

export interface TestStep {
  action: StepAction;
  /** Target locator; omitted for `goto` */
  target?: Locator;
  /** Value for `fill`, page path for `goto`, expected text for `expectText` */
  value?: string;
  description: string;
}

export interface TestCase {
  id: string;
  name: string;
  steps: TestStep[];
  version: number;
  generatedBy?: string;
}

export interface StepOutcome {
  step: number;
  description: string;
  action: StepAction;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface Attempt {
  index: number;
  passed: boolean;
  steps: StepOutcome[];
  error?: string;
  durationMs: number;
  /** Step indexes repaired before this attempt ran */
  repairedSteps?: number[];
}

export interface RepairCandidate {
  name?: string;
  id?: string;
  role?: string;
  score: number;
}

export interface RepairEntry {
  stepIndex: number;
  stepDescription: string;
  before: Locator;
  after: Locator;
  reason: string;
  confidence: number;
  candidates: RepairCandidate[];
}

export type ResultStatus = "passed" | "failed" | "repaired" | "flaky";

export interface VisualCheck {
  status: "baseline_created" | "compared" | "unavailable";
  before?: string;
  after?: string;
  diff?: string;
  changedPixelRatio?: number;
  fingerprintChanges?: string[];
}

export interface RunResult {
  testId: string;
  testName: string;
  status: ResultStatus;
  attempts: Attempt[];
  repairLog: RepairEntry[];
  visual?: VisualCheck;
  durationMs: number;
}

export interface RunSummary {
  runId: string;
  mode: string;
  appVersion: string;
  totalTests: number;
  passed: number;
  failed: number;
  repaired: number;
  flakyCount: number;
}

export interface DemoElement {
  key: string;
  type: "textbox" | "button" | "link" | "text";
  id: string;
  label: string;
  page: string;
}

export interface DemoConfig {
  versionLabel: string;
  chaosMode: boolean;
  pages: { path: string; name: string }[];
  elements: DemoElement[];
  testAccount: { email: string; password: string };
}

export function describeLocator(loc: Locator): string {
  switch (loc.type) {
    case "css":
      return `css selector "${loc.css ?? ""}"`;
    case "id":
      return `element with id "${loc.id ?? ""}"`;
    case "role":
      return `${loc.role ?? "element"} named "${loc.name ?? ""}"`;
    case "text":
      return `element containing text "${loc.text ?? ""}"`;
  }
}

export function isLocatorAction(action: StepAction): boolean {
  return action !== "goto";
}
