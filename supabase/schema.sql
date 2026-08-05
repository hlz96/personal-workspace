-- ============================================================
-- 个人工作台 · Supabase Schema (多表版 v2)
-- 每种资源一张表,按 user_id 做 RLS 隔离
-- 在 Supabase Dashboard → SQL Editor 里执行
-- ============================================================

-- 清理旧版单表(重新播种模式)
drop table if exists public.user_workspaces cascade;

-- ------------------------------------------------------------
-- 通用:自动更新 updated_at 触发器函数
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1) profiles (身份画像 + 设置,每用户 1 行)
-- ============================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data_version int not null default 1,
  identity text not null default 'worker',
  role text,
  cadence text not null default 'weekly',
  template_id text not null default 'default-worker',
  onboarded_at timestamptz,
  terminology jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
before update on public.profiles
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles - own row" on public.profiles;
create policy "profiles - own row"
on public.profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 2) templates (用户自定义模板;内置模板在前端代码,不入库)
-- ============================================================
create table if not exists public.templates (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  identity text not null,
  builtin boolean not null default false,
  project_samples jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  achievement_types jsonb not null default '[]'::jsonb,
  terminology jsonb not null default '{}'::jsonb,
  weekly_template text not null default '',
  monthly_template text not null default '',
  review_template text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

drop trigger if exists trg_templates_touch on public.templates;
create trigger trg_templates_touch
before update on public.templates
for each row execute function public.touch_updated_at();

alter table public.templates enable row level security;
drop policy if exists "templates - own rows" on public.templates;
create policy "templates - own rows"
on public.templates for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 3) tasks
-- ============================================================
create table if not exists public.tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  project_id text,
  priority text not null default 'medium',
  status text not null default 'todo',
  plan_date date,
  plan_time text,
  done_at timestamptz,
  is_achievement boolean,
  tags jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  primary key (user_id, id)
);

create index if not exists idx_tasks_user_project on public.tasks(user_id, project_id);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch
before update on public.tasks
for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
drop policy if exists "tasks - own rows" on public.tasks;
create policy "tasks - own rows"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 4) projects
-- ============================================================
create table if not exists public.projects (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#22C55E',
  status text not null default 'active',
  progress int not null default 0,
  manual_progress boolean not null default false,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  primary key (user_id, id)
);

drop trigger if exists trg_projects_touch on public.projects;
create trigger trg_projects_touch
before update on public.projects
for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;
drop policy if exists "projects - own rows" on public.projects;
create policy "projects - own rows"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 5) project_milestones
-- ============================================================
create table if not exists public.project_milestones (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  name text not null,
  plan_date date not null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_milestones_user_project on public.project_milestones(user_id, project_id);

drop trigger if exists trg_milestones_touch on public.project_milestones;
create trigger trg_milestones_touch
before update on public.project_milestones
for each row execute function public.touch_updated_at();

alter table public.project_milestones enable row level security;
drop policy if exists "milestones - own rows" on public.project_milestones;
create policy "milestones - own rows"
on public.project_milestones for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 6) achievements
-- ============================================================
create table if not exists public.achievements (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  project_id text,
  description text,
  metric text,
  attachments jsonb,
  done_date date not null,
  tags jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_achievements_user_project on public.achievements(user_id, project_id);

drop trigger if exists trg_achievements_touch on public.achievements;
create trigger trg_achievements_touch
before update on public.achievements
for each row execute function public.touch_updated_at();

alter table public.achievements enable row level security;
drop policy if exists "achievements - own rows" on public.achievements;
create policy "achievements - own rows"
on public.achievements for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 7) reports (周期总结)
-- ============================================================
create table if not exists public.reports (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  period_start date not null,
  period_end date not null,
  content text not null default '',
  status text not null default 'draft',
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

drop trigger if exists trg_reports_touch on public.reports;
create trigger trg_reports_touch
before update on public.reports
for each row execute function public.touch_updated_at();

alter table public.reports enable row level security;
drop policy if exists "reports - own rows" on public.reports;
create policy "reports - own rows"
on public.reports for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- 8) reviews (季度/年度复盘)
-- ============================================================
create table if not exists public.reviews (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  period_start date not null,
  period_end date not null,
  situation text,
  task text,
  action text,
  result text,
  metrics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

drop trigger if exists trg_reviews_touch on public.reviews;
create trigger trg_reviews_touch
before update on public.reviews
for each row execute function public.touch_updated_at();

alter table public.reviews enable row level security;
drop policy if exists "reviews - own rows" on public.reviews;
create policy "reviews - own rows"
on public.reviews for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 完成
