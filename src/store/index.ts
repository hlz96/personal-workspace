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
import { createSeedData } from '@/data/seed';
import { findTemplate } from '@/data/templates';

function loadInitial(): WorkspaceData {
  const cached = storage.load();
  if (cached && cached.version === 1) return cached;
  const seed = createSeedData();
  storage.save(seed);
  return seed;
}

interface State extends WorkspaceData {}

interface Actions {
  // Tasks
  addTask: (partial: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  reorderTasks: (ids: string[]) => void;

  // Projects
  addProject: (partial: Partial<Project> & { name: string }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;

  // Milestones
  addMilestone: (projectId: string, partial: Omit<Milestone, 'id'>) => void;
  updateMilestone: (projectId: string, mid: string, patch: Partial<Milestone>) => void;
  removeMilestone: (projectId: string, mid: string) => void;

  // Achievements
  addAchievement: (partial: Partial<Achievement> & { title: string; type: Achievement['type']; doneDate: string }) => Achievement;
  updateAchievement: (id: string, patch: Partial<Achievement>) => void;
  removeAchievement: (id: string) => void;

  // Reports
  saveReport: (report: Report) => void;
  removeReport: (id: string) => void;

  // Reviews
  saveReview: (review: Review) => void;
  removeReview: (id: string) => void;

  // Settings & Profile
  updateSettings: (patch: Partial<UserSettings>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  finishOnboarding: (profile: UserProfile) => void;
  switchTemplate: (templateId: string) => void;
  addCustomTemplate: (tpl: Template) => void;
  activeTemplate: () => Template;

  // Data
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  resetAll: () => void;
}

const persist = (data: WorkspaceData) => storage.save(data);

export const useStore = create<State & Actions>((set, get) => ({
  ...loadInitial(),

  addTask(partial) {
    const now = new Date().toISOString();
    const task: Task = {
      id: nanoid(8),
      priority: 'medium',
      status: 'todo',
      sortOrder: (get().tasks.length + 1),
      createdAt: now,
      updatedAt: now,
      ...partial,
    } as Task;
    set((s) => {
      const next = { ...s, tasks: [...s.tasks, task] };
      persist(next);
      return next;
    });
    return task;
  },

  updateTask(id, patch) {
    set((s) => {
      const tasks = s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      );
      const next = { ...s, tasks };
      // 联动:自动重算所在项目进度
      recalcProjectProgress(next);
      persist(next);
      return next;
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
    set((s) => {
      const next = { ...s, tasks: s.tasks.filter((t) => t.id !== id) };
      recalcProjectProgress(next);
      persist(next);
      return next;
    });
  },

  reorderTasks(ids) {
    set((s) => {
      const map = new Map(s.tasks.map((t) => [t.id, t]));
      const reordered = ids
        .map((id, idx) => {
          const t = map.get(id);
          return t ? { ...t, sortOrder: idx + 1 } : null;
        })
        .filter(Boolean) as Task[];
      const rest = s.tasks.filter((t) => !ids.includes(t.id));
      const next = { ...s, tasks: [...reordered, ...rest] };
      persist(next);
      return next;
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
    set((s) => {
      const next = { ...s, projects: [...s.projects, project] };
      persist(next);
      return next;
    });
    return project;
  },

  updateProject(id, patch) {
    set((s) => {
      const projects = s.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      );
      const next = { ...s, projects };
      persist(next);
      return next;
    });
  },

  removeProject(id) {
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const tasks = s.tasks.map((t) =>
        t.projectId === id ? { ...t, projectId: undefined } : t,
      );
      const achievements = s.achievements.map((a) =>
        a.projectId === id ? { ...a, projectId: undefined } : a,
      );
      const next = { ...s, projects, tasks, achievements };
      persist(next);
      return next;
    });
  },

  addMilestone(projectId, partial) {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: [...p.milestones, { ...partial, id: nanoid(6) }],
          updatedAt: new Date().toISOString(),
        };
      });
      const next = { ...s, projects };
      persist(next);
      return next;
    });
  },

