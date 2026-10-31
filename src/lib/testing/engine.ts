// In-browser test execution engine.
//
// Drives a same-origin iframe that hosts the demo shop: resolves locators
// against the live DOM, clicks/fills/asserts, and reruns the script after a
// successful self-heal. Mirrors the Playwright loop (action → wait → retry)
// so results read naturally to QA engineers.

import {
  describeLocator,
  isLocatorAction,
  type Attempt,
  type Locator,
  type RepairEntry,
  type StepOutcome,
  type TestCase,
  type TestStep,
} from "./types";
import { computedRole, accessibleName, healLocator } from "./healer";

const POLL_MS = 100;
const DEFAULT_TIMEOUT_MS = 4000;

export function resolveLocator(doc: Document, loc: Locator): Element[] {
  switch (loc.type) {
    case "css": {
      if (!loc.css) return [];
      try {
        return Array.from(doc.querySelectorAll(loc.css));
      } catch {
        return [];
      }
    }
    case "id": {
      if (!loc.id) return [];
      const el = doc.getElementById(loc.id);
      return el ? [el] : [];
    }
    case "role": {
      const role = (loc.role ?? "").toLowerCase();
      const name = (loc.name ?? "").trim().toLowerCase();
      const all = Array.from(
        doc.querySelectorAll("button, a, input, textarea, select, [role]"),
      );
      const byRole = all.filter((el) => computedRole(el) === role);
      if (!name) return byRole;
      const named = byRole.filter((el) => {
        const n = accessibleName(el).toLowerCase();
        if (!n) return false;
        if (n === name) return true;
        if (name.length >= 4 && n.includes(name)) return true;
        if (n.length >= 4 && name.includes(n)) return true;
        return false;
      });
      return named;
    }
    case "text": {
      const t = (loc.text ?? "").trim().toLowerCase();
      if (!t) return [];
      return Array.from(doc.querySelectorAll("*")).filter((el) => {
        const own = (el as HTMLElement).innerText ?? el.textContent ?? "";
        return own.toLowerCase().includes(t);
      });
    }
  }
}

function isVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  if (htmlEl.getClientRects().length === 0) return false;
  const style = htmlEl.ownerDocument.defaultView?.getComputedStyle(htmlEl);
  return !!style && style.visibility !== "hidden" && style.display !== "none";
}

async function waitForElement(
  doc: Document,
  loc: Locator,
  timeoutMs: number,
): Promise<Element | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const matches = resolveLocator(doc, loc);
    const el = matches[loc.nth ?? 0];
    if (el) return el;
    if (Date.now() >= deadline) return null;
    await sleep(POLL_MS);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setInputValue(el: Element, value: string) {
  const input = el as HTMLInputElement;
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function runStep(
  doc: Document,
  step: TestStep,
  timeoutMs: number,
): Promise<StepOutcome> {
  const started = Date.now();
  const base = { step: 0, description: step.description, action: step.action };
  const fail = (error: string): StepOutcome => ({
    ...base,
    passed: false,
    error,
    durationMs: Date.now() - started,
  });
  const pass = (): StepOutcome => ({
    ...base,
    passed: true,
    durationMs: Date.now() - started,
  });

  switch (step.action) {
    case "goto": {
      const hash = step.value ?? "#/";
      const view = doc.defaultView;
      if (!view) return fail("Page frame is not available");
      if (view.location.hash !== hash) view.location.hash = hash;
      await sleep(450); // let the demo app render the new page
      return pass();
    }
    case "click": {
      if (!step.target) return fail("Step has no target locator");
      const el = await waitForElement(doc, step.target, timeoutMs);
      if (!el)
        return fail(`Element not found: ${describeLocator(step.target)}`);
      (el as HTMLElement).click();
      await sleep(350);
      return pass();
    }
    case "fill": {
      if (!step.target) return fail("Step has no target locator");
      const el = await waitForElement(doc, step.target, timeoutMs);
      if (!el)
        return fail(`Element not found: ${describeLocator(step.target)}`);
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement))
        return fail(`Target is not a text input: ${describeLocator(step.target)}`);
      setInputValue(el, step.value ?? "");
      await sleep(150);
      return pass();
    }
    case "expectVisible": {
      if (!step.target) return fail("Step has no target locator");
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const el = await waitForElement(doc, step.target, 0);
        if (el && isVisible(el)) return pass();
        if (Date.now() >= deadline)
          return fail(
            el
              ? `Element exists but is not visible: ${describeLocator(step.target)}`
              : `Element not found: ${describeLocator(step.target)}`,
          );
        await sleep(POLL_MS);
      }
    }
    case "expectText": {
      if (!step.target) return fail("Step has no target locator");
      const expected = (step.value ?? "").trim().toLowerCase();
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const el = await waitForElement(doc, step.target, 0);
        const text = (el?.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        if (el && text.includes(expected)) return pass();
        if (Date.now() >= deadline)
          return fail(
            el
              ? `Expected "${step.value}" in ${describeLocator(step.target)} but found "${text || "(empty)"}"`
              : `Element not found: ${describeLocator(step.target)}`,
          );
        await sleep(POLL_MS);
      }
    }
  }
}

