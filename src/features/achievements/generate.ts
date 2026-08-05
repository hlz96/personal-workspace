import type { Achievement, Task, Template } from '@/types';
import { todayISO } from '@/lib/utils';

interface GenerateInput {
  tasks: Task[];
  achievements: Achievement[];
  template: Template;
}

export type AchievementDraft = Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>;

// 把「已完成的成果类任务」(isAchievement && status==='done')沉淀为成果草稿。
// 用「标题 + 完成日期」与既有成果去重,避免重复生成;不改动数据模型。
export function generateAchievementDrafts(input: GenerateInput): AchievementDraft[] {
  const { tasks, achievements, template } = input;

  const existingKeys = new Set(
    achievements.map((a) => `${a.title}__${a.doneDate}`),
  );

  const defaultType = template.achievementTypes[0]?.value ?? 'other';

  const drafts: AchievementDraft[] = [];
  tasks
    .filter((t) => t.isAchievement && t.status === 'done')
    .forEach((t) => {
      const doneDate = (t.doneAt ?? todayISO()).slice(0, 10);
      const key = `${t.title}__${doneDate}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key); // 同一批内部也去重
      drafts.push({
        title: t.title,
        type: defaultType,
        projectId: t.projectId,
        doneDate,
        description: t.note ?? '用 STAR 法则补充:背景、任务、行动、结果',
        metric: '',
      });
    });

  return drafts;
}
