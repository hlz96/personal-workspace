import { supabase } from '@/lib/supabase';
import type {
  Achievement,
  Milestone,
  Project,
  Report,
  Review,
  Task,
  Template,
  UserProfile,
  UserSettings,
  WorkspaceData,
} from '@/types';
import { createSeedData } from '@/data/seed';
import { toast } from '@/lib/toast';

// 写操作失败:记录日志 + 提示用户(避免静默丢数据)
function warnSave(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
  toast.error('云端保存失败,请检查网络后重试');
}

// -------- 行 <=> 领域模型 转换 --------
// DB 用 snake_case,前端用 camelCase。转换只在这一层做。

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  project_id: string | null;
  priority: Task['priority'];
  status: Task['status'];
  plan_date: string | null;
  plan_time: string | null;
  done_at: string | null;
  is_achievement: boolean | null;
  tags: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function taskFromRow(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    note: r.note ?? undefined,
    projectId: r.project_id ?? undefined,
    priority: r.priority,
    status: r.status,
    planDate: r.plan_date ?? undefined,
    planTime: r.plan_time ?? undefined,
    doneAt: r.done_at ?? undefined,
    isAchievement: r.is_achievement ?? undefined,
    tags: r.tags ?? undefined,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at ?? undefined,
  };
}

function taskToRow(userId: string, t: Task): TaskRow {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    note: t.note ?? null,
    project_id: t.projectId ?? null,
    priority: t.priority,
    status: t.status,
    plan_date: t.planDate ?? null,
    plan_time: t.planTime ?? null,
    done_at: t.doneAt ?? null,
    is_achievement: t.isAchievement ?? null,
    tags: t.tags ?? null,
    sort_order: t.sortOrder,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    archived_at: t.archivedAt ?? null,
  };
}

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  status: Project['status'];
  progress: number;
  manual_progress: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function projectFromRow(r: ProjectRow, milestones: Milestone[]): Project {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color,
    status: r.status,
    progress: r.progress,
    manualProgress: r.manual_progress,
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    milestones,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at ?? undefined,
  };
}

function projectToRow(userId: string, p: Project): ProjectRow {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    description: p.description ?? null,
    color: p.color,
    status: p.status,
    progress: p.progress,
    manual_progress: p.manualProgress,
    start_date: p.startDate ?? null,
    end_date: p.endDate ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    archived_at: p.archivedAt ?? null,
  };
}

