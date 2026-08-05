import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Achievement,
  Project,
  Report,
  Review,
  Task,
  Template,
  UserProfile,
  UserSettings,
  WorkspaceData,
  Milestone,
} from '@/types';
import { storage } from '@/lib/storage';
import { remoteStorage } from '@/lib/remoteStorage';
import { createSeedData } from '@/data/seed';
import { findTemplate, templates as builtinTemplates } from '@/data/templates';

function loadInitial(): WorkspaceData {
  const cached = storage.load();
  if (cached && cached.version === 1) return cached;
  const seed = createSeedData();
  storage.save(seed);
  return seed;
}

let currentUserId: string | null = null;

// 差异同步:比较 prev/next 两份 WorkspaceData,把差异发给对应表
// debounce 收敛毛刺(短时间多次改同一个任务只发最后一次)
type PendingKey = string;
const pendingUpserts = new Map<PendingKey, () => Promise<void>>();
const pendingDeletes = new Map<PendingKey, () => Promise<void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DEBOUNCE_MS = 500;

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(async () => {
    const ups = Array.from(pendingUpserts.values());
    const dels = Array.from(pendingDeletes.values());
    pendingUpserts.clear();
    pendingDeletes.clear();
    flushTimer = null;
    await Promise.all([...dels.map((fn) => fn()), ...ups.map((fn) => fn())]);
  }, FLUSH_DEBOUNCE_MS);
}

function queueUpsert(key: PendingKey, fn: () => Promise<void>) {
  if (!currentUserId) return;
  pendingDeletes.delete(key);
  pendingUpserts.set(key, fn);
  scheduleFlush();
}

function queueDelete(key: PendingKey, fn: () => Promise<void>) {
  if (!currentUserId) return;
  pendingUpserts.delete(key);
  pendingDeletes.set(key, fn);
  scheduleFlush();
}

function idOf<T extends { id: string }>(list: T[]) {
  return new Map(list.map((x) => [x.id, x]));
}

function shallowEq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffSync(prev: WorkspaceData, next: WorkspaceData) {
  if (!currentUserId) return;
  const uid = currentUserId;

  // profile / settings 变了就 upsert 一次
  if (!shallowEq(prev.profile, next.profile) || !shallowEq(prev.settings, next.settings)) {
    queueUpsert('profile', () =>
      remoteStorage.upsertProfile(uid, next.profile, next.settings, next.version),
    );
  }

  // tasks
  const prevTasks = idOf(prev.tasks);
  const nextTasks = idOf(next.tasks);
  for (const [id, t] of nextTasks) {
    const p = prevTasks.get(id);
    if (!p || !shallowEq(p, t)) {
      queueUpsert(`task:${id}`, () => remoteStorage.upsertTask(uid, t));
    }
  }
  for (const id of prevTasks.keys()) {
    if (!nextTasks.has(id)) {
      queueDelete(`task:${id}`, () => remoteStorage.deleteTask(uid, id));
    }
  }

  // projects (+ milestones)
  const prevProjects = idOf(prev.projects);
  const nextProjects = idOf(next.projects);
  for (const [id, p] of nextProjects) {
    const old = prevProjects.get(id);
    if (!old || !shallowEq({ ...old, milestones: undefined }, { ...p, milestones: undefined })) {
      queueUpsert(`project:${id}`, () => remoteStorage.upsertProject(uid, p));
    }
    // milestones diff
    const prevMs = idOf(old?.milestones ?? []);
    const nextMs = idOf(p.milestones);
    for (const [mid, m] of nextMs) {
      const pm = prevMs.get(mid);
      if (!pm || !shallowEq(pm, m)) {
        queueUpsert(`milestone:${mid}`, () => remoteStorage.upsertMilestone(uid, id, m));
      }
    }
    for (const mid of prevMs.keys()) {
      if (!nextMs.has(mid)) {
        queueDelete(`milestone:${mid}`, () => remoteStorage.deleteMilestone(uid, mid));
      }
    }
  }
  for (const id of prevProjects.keys()) {
    if (!nextProjects.has(id)) {
      queueDelete(`project:${id}`, () => remoteStorage.deleteProject(uid, id));
    }
  }

  // achievements
  const prevA = idOf(prev.achievements);
  const nextA = idOf(next.achievements);
  for (const [id, a] of nextA) {
    const p = prevA.get(id);
    if (!p || !shallowEq(p, a)) {
      queueUpsert(`ach:${id}`, () => remoteStorage.upsertAchievement(uid, a));
    }
  }
  for (const id of prevA.keys()) {
    if (!nextA.has(id)) {
      queueDelete(`ach:${id}`, () => remoteStorage.deleteAchievement(uid, id));
    }
  }

  // reports
  const prevR = idOf(prev.reports);
  const nextR = idOf(next.reports);
  for (const [id, r] of nextR) {
    const p = prevR.get(id);
    if (!p || !shallowEq(p, r)) {
      queueUpsert(`report:${id}`, () => remoteStorage.upsertReport(uid, r));
    }
  }
  for (const id of prevR.keys()) {
    if (!nextR.has(id)) {
      queueDelete(`report:${id}`, () => remoteStorage.deleteReport(uid, id));
    }
  }

  // reviews
  const prevV = idOf(prev.reviews);
  const nextV = idOf(next.reviews);
  for (const [id, v] of nextV) {
    const p = prevV.get(id);
    if (!p || !shallowEq(p, v)) {
      queueUpsert(`review:${id}`, () => remoteStorage.upsertReview(uid, v));
    }
  }
  for (const id of prevV.keys()) {
    if (!nextV.has(id)) {
      queueDelete(`review:${id}`, () => remoteStorage.deleteReview(uid, id));
    }
  }

  // templates(只同步用户自定义)
  const prevT = idOf(prev.templates.filter((t) => !t.builtin));
  const nextT = idOf(next.templates.filter((t) => !t.builtin));
  for (const [id, t] of nextT) {
    const p = prevT.get(id);
    if (!p || !shallowEq(p, t)) {
      queueUpsert(`tpl:${id}`, () => remoteStorage.upsertTemplate(uid, t));
    }
  }
  // 自定义模板一般不删,不做 delete 分支
}

