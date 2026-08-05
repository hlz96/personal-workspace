import type { Achievement, Project, Review, Template } from '@/types';

const periodLabel: Record<Review['period'], string> = {
  quarter: '季度',
  half: '半年',
  year: '年度',
};

export function reviewToMarkdown(review: Review, template: Template): string {
  const title = template.terminology['review.title'] ?? '周期复盘';
  const start = review.periodStart.slice(0, 10);
  const end = review.periodEnd.slice(0, 10);
  const lines: string[] = [];
  lines.push(`# ${title}(${periodLabel[review.period]})`);
  lines.push(`${start} - ${end}`);
  lines.push('');
  lines.push('## Situation 背景');
  lines.push(review.situation?.trim() || '_(未填写)_');
  lines.push('');
  lines.push('## Task 任务');
  lines.push(review.task?.trim() || '_(未填写)_');
  lines.push('');
  lines.push('## Action 行动');
  lines.push(review.action?.trim() || '_(未填写)_');
  lines.push('');
  lines.push('## Result 结果');
  lines.push(review.result?.trim() || '_(未填写)_');
  if (review.metrics) {
    lines.push('');
    lines.push('## 数据快照');
    lines.push(`- 完成任务:${review.metrics.tasksDone}`);
    lines.push(`- 沉淀${template.terminology['achievement.singular'] ?? '成果'}:${review.metrics.achievementsAdded}`);
    lines.push(`- 参与${template.terminology['nav.projects'] ?? '项目'}:${review.metrics.projectsInvolved}`);
  }
  return lines.join('\n');
}

export function achievementToMarkdown(
  a: Achievement,
  project: Project | undefined,
  template: Template,
): string {
  const typeLabel =
    template.achievementTypes.find((x) => x.value === a.type)?.label ?? a.type;
  const lines: string[] = [];
  lines.push(`# ${a.title}`);
  lines.push('');
  const meta: string[] = [`类型:${typeLabel}`, `完成日期:${a.doneDate}`];
  if (project) meta.push(`关联${template.terminology['nav.projects'] ?? '项目'}:${project.name}`);
  lines.push(meta.join(' · '));
  if (a.metric) {
    lines.push('');
    lines.push(`**量化结果**:${a.metric}`);
  }
  if (a.description) {
    lines.push('');
    lines.push('## 详情');
    lines.push(a.description);
  }
  return lines.join('\n');
}