type MilestoneRow = {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  plan_date: string;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

function milestoneFromRow(r: MilestoneRow): Milestone & { projectId: string } {
  return {
    id: r.id,
    name: r.name,
    planDate: r.plan_date,
    doneAt: r.done_at ?? undefined,
    projectId: r.project_id,
  };
}

function milestoneToRow(userId: string, projectId: string, m: Milestone): MilestoneRow {
  const now = new Date().toISOString();
  return {
    id: m.id,
    user_id: userId,
    project_id: projectId,
    name: m.name,
    plan_date: m.planDate,
    done_at: m.doneAt ?? null,
    created_at: now,
    updated_at: now,
  };
}

type AchievementRow = {
  id: string;
  user_id: string;
  title: string;
  type: string;
  project_id: string | null;
  description: string | null;
  metric: string | null;
  done_date: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

function achievementFromRow(r: AchievementRow): Achievement {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    projectId: r.project_id ?? undefined,
    description: r.description ?? undefined,
    metric: r.metric ?? undefined,
    doneDate: r.done_date,
    tags: r.tags ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function achievementToRow(userId: string, a: Achievement): AchievementRow {
  return {
    id: a.id,
    user_id: userId,
    title: a.title,
    type: a.type,
    project_id: a.projectId ?? null,
    description: a.description ?? null,
    metric: a.metric ?? null,
    done_date: a.doneDate,
    tags: a.tags ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

type ReportRow = {
  id: string;
  user_id: string;
  type: Report['type'];
  period_start: string;
  period_end: string;
  content: string;
  status: Report['status'];
  edited: boolean;
  created_at: string;
  updated_at: string;
};

function reportFromRow(r: ReportRow): Report {
  return {
    id: r.id,
    type: r.type,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    content: r.content,
    status: r.status,
    edited: r.edited,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function reportToRow(userId: string, r: Report): ReportRow {
  return {
    id: r.id,
    user_id: userId,
    type: r.type,
    period_start: r.periodStart,
    period_end: r.periodEnd,
    content: r.content,
    status: r.status,
    edited: r.edited,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

type ReviewRow = {
  id: string;
  user_id: string;
  period: Review['period'];
  period_start: string;
  period_end: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  metrics: Review['metrics'] | null;
  created_at: string;
  updated_at: string;
};

function reviewFromRow(r: ReviewRow): Review {
  return {
    id: r.id,
    period: r.period,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    situation: r.situation ?? undefined,
    task: r.task ?? undefined,
    action: r.action ?? undefined,
    result: r.result ?? undefined,
    metrics: r.metrics ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function reviewToRow(userId: string, r: Review): ReviewRow {
  return {
    id: r.id,
    user_id: userId,
    period: r.period,
    period_start: r.periodStart,
    period_end: r.periodEnd,
    situation: r.situation ?? null,
    task: r.task ?? null,
    action: r.action ?? null,
    result: r.result ?? null,
    metrics: r.metrics ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  identity: Template['identity'];
  builtin: boolean;
  project_samples: Template['projectSamples'];
  tags: Template['tags'];
  achievement_types: Template['achievementTypes'];
  terminology: Template['terminology'];
  weekly_template: string;
  monthly_template: string;
  review_template: string;
  created_at: string;
  updated_at: string;
};

function templateFromRow(r: TemplateRow): Template {
  return {
    id: r.id,
    name: r.name,
    identity: r.identity,
    builtin: r.builtin,
    projectSamples: r.project_samples ?? [],
    tags: r.tags ?? [],
    achievementTypes: r.achievement_types ?? [],
    terminology: r.terminology ?? {},
    weeklyTemplate: r.weekly_template,
    monthlyTemplate: r.monthly_template,
    reviewTemplate: r.review_template,
  };
}

function templateToRow(userId: string, t: Template): TemplateRow {
  const now = new Date().toISOString();
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    identity: t.identity,
    builtin: t.builtin,
    project_samples: t.projectSamples,
    tags: t.tags,
    achievement_types: t.achievementTypes,
    terminology: t.terminology,
    weekly_template: t.weeklyTemplate,
    monthly_template: t.monthlyTemplate,
    review_template: t.reviewTemplate,
    created_at: now,
    updated_at: now,
  };
}

type ProfileRow = {
  user_id: string;
  data_version: number;
  identity: UserProfile['identity'];
  role: string | null;
  cadence: UserProfile['cadence'];
  template_id: string;
  onboarded_at: string | null;
  terminology: Record<string, string> | null;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
};

function profileFromRow(r: ProfileRow): { profile: UserProfile; settings: UserSettings; version: number } {
  return {
    version: r.data_version,
    profile: {
      identity: r.identity,
      role: r.role ?? undefined,
      cadence: r.cadence,
      templateId: r.template_id,
      onboardedAt: r.onboarded_at ?? undefined,
      terminology: r.terminology ?? undefined,
    },
    settings: r.settings,
  };
}

// -------- 对外 API --------

export const remoteStorage = {
  // 拉全量(登录后 hydrate)
  async loadAll(userId: string): Promise<WorkspaceData | null> {
    const [
      profileRes,
      templatesRes,
      tasksRes,
      projectsRes,
      milestonesRes,
      achievementsRes,
      reportsRes,
      reviewsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle<ProfileRow>(),
      supabase.from('templates').select('*').eq('user_id', userId),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('project_milestones').select('*').eq('user_id', userId),
      supabase.from('achievements').select('*').eq('user_id', userId),
      supabase.from('reports').select('*').eq('user_id', userId),
      supabase.from('reviews').select('*').eq('user_id', userId),
    ]);

    const err =
      profileRes.error ??
      templatesRes.error ??
      tasksRes.error ??
      projectsRes.error ??
      milestonesRes.error ??
      achievementsRes.error ??
      reportsRes.error ??
      reviewsRes.error;
    if (err) {
      console.error('[remoteStorage.loadAll]', err);
      return null;
    }

    if (!profileRes.data) return null;

    const { profile, settings, version } = profileFromRow(profileRes.data);
    const milestones = (milestonesRes.data ?? []).map(milestoneFromRow);
    const milestonesByProject = new Map<string, Milestone[]>();
    for (const m of milestones) {
      const list = milestonesByProject.get(m.projectId) ?? [];
      list.push({ id: m.id, name: m.name, planDate: m.planDate, doneAt: m.doneAt });
      milestonesByProject.set(m.projectId, list);
    }

    const projects = (projectsRes.data ?? []).map((r: ProjectRow) =>
      projectFromRow(r, milestonesByProject.get(r.id) ?? []),
    );

    return {
      version,
      profile,
      settings,
      templates: (templatesRes.data ?? []).map(templateFromRow),
      tasks: (tasksRes.data ?? []).map(taskFromRow),
      projects,
      achievements: (achievementsRes.data ?? []).map(achievementFromRow),
      reports: (reportsRes.data ?? []).map(reportFromRow),
      reviews: (reviewsRes.data ?? []).map(reviewFromRow),
    };
  },

  // 首登:是否已有 profile 决定"云端为空 or 已存在"
  async profileExists(userId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) {
      console.error('[remoteStorage.profileExists]', error);
      return false;
    }
    return (count ?? 0) > 0;
  },

  // 首次播种(注册后 or 拒绝导入本地):把 seed / local 数据分表批量写入
  async bulkInsertAll(userId: string, data: WorkspaceData): Promise<boolean> {
    const profileRow: ProfileRow = {
      user_id: userId,
      data_version: data.version ?? 1,
      identity: data.profile.identity,
      role: data.profile.role ?? null,
      cadence: data.profile.cadence,
      template_id: data.profile.templateId,
      onboarded_at: data.profile.onboardedAt ?? null,
      terminology: data.profile.terminology ?? null,
      settings: data.settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const taskRows = data.tasks.map((t) => taskToRow(userId, t));
    const projectRows = data.projects.map((p) => projectToRow(userId, p));
    const milestoneRows: MilestoneRow[] = [];
    for (const p of data.projects) {
      for (const m of p.milestones) {
        milestoneRows.push(milestoneToRow(userId, p.id, m));
      }
    }
    const achievementRows = data.achievements.map((a) => achievementToRow(userId, a));
    const reportRows = data.reports.map((r) => reportToRow(userId, r));
    const reviewRows = data.reviews.map((r) => reviewToRow(userId, r));
    // 内置模板不入库,只保存 builtin=false 的自定义模板
    const customTemplateRows = data.templates
      .filter((t) => !t.builtin)
      .map((t) => templateToRow(userId, t));

    const results = await Promise.all([
      supabase.from('profiles').upsert(profileRow, { onConflict: 'user_id' }),
      taskRows.length
        ? supabase.from('tasks').upsert(taskRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
      projectRows.length
        ? supabase.from('projects').upsert(projectRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
      milestoneRows.length
        ? supabase
            .from('project_milestones')
            .upsert(milestoneRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
      achievementRows.length
        ? supabase.from('achievements').upsert(achievementRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
      reportRows.length
        ? supabase.from('reports').upsert(reportRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
      reviewRows.length
        ? supabase.from('reviews').upsert(reviewRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
      customTemplateRows.length
        ? supabase.from('templates').upsert(customTemplateRows, { onConflict: 'user_id,id' })
        : Promise.resolve({ error: null } as any),
    ]);

    const failed = results.find((r) => r.error);
    if (failed) {
      warnSave('remoteStorage.bulkInsertAll', failed.error);
      return false;
    }
    return true;
  },

  // 单条 CRUD --------
  async upsertProfile(userId: string, profile: UserProfile, settings: UserSettings, version = 1) {
    const row: Partial<ProfileRow> = {
      user_id: userId,
      data_version: version,
      identity: profile.identity,
      role: profile.role ?? null,
      cadence: profile.cadence,
      template_id: profile.templateId,
      onboarded_at: profile.onboardedAt ?? null,
      terminology: profile.terminology ?? null,
      settings,
    };
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
    if (error) warnSave('upsertProfile', error);
  },

  async upsertTask(userId: string, task: Task) {
    const { error } = await supabase
      .from('tasks')
      .upsert(taskToRow(userId, task), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertTask', error);
  },

  async deleteTask(userId: string, id: string) {
    const { error } = await supabase.from('tasks').delete().eq('user_id', userId).eq('id', id);
    if (error) warnSave('deleteTask', error);
  },

  async upsertTasksBulk(userId: string, tasks: Task[]) {
    if (!tasks.length) return;
    const rows = tasks.map((t) => taskToRow(userId, t));
    const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'user_id,id' });
    if (error) warnSave('upsertTasksBulk', error);
  },

  async upsertProject(userId: string, project: Project) {
    const { error } = await supabase
      .from('projects')
      .upsert(projectToRow(userId, project), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertProject', error);
  },

  async deleteProject(userId: string, id: string) {
    // 级联:先删该项目下的 milestones(RLS 保证只删自己的)
    await supabase.from('project_milestones').delete().eq('user_id', userId).eq('project_id', id);
    const { error } = await supabase.from('projects').delete().eq('user_id', userId).eq('id', id);
    if (error) warnSave('deleteProject', error);
  },

  async upsertMilestone(userId: string, projectId: string, m: Milestone) {
    const { error } = await supabase
      .from('project_milestones')
      .upsert(milestoneToRow(userId, projectId, m), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertMilestone', error);
  },

  async deleteMilestone(userId: string, id: string) {
    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) warnSave('deleteMilestone', error);
  },

  async upsertAchievement(userId: string, a: Achievement) {
    const { error } = await supabase
      .from('achievements')
      .upsert(achievementToRow(userId, a), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertAchievement', error);
  },

  async deleteAchievement(userId: string, id: string) {
    const { error } = await supabase.from('achievements').delete().eq('user_id', userId).eq('id', id);
    if (error) warnSave('deleteAchievement', error);
  },

  async upsertReport(userId: string, r: Report) {
    const { error } = await supabase
      .from('reports')
      .upsert(reportToRow(userId, r), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertReport', error);
  },

  async deleteReport(userId: string, id: string) {
    const { error } = await supabase.from('reports').delete().eq('user_id', userId).eq('id', id);
    if (error) warnSave('deleteReport', error);
  },

  async upsertReview(userId: string, r: Review) {
    const { error } = await supabase
      .from('reviews')
      .upsert(reviewToRow(userId, r), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertReview', error);
  },

  async deleteReview(userId: string, id: string) {
    const { error } = await supabase.from('reviews').delete().eq('user_id', userId).eq('id', id);
    if (error) warnSave('deleteReview', error);
  },

  async upsertTemplate(userId: string, t: Template) {
    // 内置模板不入库
    if (t.builtin) return;
    const { error } = await supabase
      .from('templates')
      .upsert(templateToRow(userId, t), { onConflict: 'user_id,id' });
    if (error) warnSave('upsertTemplate', error);
  },

  // 全清(resetAll 用)
  async clearAll(userId: string): Promise<boolean> {
    const tables = [
      'tasks',
      'project_milestones',
      'projects',
      'achievements',
      'reports',
      'reviews',
      'templates',
      'profiles',
    ] as const;
    for (const t of tables) {
      const { error } = await supabase.from(t).delete().eq('user_id', userId);
      if (error) {
        warnSave(`clearAll:${t}`, error);
        return false;
      }
    }
    return true;
  },
};

// 内置模板 seed 供 SessionSync 判定是否需要播种
export function isEmptyRemote(): WorkspaceData {
  return createSeedData();
}
