export type ID = string;

export type Identity = 'worker' | 'student' | 'freelancer' | 'founder' | 'jobseeker';
export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'ondemand';

export interface UserProfile {
  identity: Identity;
  role?: string;
  cadence: Cadence;
  templateId: string;
  onboardedAt?: string;
  terminology?: Record<string, string>;
}

export interface TemplateProjectSample {
  name: string;
  color: string;
  description?: string;
}

export interface TemplateAchievementType {
  value: string;
  label: string;
}

export interface Template {
  id: string;
  name: string;
  identity: Identity;
  builtin: boolean;
  projectSamples: TemplateProjectSample[];
  tags: string[];
  achievementTypes: TemplateAchievementType[];
  terminology: Record<string, string>;
  weeklyTemplate: string;
  monthlyTemplate: string;
  reviewTemplate: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'done' | 'archived';

export interface Task {
  id: ID;
  title: string;
  note?: string;
  projectId?: ID;
  priority: TaskPriority;
  status: TaskStatus;
  planDate?: string;   // YYYY-MM-DD
  planTime?: string;   // HH:mm
  doneAt?: string;     // ISO
  isAchievement?: boolean;
  tags?: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type ProjectStatus = 'active' | 'done' | 'paused' | 'archived';

export interface Milestone {
  id: ID;
  name: string;
  planDate: string;
  doneAt?: string;
}

export interface Project {
  id: ID;
  name: string;
  description?: string;
  color: string;
  status: ProjectStatus;
  progress: number;          // 0-100
  manualProgress: boolean;
  startDate?: string;
  endDate?: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type AchievementType = string;

export interface Achievement {
  id: ID;
  title: string;
  type: AchievementType;
  projectId?: ID;
  description?: string;      // 富文本 / Markdown
  metric?: string;           // 「效率提升 30%」
  attachments?: Array<{ name: string; url: string }>;
  doneDate: string;          // YYYY-MM-DD
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'weekly' | 'monthly';
export type ReportStatus = 'draft' | 'submitted' | 'sent';

export interface Report {
  id: ID;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  content: string;           // Markdown
  status: ReportStatus;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewPeriod = 'quarter' | 'half' | 'year';

export interface Review {
  id: ID;
  period: ReviewPeriod;
  periodStart: string;
  periodEnd: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  metrics?: {
    tasksDone: number;
    achievementsAdded: number;
    projectsInvolved: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  name: string;
  theme: 'light' | 'dark' | 'auto';
  retention: {
    autoArchiveEnabled: boolean;
    completedTaskArchiveMonths: number;
    weeklyReportArchiveMonths: number;
    monthlyReportArchiveMonths: number;
    notifyBeforeCleanupDays: number;
  };
}

export interface WorkspaceData {
  version: number;
  profile: UserProfile;
  templates: Template[];
  tasks: Task[];
  projects: Project[];
  achievements: Achievement[];
  reports: Report[];
  reviews: Review[];
  settings: UserSettings;
}
