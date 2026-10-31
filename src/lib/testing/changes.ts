// The "developer changed the app" simulator. Each entry mutates the demo
// shop config the way a real pull request would, so previously generated
// tests break and the self-healing engine must repair them.

import type { DemoConfig, DemoElement } from "./types";

export interface AppChange {
  id: string;
  title: string;
  developerNote: string;
  apply: (elements: DemoElement[]) => void;
  describe: (elements: DemoElement[]) => string;
}

export const APP_CHANGES: AppChange[] = [
  {
    id: "change-login-id",
    title: "Login button id changed",
    developerNote: "PR #482 — renamed id login-btn → submit-login for clarity",
    apply: (els) => {
      const el = els.find((e) => e.key === "login_btn");
      if (el) el.id = "submit-login";
    },
    describe: (els) => {
      const el = els.find((e) => e.key === "login_btn");
      return `Login button id is now "${el?.id ?? "?"}" (label "Sign In" unchanged)`;
    },
  },
  {
    id: "change-checkout-label",
    title: "Checkout button label changed",
    developerNote: "PR #490 — UX copy update: 'Proceed to Checkout' → 'Go to Checkout'",
    apply: (els) => {
      const el = els.find((e) => e.key === "checkout_btn");
      if (el) el.label = "Go to Checkout";
    },
    describe: (els) => {
      const el = els.find((e) => e.key === "checkout_btn");
      return `Checkout button now reads "${el?.label ?? "?"}" (id unchanged)`;
    },
  },
  {
    id: "change-checkout-id",
    title: "Checkout button id changed",
    developerNote: "PR #495 — checkout-btn → checkout-confirm after QA feedback",
    apply: (els) => {
      const el = els.find((e) => e.key === "checkout_btn");
      if (el) el.id = "checkout-confirm";
    },
    describe: (els) => {
      const el = els.find((e) => e.key === "checkout_btn");
      return `Checkout button id is now "${el?.id ?? "?"}" (label unchanged)`;
    },
  },
];

export function nextVersionLabel(current: string): string {
  const m = current.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return "v1.0.1";
  const patch = Number(m[3]) + 1;
  return `v${m[1]}.${m[2]}.${patch}`;
}

export function applyChangeToConfig(
  config: DemoConfig,
  changeId: string,
): { versionLabel: string; description: string } {
  const change = APP_CHANGES.find((c) => c.id === changeId);
  if (!change) throw new Error(`Unknown change: ${changeId}`);
  const elements = config.elements.map((e) => ({ ...e }));
  change.apply(elements);
  const versionLabel = nextVersionLabel(config.versionLabel);
  const description = `${change.title}. ${change.developerNote} → ${change.describe(elements)} (demo shop ${versionLabel})`;
  config.elements = elements;
  config.versionLabel = versionLabel;
  return { versionLabel, description };
}

export function resetConfig(config: DemoConfig): DemoConfig {
  return { ...config, versionLabel: "v1.0.0", chaosMode: false };
}
