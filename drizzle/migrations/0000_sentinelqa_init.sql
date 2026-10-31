create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null default '',
  acceptance_criteria jsonb not null default '[]'::jsonb,
  priority text not null default 'Medium',
  jira_status text not null default 'To Do',
  created_at timestamptz not null default now()
);

create table public.app_config (
  id uuid primary key default gen_random_uuid(),
  version_label text not null default 'v1.0.0',
  chaos_mode boolean not null default false,
  elements jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  generated_by text not null default 'ai',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  mode text not null default 'standard',
  app_version text not null default 'v1.0.0',
  total_tests int not null default 0,
  passed int not null default 0,
  failed int not null default 0,
  repaired int not null default 0,
  flaky_count int not null default 0,
  status text not null default 'completed',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.run_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  test_id uuid references public.tests(id) on delete set null,
  test_name text not null,
  status text not null,
  attempts jsonb not null default '[]'::jsonb,
  repair_log jsonb not null default '[]'::jsonb,
  visual jsonb,
  duration_ms int not null default 0
);

create table public.jira_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  body text not null,
  author text not null default 'SentinelQA',
  created_at timestamptz not null default now()
);

create table public.visual_baselines (
  test_name text primary key,
  screenshot text not null,
  fingerprint jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.app_change_log (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  applied_at timestamptz not null default now()
);

grant all on public.tickets to anon, service_role;
grant all on public.app_config to anon, service_role;
grant all on public.tests to anon, service_role;
grant all on public.runs to anon, service_role;
grant all on public.run_results to anon, service_role;
grant all on public.jira_comments to anon, service_role;
grant all on public.visual_baselines to anon, service_role;
grant all on public.app_change_log to anon, service_role;

alter table public.tickets enable row level security;
alter table public.app_config enable row level security;
alter table public.tests enable row level security;
alter table public.runs enable row level security;
alter table public.run_results enable row level security;
alter table public.jira_comments enable row level security;
alter table public.visual_baselines enable row level security;
alter table public.app_change_log enable row level security;

create policy "demo public access tickets" on public.tickets for all to anon using (true) with check (true);
create policy "demo public access app_config" on public.app_config for all to anon using (true) with check (true);
create policy "demo public access tests" on public.tests for all to anon using (true) with check (true);
create policy "demo public access runs" on public.runs for all to anon using (true) with check (true);
create policy "demo public access run_results" on public.run_results for all to anon using (true) with check (true);
create policy "demo public access jira_comments" on public.jira_comments for all to anon using (true) with check (true);
create policy "demo public access visual_baselines" on public.visual_baselines for all to anon using (true) with check (true);
create policy "demo public access app_change_log" on public.app_change_log for all to anon using (true) with check (true);

insert into public.tickets (key, title, description, acceptance_criteria, priority, jira_status) values
('SENT-101', 'User must be able to log in to the store', 'As a returning customer I want to sign in so I can check out faster.', '["Login page shows email and password fields","User can sign in with valid credentials (demo@shop.dev / password123)","Invalid credentials show an error message","Successful sign-in lands on the store page"]'::jsonb, 'High', 'In QA'),
('SENT-102', 'Shopper can add products to the cart', 'Product cards on the store page must let shoppers add items to the cart.', '["Each product card has an Add to Cart button","Clicking Add to Cart increases the cart count","Cart page lists added products with prices"]'::jsonb, 'High', 'To Do'),
('SENT-103', 'Shopper can complete checkout', 'From the cart the shopper proceeds to checkout and confirms the order.', '["Cart page has a Proceed to Checkout button","Checkout page shows an order summary","Clicking Buy Now confirms the order","Confirmation page shows Order Confirmed and an order number"]'::jsonb, 'Critical', 'To Do'),
('SENT-104', 'Store navigation between sections works', 'Basic navigation links between store, cart and back must work.', '["Store page links to the cart","Cart page links back to the store"]'::jsonb, 'Medium', 'To Do');

insert into public.app_config (version_label, chaos_mode, elements) values ('v1.0.0', false, '{
  "pages": [
    {"path": "#/login", "name": "Login"},
    {"path": "#/store", "name": "Store"},
    {"path": "#/cart", "name": "Cart"},
    {"path": "#/checkout", "name": "Checkout"},
    {"path": "#/confirmation", "name": "Order Confirmation"}
  ],
  "elements": [
    {"key": "email_input", "type": "textbox", "id": "login-email", "label": "Email", "page": "#/login"},
    {"key": "password_input", "type": "textbox", "id": "login-password", "label": "Password", "page": "#/login"},
    {"key": "login_btn", "type": "button", "id": "login-btn", "label": "Sign In", "page": "#/login"},
    {"key": "add_aurora", "type": "button", "id": "add-aurora", "label": "Add to Cart — Aurora Headphones", "page": "#/store"},
    {"key": "add_nimbus", "type": "button", "id": "add-nimbus", "label": "Add to Cart — Nimbus Keyboard", "page": "#/store"},
    {"key": "add_cosmic", "type": "button", "id": "add-cosmic", "label": "Add to Cart — Cosmic Mouse", "page": "#/store"},
    {"key": "cart_link", "type": "link", "id": "cart-link", "label": "Cart", "page": "#/store"},
    {"key": "continue_link", "type": "link", "id": "continue-link", "label": "Continue Shopping", "page": "#/cart"},
    {"key": "checkout_btn", "type": "button", "id": "checkout-btn", "label": "Proceed to Checkout", "page": "#/cart"},
    {"key": "buy_now_btn", "type": "button", "id": "buy-now-btn", "label": "Buy Now", "page": "#/checkout"},
    {"key": "order_confirmed", "type": "text", "id": "order-confirmation", "label": "Order Confirmed", "page": "#/confirmation"},
    {"key": "order_number", "type": "text", "id": "order-number", "label": "Order number", "page": "#/confirmation"}
  ],
  "test_account": {"email": "demo@shop.dev", "password": "password123"}
}'::jsonb);