  updateMilestone(projectId, mid, patch) {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: p.milestones.map((m) => (m.id === mid ? { ...m, ...patch } : m)),
          updatedAt: new Date().toISOString(),
        };
      });
      const next = { ...s, projects };
      persist(next);
      return next;
    });
  },

  removeMilestone(projectId, mid) {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          milestones: p.milestones.filter((m) => m.id !== mid),
          updatedAt: new Date().toISOString(),
        };
      });
      const next = { ...s, projects };
      persist(next);
      return next;
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
    set((s) => {
      const next = { ...s, achievements: [...s.achievements, a] };
      persist(next);
      return next;
    });
    return a;
  },

  updateAchievement(id, patch) {
    set((s) => {
      const achievements = s.achievements.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
      );
      const next = { ...s, achievements };
      persist(next);
      return next;
    });
  },

  removeAchievement(id) {
    set((s) => {
      const next = { ...s, achievements: s.achievements.filter((a) => a.id !== id) };
      persist(next);
      return next;
    });
  },

  saveReport(report) {
    set((s) => {
      const exists = s.reports.some((r) => r.id === report.id);
      const reports = exists
        ? s.reports.map((r) => (r.id === report.id ? report : r))
        : [...s.reports, report];
      const next = { ...s, reports };
      persist(next);
      return next;
    });
  },

  removeReport(id) {
    set((s) => {
      const next = { ...s, reports: s.reports.filter((r) => r.id !== id) };
      persist(next);
      return next;
    });
  },

  saveReview(review) {
    set((s) => {
      const exists = s.reviews.some((r) => r.id === review.id);
      const reviews = exists
        ? s.reviews.map((r) => (r.id === review.id ? review : r))
        : [...s.reviews, review];
      const next = { ...s, reviews };
      persist(next);
      return next;
    });
  },

  removeReview(id) {
    set((s) => {
      const next = { ...s, reviews: s.reviews.filter((r) => r.id !== id) };
      persist(next);
      return next;
    });
  },

  updateSettings(patch) {
    set((s) => {
      const next = { ...s, settings: { ...s.settings, ...patch } };
      persist(next);
      return next;
    });
  },

  updateProfile(patch) {
    set((s) => {
      const next = { ...s, profile: { ...s.profile, ...patch } };
      persist(next);
      return next;
    });
  },

  finishOnboarding(profile) {
    set((s) => {
      const next = {
        ...s,
        profile: { ...profile, onboardedAt: new Date().toISOString() },
      };
      persist(next);
      return next;
    });
  },

  switchTemplate(templateId) {
    set((s) => {
      const exists = s.templates.some((t) => t.id === templateId);
      if (!exists) return s;
      const next = {
        ...s,
        profile: { ...s.profile, templateId },
      };
      persist(next);
      return next;
    });
  },

  addCustomTemplate(tpl) {
    set((s) => {
      const templates = [...s.templates.filter((t) => t.id !== tpl.id), tpl];
      const next = { ...s, templates };
      persist(next);
      return next;
    });
  },

  activeTemplate() {
    const s = get();
    return findTemplate(s.profile.templateId);
  },

  exportJSON() {
    const s = get();
    return JSON.stringify(
      {
        version: s.version,
        profile: s.profile,
        templates: s.templates,
        tasks: s.tasks,
        projects: s.projects,
        achievements: s.achievements,
        reports: s.reports,
        reviews: s.reviews,
        settings: s.settings,
      },
      null,
      2,
    );
  },

  importJSON(json) {
    const ok = storage.import(json);
    if (!ok) return false;
    const data = storage.load();
    if (!data) return false;
    set(() => ({ ...data }));
    return true;
  },

  resetAll() {
    storage.clear();
    const seed = createSeedData();
    storage.save(seed);
    set(() => ({ ...seed }));
  },
}));

function recalcProjectProgress(state: WorkspaceData) {
  state.projects = state.projects.map((p) => {
    if (p.manualProgress) return p;
    const relatedTasks = state.tasks.filter((t) => t.projectId === p.id);
    if (relatedTasks.length === 0) return p;
    const done = relatedTasks.filter((t) => t.status === 'done').length;
    const progress = Math.round((done / relatedTasks.length) * 100);
    return { ...p, progress };
  });
}