interface State extends WorkspaceData {}

interface Actions {
  addTask: (partial: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  reorderTasks: (ids: string[]) => void;

  addProject: (partial: Partial<Project> & { name: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;

  addMilestone: (projectId: string, partial: Omit<Milestone, 'id'>) => void;
  updateMilestone: (projectId: string, mid: string, patch: Partial<Milestone>) => void;
  removeMilestone: (projectId: string, mid: string) => void;

  addAchievement: (
    partial: Partial<Achievement> & { title: string; type: Achievement['type']; doneDate: string },
  ) => Achievement;
  updateAchievement: (id: string, patch: Partial<Achievement>) => void;
  removeAchievement: (id: string) => void;

  saveReport: (report: Report) => void;
  removeReport: (id: string) => void;

  saveReview: (review: Review) => void;
  removeReview: (id: string) => void;

  updateSettings: (patch: Partial<UserSettings>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  finishOnboarding: (profile: UserProfile) => void;
  switchTemplate: (templateId: string) => void;
  addCustomTemplate: (tpl: Template) => void;
  activeTemplate: () => Template;

  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

// 每个 action 通过 mutate() 触发本地保存 + 差异同步
function mutate(set: any, get: any, updater: (s: WorkspaceData) => WorkspaceData) {
  const prev = snapshotOf(get());
  const nextPartial = updater(prev);
  storage.save(nextPartial);
  set(() => ({ ...nextPartial }));
  diffSync(prev, nextPartial);
}

function snapshotOf(s: WorkspaceData): WorkspaceData {
  return {
    version: s.version,
    profile: s.profile,
    templates: s.templates,
    tasks: s.tasks,
    projects: s.projects,
    achievements: s.achievements,
    reports: s.reports,
    reviews: s.reviews,
    settings: s.settings,
  };
}

export const useStore = create<State & Actions>((set, get) => ({
  ...loadInitial(),

  addTask(partial) {
    const now = new Date().toISOString();
    const task: Task = {
      id: nanoid(8),
      priority: 'medium',
      status: 'todo',
      sortOrder: get().tasks.length + 1,
      createdAt: now,
      updatedAt: now,
      ...partial,
    } as Task;
    mutate(set, get, (s) => ({ ...s, tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask(id, patch) {
    mutate(set, get, (s) => {
      const tasks = s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      );
      return recalcProjectProgress({ ...s, tasks });
    });
  },

  toggleTask(id) {
    const t = get().tasks.find((x) => x.id === id);
    if (!t) return;
    const now = new Date().toISOString();
    if (t.status === 'done') {
      get().updateTask(id, { status: 'todo', doneAt: undefined });
    } else {
      get().updateTask(id, { status: 'done', doneAt: now });
    }
  },

  removeTask(id) {
    mutate(set, get, (s) => {
      return recalcProjectProgress({ ...s, tasks: s.tasks.filter((t) => t.id !== id) });
    });
  },

  reorderTasks(ids) {
    mutate(set, get, (s) => {
      const map = new Map(s.tasks.map((t) => [t.id, t]));
      const reordered = ids
        .map((id, idx) => {
          const t = map.get(id);
          return t ? { ...t, sortOrder: idx + 1 } : null;
        })
        .filter(Boolean) as Task[];
      const rest = s.tasks.filter((t) => !ids.includes(t.id));
      return { ...s, tasks: [...reordered, ...rest] };
    });
  },

  addProject(partial) {
    const now = new Date().toISOString();
    const project: Project = {
      id: nanoid(8),
      color: '#22C55E',
      status: 'active',
      progress: 0,
      manualProgress: false,
      milestones: [],
      createdAt: now,
      updatedAt: now,
      ...partial,
    } as Project;
    mutate(set, get, (s) => ({ ...s, projects: [...s.projects, project] }));
    return project;
  },

  updateProject(id, patch) {
    mutate(set, get, (s) => {
      const projects = s.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      );
      return { ...s, projects };
    });
  },

  removeProject(id) {
    mutate(set, get, (s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const tasks = s.tasks.map((t) =>
        t.projectId === id ? { ...t, projectId: undefined } : t,
      );
      const achievements = s.achievements.map((a) =>
        a.projectId === id ? { ...a, projectId: undefined } : a,
      );
      return { ...s, projects, tasks, achievements };
    });
  },

  addMilestone(projectId, partial) {
    mutate(set, get, (s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: [...p.milestones, { ...partial, id: nanoid(6) }],
          updatedAt: new Date().toISOString(),
        };
      });
      return { ...s, projects };
    });
  },

  updateMilestone(projectId, mid, patch) {
    mutate(set, get, (s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: p.milestones.map((m) => (m.id === mid ? { ...m, ...patch } : m)),
          updatedAt: new Date().toISOString(),
        };
      });
      return { ...s, projects };
    });
  },

  removeMilestone(projectId, mid) {
    mutate(set, get, (s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: p.milestones.filter((m) => m.id !== mid),
          updatedAt: new Date().toISOString(),
        };
      });
      return { ...s, projects };
    });
  },

