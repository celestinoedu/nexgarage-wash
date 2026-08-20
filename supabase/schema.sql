create extension if not exists "uuid-ossp";

create table workshops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text not null,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  workshop_id uuid not null references workshops(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'atendente', 'mecanico', 'estoquista', 'financeiro')),
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  email text,
  document text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table cars (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  plate text not null,
  brand text not null,
  model text not null,
  year int,
  color text,
  mileage int default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (workshop_id, plate)
);

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  name text not null,
  cnpj text,
  contact text,
  whatsapp text,
  email text,
  category text,
  notes text,
  created_at timestamptz not null default now()
);

create table parts (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null,
  internal_code text not null,
  category text,
  stock_qty numeric(10,2) not null default 0,
  min_stock numeric(10,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock_location text,
  created_at timestamptz not null default now(),
  unique (workshop_id, internal_code)
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  name text not null,
  category text,
  description text,
  estimated_minutes int not null default 60,
  default_labor_value numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table mechanics (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  specialty text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table service_orders (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  code text not null,
  customer_id uuid not null references customers(id),
  car_id uuid not null references cars(id),
  mechanic_id uuid references mechanics(id) on delete set null,
  entry_date date not null default current_date,
  expected_delivery date,
  status text not null default 'Recebido',
  priority text not null default 'Normal',
  customer_issue text,
  technical_diagnosis text,
  labor_value numeric(12,2) not null default 0,
  parts_value numeric(12,2) not null default 0,
  discount_value numeric(12,2) not null default 0,
  total_value numeric(12,2) generated always as (labor_value + parts_value - discount_value) stored,
  financial_status text not null default 'pendente',
  internal_notes text,
  created_at timestamptz not null default now(),
  unique (workshop_id, code)
);

create table service_order_services (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid not null references service_orders(id) on delete cascade,
  service_id uuid not null references services(id),
  quantity numeric(10,2) not null default 1,
  labor_value numeric(12,2) not null default 0
);

create table service_order_parts (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid not null references service_orders(id) on delete cascade,
  part_id uuid not null references parts(id),
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored
);

create table inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  service_order_id uuid references service_orders(id) on delete set null,
  type text not null check (type in ('entrada', 'saida')),
  quantity numeric(10,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

create table technical_reports (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  service_order_id uuid references service_orders(id) on delete set null,
  car_id uuid not null references cars(id),
  mechanic_id uuid references mechanics(id) on delete set null,
  report_date date not null default current_date,
  diagnosis text,
  probable_cause text,
  tests_performed text,
  recommended_services text,
  recommended_parts text,
  conclusion text,
  notes text,
  created_at timestamptz not null default now()
);

create table financial_transactions (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  service_order_id uuid references service_orders(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  type text not null check (type in ('receita', 'despesa')),
  category text not null,
  description text not null,
  value numeric(12,2) not null,
  due_date date not null,
  paid_at date,
  status text not null check (status in ('pendente', 'pago', 'vencido', 'parcial')),
  payment_method text,
  notes text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  financial_transaction_id uuid not null references financial_transactions(id) on delete cascade,
  value numeric(12,2) not null,
  payment_date date not null default current_date,
  payment_method text not null,
  notes text
);

create table service_order_status_history (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid not null references service_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references users(id),
  changed_at timestamptz not null default now()
);

create index idx_customers_workshop_name on customers(workshop_id, name);
create index idx_cars_workshop_plate on cars(workshop_id, plate);
create index idx_service_orders_workshop_status on service_orders(workshop_id, status);
create index idx_service_orders_mechanic on service_orders(mechanic_id);
create index idx_parts_low_stock on parts(workshop_id, stock_qty, min_stock);
create index idx_financial_due_status on financial_transactions(workshop_id, due_date, status);

alter table workshops enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table cars enable row level security;
alter table suppliers enable row level security;
alter table parts enable row level security;
alter table services enable row level security;
alter table mechanics enable row level security;
alter table service_orders enable row level security;
alter table service_order_services enable row level security;
alter table service_order_parts enable row level security;
alter table inventory_movements enable row level security;
alter table technical_reports enable row level security;
alter table financial_transactions enable row level security;
alter table payments enable row level security;
alter table service_order_status_history enable row level security;

-- MVP RLS helper: a user can access rows in their own workshop.
create or replace function current_workshop_id()
returns uuid
language sql
stable
security definer
as $$
  select workshop_id from users where id = auth.uid()
$$;

create policy "users read own workshop" on users for select using (workshop_id = current_workshop_id());
create policy "workshops read own" on workshops for select using (id = current_workshop_id());
create policy "customers own workshop" on customers for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "cars own workshop" on cars for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "suppliers own workshop" on suppliers for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "parts own workshop" on parts for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "services own workshop" on services for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "mechanics own workshop" on mechanics for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "orders own workshop" on service_orders for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "inventory own workshop" on inventory_movements for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "reports own workshop" on technical_reports for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
create policy "finance own workshop" on financial_transactions for all using (workshop_id = current_workshop_id()) with check (workshop_id = current_workshop_id());
