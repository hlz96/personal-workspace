import type {
  Achievement,
  Project,
  Review,
  ReviewPeriod,
  Task,
  Template,
} from '@/types';
import { isInRange } from '@/lib/utils';

interface GenerateInput {
  period: ReviewPeriod;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  tasks: Task[];
  projects: Project[];
  achievements: Achievement[];
  template: Template;
}

interface Drafted {
  situation: string;
  task: string;
  action: string;
  result: string;
}

// 依据周期内的任务/成果/项目,聚合出 STAR 四段初稿(可编辑)。
// 聚合口径对齐 features/reports/generate.ts,保持两处"自动生成"行为一致。
export function generateReviewDraft(input: GenerateInput): Drafted {
  const { periodStart, periodEnd, tasks, projects, achievements, template } = input;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const achievementName = template.terminology['achievement.singular'] ?? '成果';
  const projectName = template.terminology['nav.projects'] ?? '项目';

  const doneTasks = tasks.filter(
    (t) => t.status === 'done' && t.doneAt && isInRange(t.doneAt, start, end),
  );
  const acvInRange = achievements.filter((a) =>
    isInRange(new Date(a.doneDate).toISOString(), start, end),
  );

  const involvedProjectIds = new Set(
    doneTasks.map((t) => t.projectId).filter(Boolean) as string[],
  );
  const involvedProjects = projects.filter((p) => involvedProjectIds.has(p.id));

  // Situation:所处阶段的业务背景 —— 参与的项目
  const situation = involvedProjects.length
    ? `本周期主要围绕 ${involvedProjects
        .map((p) => `${p.name}${p.progress ? `(${p.progress}%)` : ''}`)
        .join('、')} 等 ${involvedProjects.length} 个${projectName}推进工作。`
    : `本周期共完成 ${doneTasks.length} 项任务。(补充所处阶段的业务背景)`;

  // Task:承担的目标 —— 高优先级 / 计划内任务
  const highTasks = doneTasks.filter((t) => t.priority === 'high');
  const taskText = (highTasks.length ? highTasks : doneTasks)
    .slice(0, 6)
    .map((t) => `- ${t.title}`)
    .join('\n');
  const taskSection = taskText || '(补充本周期承担的核心目标与职责)';

  // Action:采取的关键行动 —— 已完成任务按项目分组
  const byProject = new Map<string, string[]>();
  doneTasks.forEach((t) => {
    const key = t.projectId
      ? projects.find((p) => p.id === t.projectId)?.name ?? '其他'
      : '其他';
    const arr = byProject.get(key) ?? [];
    arr.push(t.title);
    byProject.set(key, arr);
  });
  const actionText = [...byProject.entries()]
    .map(([name, items]) => `【${name}】\n${items.map((i) => `- ${i}`).join('\n')}`)
    .join('\n');
  const actionSection = actionText || '(补充为达成目标采取的关键行动)';

  // Result:产出与量化结果 —— 沉淀的成果 + metric + 项目进度
  const resultLines: string[] = [];
  resultLines.push(
    `本周期完成 ${doneTasks.length} 项任务,沉淀 ${acvInRange.length} 项${achievementName}。`,
  );
  acvInRange.forEach((a) => {
    resultLines.push(`- ${a.title}${a.metric ? ` — ${a.metric}` : ''}`);
  });
  involvedProjects
    .filter((p) => p.progress >= 50)
    .forEach((p) => resultLines.push(`- 推进 ${p.name} 至 ${p.progress}%`));
  const resultSection = resultLines.join('\n');

  return {
    situation,
    task: taskSection,
    action: actionSection,
    result: resultSection,
  };
}

export function applyReviewDraft(base: Review, drafted: Drafted): Review {
  return {
    ...base,
    situation: drafted.situation,
    task: drafted.task,
    action: drafted.action,
    result: drafted.result,
    updatedAt: new Date().toISOString(),
  };
}