  addAchievement(partial) {
    const now = new Date().toISOString();
    const a: Achievement = {
      id: nanoid(8),
      createdAt: now,
      updatedAt: now,
      ...partial,
    } as Achievement;
    mutate(set, get, (s) => ({ ...s, achievements: [...s.achievements, a] }));
    return a;
  },

  updateAchievement(id, patch) {
    mutate(set, get, (s) => {
      const achievements = s.achievements.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
      );
      return { ...s, achievements };
    });
  },

  removeAchievement(id) {
    mutate(set, get, (s) => ({ ...s, achievements: s.achievements.filter((a) => a.id !== id) }));
  },

  saveReport(report) {
    mutate(set, get, (s) => {
      const exists = s.reports.some((r) => r.id === report.id);
      const reports = exists
        ? s.reports.map((r) => (r.id === report.id ? report : r))
        : [...s.reports, report];
      return { ...s, reports };
    });
  },

  removeReport(id) {
    mutate(set, get, (s) => ({ ...s, reports: s.reports.filter((r) => r.id !== id) }));
  },

  saveReview(review) {
    mutate(set, get, (s) => {
      const exists = s.reviews.some((r) => r.id === review.id);
      const reviews = exists
        ? s.reviews.map((r) => (r.id === review.id ? review : r))
        : [...s.reviews, review];
      return { ...s, reviews };
    });
  },

  removeReview(id) {
    mutate(set, get, (s) => ({ ...s, reviews: s.reviews.filter((r) => r.id !== id) }));
  },

  updateSettings(patch) {
    mutate(set, get, (s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },

  updateProfile(patch) {
    mutate(set, get, (s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },

  finishOnboarding(profile) {
    mutate(set, get, (s) => ({
      ...s,
      profile: { ...profile, onboardedAt: new Date().toISOString() },
    }));
  },

  switchTemplate(templateId) {
    mutate(set, get, (s) => {
      if (!findTemplate(templateId)) return s;
      return { ...s, profile: { ...s.profile, templateId } };
    });
  },

  addCustomTemplate(tpl) {
    mutate(set, get, (s) => {
      const templates = [...s.templates.filter((t) => t.id !== tpl.id), tpl];
      return { ...s, templates };
    });
  },

  activeTemplate() {
    const s = get();
    return findTemplate(s.profile.templateId);
  },

  exportJSON() {
    return JSON.stringify(snapshotOf(get()), null, 2);
  },

  importJSON(json) {
    const ok = storage.import(json);
    if (!ok) return false;
    const data = storage.load();
    if (!data) return false;
    // 导入 = 覆盖:先记录 prev,再 set,再让 diffSync 铺开
    const prev = snapshotOf(get());
    set(() => ({ ...data }));
    diffSync(prev, data);
    return true;
  },

  resetAll() {
    storage.clear();
    const seed = createSeedData();
    storage.save(seed);
    const prev = snapshotOf(get());
    set(() => ({ ...seed }));
    if (currentUserId) {
      // 远端也重置:清空所有表 → 播种
      const uid = currentUserId;
      (async () => {
        await remoteStorage.clearAll(uid);
        await remoteStorage.bulkInsertAll(uid, seed);
      })();
    } else {
      diffSync(prev, seed);
    }
  },
}));

export function bindUser(userId: string) {
  currentUserId = userId;
}

export function unbindUser() {
  currentUserId = null;
  pendingUpserts.clear();
  pendingDeletes.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

// 登出:解绑同步 + 清本地缓存 + 内存置空,避免共用设备残留他人数据。
// 内存重置为 seed 但不写盘(storage.clear 已清),下一位登录者由 SessionSync 重新水合。
export function clearSessionData() {
  unbindUser();
  storage.clear();
  useStore.setState(() => ({ ...createSeedData() }));
}

export function hydrateFromRemote(data: WorkspaceData) {
  // 内置模板从不入库(bulkInsertAll/upsertTemplate 过滤 !builtin),
  // 远端只返回自定义模板;这里把内置模板并回来,否则 store.templates 为空,
  // 会导致自动生成周报静默失效、成果类型/模板选择器为空。
  const customTemplates = data.templates.filter((t) => !t.builtin);
  const merged: WorkspaceData = {
    ...data,
    templates: [...builtinTemplates, ...customTemplates],
  };
  storage.save(merged);
  useStore.setState(() => ({ ...merged }));
}

export function currentSnapshot(): WorkspaceData {
  return snapshotOf(useStore.getState());
}

export function resetToSeed() {
  const seed = createSeedData();
  storage.save(seed);
  useStore.setState(() => ({ ...seed }));
}

function recalcProjectProgress(state: WorkspaceData): WorkspaceData {
  const projects = state.projects.map((p) => {
    if (p.manualProgress) return p;
    const relatedTasks = state.tasks.filter((t) => t.projectId === p.id);
    if (relatedTasks.length === 0) return p;
    const done = relatedTasks.filter((t) => t.status === 'done').length;
    const progress = Math.round((done / relatedTasks.length) * 100);
    return { ...p, progress };
  });
  return { ...state, projects };
}
