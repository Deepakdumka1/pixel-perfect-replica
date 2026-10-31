// Self-healing locator resolver.
//
// When a stored locator stops matching the live DOM (a developer renamed an
// id or a button label), we score every interactive element in the current
// document against the failed locator and repair the script when exactly one
// candidate stands out. Every repair is logged with its confidence and the
// runner-up scores so a human can audit it.

import { describeLocator, type Locator } from "./types";

export interface Candidate {
  tag: string;
  role: string;
  name: string;
  id: string;
  text: string;
}

export interface ScoredCandidate {
  candidate: Candidate;
  score: number;
}

export interface HealResult {
  after: Locator;
  confidence: number;
  reason: string;
  candidates: { name?: string; id?: string; role?: string; score: number }[];
}

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, [role], [id], h1, h2, h3";

export function computedRole(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit.toLowerCase();
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a") return "link";
  if (tag === "textarea") return "textbox";
  if (tag === "select") return "combobox";
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    if (type === "submit" || type === "button" || type === "reset")
      return "button";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    return "textbox";
  }
  if (tag === "h1" || tag === "h2" || tag === "h3") return "heading";
  return tag;
}

export function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") {
    const input = el as HTMLInputElement;
    const labelled = el.closest("label")?.textContent?.trim();
    const by = el.getAttribute("id")
      ? el.ownerDocument.querySelector(`label[for="${el.getAttribute("id")}"]`)
          ?.textContent?.trim()
      : undefined;
    return (
      input.placeholder?.trim() || by || labelled || input.value?.trim() || ""
    );
  }
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function collectCandidates(doc: Document): Candidate[] {
  const elements = Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR));
  const seen = new Set<Element>();
  const candidates: Candidate[] = [];
  for (const el of elements) {
    if (seen.has(el)) continue;
    seen.add(el);
    const name = accessibleName(el);
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!name && !el.id && !text) continue;
    candidates.push({
      tag: el.tagName.toLowerCase(),
      role: computedRole(el),
      name,
      id: el.id ?? "",
      text: text.slice(0, 160),
    });
  }
  return candidates;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return m || n;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** 0..1 similarity of two strings by edit distance */
function levRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / Math.max(a.length, b.length);
}

/** 0..1 Jaccard similarity of word tokens */
function tokenJaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

/**
 * Containment similarity: how much of the smaller token set appears in the
 * other. Catches "login-btn" → "submit-login" where Jaccard is too strict.
 */
function tokenContainment(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = new Set(tokenize(b));
  if (!ta.length || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.length, tb.size);
}

function idSim(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(
    levRatio(a, b),
    tokenContainment(a, b),
    tokenJaccard(a, b),
  );
}

function textSim(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(levRatio(a, b), tokenJaccard(a, b));
}

const ID_SUFFIX_TO_TAG: Record<string, string[]> = {
  btn: ["button"],
  button: ["button"],
  link: ["a"],
  input: ["input", "textarea"],
  field: ["input", "textarea"],
  email: ["input"],
  password: ["input"],
  search: ["input"],
};

/** Tag-family bonus: "…-btn" locators should match buttons, "…-link" links. */
function familyBonus(loc: Locator, cand: Candidate): number {
  const source =
    loc.type === "id" ? (loc.id ?? "") : loc.type === "css" ? (loc.css ?? "") : "";
  const suffix = source.match(/-([a-z]+)$/)?.[1];
  if (suffix) {
    const tags = ID_SUFFIX_TO_TAG[suffix];
    if (tags && tags.includes(cand.tag)) return 0.05;
  }
  if (loc.role && loc.role === cand.role) {
    // Role agreement is mild evidence, not proof (many buttons share a page).
    return 0.03;
  }
  return 0;
}

export function scoreCandidate(cand: Candidate, loc: Locator): number {
  let best = 0;
  if (loc.name && cand.name) best = Math.max(best, textSim(loc.name, cand.name));
  if (loc.text && cand.text) best = Math.max(best, textSim(loc.text, cand.text));
  if (loc.id && cand.id) best = Math.max(best, idSim(loc.id, cand.id));
  if (loc.css && cand.id) {
    const idPart = loc.css.match(/#([A-Za-z0-9_-]+)/)?.[1];
    if (idPart) best = Math.max(best, idSim(idPart, cand.id));
  }
  if (loc.type === "text" && cand.text) {
    best = Math.max(best, textSim(loc.text ?? "", cand.text));
  }
  best += familyBonus(loc, cand);
  return Math.min(best, 1);
}

function buildLocator(cand: Candidate, failed: Locator): Locator {
  // Preserve id-based locators when the new id still looks like the old one.
  if (
    (failed.type === "id" || failed.type === "css") &&
    cand.id &&
    failed.id !== undefined &&
    idSim(failed.id ?? "", cand.id) >= 0.45
  ) {
    return { type: "id", id: cand.id };
  }
  const role = cand.role && cand.role !== "heading" ? cand.role : undefined;
  if (role && cand.name) {
    return { type: "role", role, name: cand.name };
  }
  if (cand.id) return { type: "id", id: cand.id };
  if (cand.name) return { type: "text", text: cand.name };
  return { type: "css", css: cand.tag };
}

const MIN_SCORE = 0.5;
const MIN_MARGIN = 0.08;
const AMBIGUITY_EXEMPT = 0.75;

/**
 * Find the replacement locator for `failed` against the live document.
 * Returns null when no candidate is convincing or the match is ambiguous.
 */
export function healLocator(doc: Document, failed: Locator): HealResult | null {
  const scored: ScoredCandidate[] = collectCandidates(doc)
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, failed) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < MIN_SCORE) return null;
  const second = scored[1];
  if (
    second &&
    top.score < AMBIGUITY_EXEMPT &&
    top.score - second.score < MIN_MARGIN
  ) {
    return null;
  }

  const after = buildLocator(top.candidate, failed);
  const identified =
    top.candidate.name ||
    top.candidate.id ||
    top.candidate.text.slice(0, 40) ||
    top.candidate.tag;

  return {
    after,
    confidence: Math.round(top.score * 100) / 100,
    reason: `Locator ${describeLocator(failed)} no longer matched the page. Best match was "${identified}" (${Math.round(
      top.score * 100,
    )}% similarity) — script updated to target it.`,
    candidates: scored.slice(0, 3).map((s) => ({
      name: s.candidate.name || undefined,
      id: s.candidate.id || undefined,
      role: s.candidate.role,
      score: Math.round(s.score * 100) / 100,
    })),
  };
}
