// Demo-workspace database client. SentinelQA runs as a shared demo
// workspace (no end-user accounts), so every table is readable/writable by
// the anonymous role and this client needs no session persistence.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const db = createClient(url, publishableKey, {
  auth: { persistSession: false },
});

export interface TicketRow {
  id: string;
  key: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  priority: string;
  jira_status: string;
  created_at: string;
}

export interface TestRow {
  id: string;
  ticket_id: string;
  name: string;
  steps: import("./types").TestStep[];
  generated_by: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RunRow {
  id: string;
  ticket_id: string;
  mode: string;
  app_version: string;
  total_tests: number;
  passed: number;
  failed: number;
  repaired: number;
  flaky_count: number;
  status: string;
  started_at: string;
  finished_at: string | null;
}

export interface RunResultRow {
  id: string;
  run_id: string;
  test_id: string | null;
  test_name: string;
  status: string;
  attempts: import("./types").Attempt[];
  repair_log: import("./types").RepairEntry[];
  visual: import("./types").VisualCheck | null;
  duration_ms: number;
}

export interface JiraCommentRow {
  id: string;
  ticket_id: string;
  body: string;
  author: string;
  created_at: string;
}

export interface AppConfigRow {
  id: string;
  version_label: string;
  chaos_mode: boolean;
  elements: {
    pages: { path: string; name: string }[];
    elements: import("./types").DemoElement[];
    test_account: { email: string; password: string };
  };
  updated_at: string;
}

export interface ChangeLogRow {
  id: string;
  description: string;
  applied_at: string;
}
