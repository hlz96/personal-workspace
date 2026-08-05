import type { WorkspaceData } from '@/types';
import { defaultTemplateId, templates } from '@/data/templates';

export function createSeedData(): WorkspaceData {
  return {
    version: 1,
    profile: {
      identity: 'worker',
      cadence: 'weekly',
      templateId: defaultTemplateId,
    },
    templates,
    settings: {
      name: '',
      theme: 'light',
      retention: {
        autoArchiveEnabled: true,
        completedTaskArchiveMonths: 12,
        weeklyReportArchiveMonths: 24,
        monthlyReportArchiveMonths: 36,
        notifyBeforeCleanupDays: 7,
      },
    },
    projects: [],
    tasks: [],
    achievements: [],
    reports: [],
    reviews: [],
  };
}