export interface TestRunOutcome {
  attempts: Attempt[];
  repairLog: RepairEntry[];
  repairedSteps: number[];
  status: "passed" | "failed";
  steps: TestStep[]; // possibly healed script
}

export interface RunTestOptions {
  timeoutMs?: number;
  healingEnabled: boolean;
  maxAttempts?: number;
  onProgress?: (message: string) => void;
}

/**
 * Run one test case against the document. With healing enabled, a locator
 * failure triggers the healer, the script is patched and the whole test is
 * rerun (up to maxAttempts total).
 */
export async function runTestInDocument(
  doc: Document,
  test: TestCase,
  options: RunTestOptions,
): Promise<TestRunOutcome> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? (options.healingEnabled ? 3 : 1);
  const attempts: Attempt[] = [];
  const repairLog: RepairEntry[] = [];
  const repairedSteps: number[] = [];
  const steps = test.steps.map((s) => ({ ...s, target: s.target ? { ...s.target } : undefined }));

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex++) {
    const stepOutcomes: StepOutcome[] = [];
    const repairedBefore: number[] = [];
    let failure: { error: string } | undefined;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      options.onProgress?.(
        `Attempt ${attemptIndex + 1} · ${step.description}`,
      );
      const outcome = await runStep(doc, step, timeoutMs);
      outcome.step = i;
      stepOutcomes.push(outcome);
      if (!outcome.passed) {
        failure = { error: outcome.error ?? "Step failed" };
        if (
          options.healingEnabled &&
          step.target &&
          isLocatorAction(step.action)
        ) {
          const heal = healLocator(doc, step.target);
          if (heal) {
            steps[i] = { ...step, target: heal.after };
            repairLog.push({
              stepIndex: i,
              stepDescription: step.description,
              before: step.target,
              after: heal.after,
              reason: heal.reason,
              confidence: heal.confidence,
              candidates: heal.candidates,
            });
            repairedSteps.push(i);
            repairedBefore.push(i);
          }
        }
        break;
      }
    }

    const passed = !failure;
    attempts.push({
      index: attemptIndex,
      passed,
      steps: stepOutcomes,
      error: failure?.error,
      durationMs: stepOutcomes.reduce((sum, s) => sum + s.durationMs, 0),
      repairedSteps: repairedBefore.length ? repairedBefore : undefined,
    });

    if (passed) break;
    // Only rerun when the last attempt produced a repair; otherwise the
    // failure is not locator-related and retrying cannot help.
    if (!repairedBefore.length) break;
  }

  const status: "passed" | "failed" = attempts[attempts.length - 1].passed
    ? "passed"
    : "failed";
  return { attempts, repairLog, repairedSteps, status, steps };
}

/** Reset the demo app to a clean session before a run. */
export async function reloadDemoApp(iframe: HTMLIFrameElement): Promise<Document> {
  const fresh = `/demo-shop?session=${Date.now()}`;
  const loaded = new Promise<void>((resolve) => {
    const onLoad = () => {
      iframe.removeEventListener("load", onLoad);
      resolve();
    };
    iframe.addEventListener("load", onLoad);
  });
  // eslint-disable-next-line no-self-assign
  iframe.src = fresh;
  await loaded;
  await sleep(600);
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("Demo app frame did not load");
  return doc;
}
