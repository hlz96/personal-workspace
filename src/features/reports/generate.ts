import { nanoid } from 'nanoid';
import type {
  Achievement,
  Project,
  Report,
  ReportType,
  Task,
  Template,
} from '@/types';
import { getMonthRange, getWeekRange, isInRange } from '@/lib/utils';

interface GenerateInput {
  type: ReportType;
  tasks: Task[];
  projects: Project[];
  achievements: Achievement[];
  template: Template;
  base?: Date;
}

interface ByProject {
  projectId: string | 'orphan';
  projectName: string;
  color?: string;
  tasks: string[];
  achievements: Achievement[];
  progress?: number;
}

export function generateReport(input: GenerateInput): Report {
  const { type, tasks, projects, achievements, template, base = new Date() } = input;
  const range = type === 'weekly' ? getWeekRange(base) : getMonthRange(base);

  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();

  const doneTasks = tasks.filter(
    (t) => t.status === 'done' && t.doneAt && isInRange(t.doneAt, range.start, range.end),
  );
  const acvInRange = achievements.filter((a) =>
    isInRange(new Date(a.doneDate).toISOString(), range.start, range.end),
  );

  const byProjectMap = new Map<string, ByProject>();
  const pushProject = (id: string) => {
    if (byProjectMap.has(id)) return byProjectMap.get(id)!;
    if (id === 'orphan') {
      const b: ByProject = { projectId: 'orphan', projectName: '其他', tasks: [], achievements: [] };
      byProjectMap.set(id, b);
      return b;
    }
    const p = projects.find((x) => x.id === id);
    const b: ByProject = {
      projectId: id,
      projectName: p?.name ?? '未命名',
      color: p?.color,
      tasks: [],
      achievements: [],
      progress: p?.progress,
    };
    byProjectMap.set(id, b);
    return b;
  };
  doneTasks.forEach((t) => {
    const b = pushProject(t.projectId ?? 'orphan');
    b.tasks.push(t.title);
  });
  acvInRange.forEach((a) => {
    const b = pushProject(a.projectId ?? 'orphan');
    b.achievements.push(a);
  });

  const groups = [...byProjectMap.values()];

  const highlights: string[] = [];
  acvInRange
    .filter((a) => a.metric)
    .slice(0, 2)
    .forEach((a) => highlights.push(`产出 ${a.title} — ${a.metric}`));
  groups
    .filter((g) => g.progress && g.progress >= 50)
    .slice(0, 2)
    .forEach((g) => highlights.push(`推进 ${g.projectName} 至 ${g.progress}%`));
  if (doneTasks.length > 0) {
    const highs = doneTasks.filter((t) => t.priority === 'high').length;
    if (highs >= 3) highlights.push(`完成 ${highs} 项高优先级任务`);
  }

  const nextPlans = tasks
    .filter((t) => t.status !== 'done' && t.planDate)
    .slice(0, 5)
    .map((t) => t.title);

  const dateStr = (d: Date) => d.toISOString().slice(0, 10);

  const content = renderMarkdown({
    type,
    title: type === 'weekly'
      ? template.terminology['report.weekly.title'] ?? '本周工作总结'
      : template.terminology['report.monthly.title'] ?? '本月工作总结',
    periodStart: dateStr(range.start),
    periodEnd: dateStr(range.end),
    summary: {
      tasksDone: doneTasks.length,
      achievementsAdded: acvInRange.length,
      projectsAdvanced: groups.filter((g) => g.projectId !== 'orphan').length,
    },
    highlights,
    byProject: groups,
    nextPlans,
    achievementName: template.terminology['achievement.singular'] ?? '成果',
    projectName: template.terminology['nav.projects'] ?? '项目',
    period: type === 'weekly' ? '周' : '月',
  });

  const report: Report = {
    id: nanoid(8),
    type,
    periodStart: startISO,
    periodEnd: endISO,
    content,
    status: 'draft',
    edited: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return report;
}

interface RenderCtx {
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  summary: { tasksDone: number; achievementsAdded: number; projectsAdvanced: number };
  highlights: string[];
  byProject: ByProject[];
  nextPlans: string[];
  achievementName: string;
  projectName: string;
  period: string;
}

// 简易模板渲染,避免额外依赖 Handlebars
function renderMarkdown(ctx: RenderCtx) {
  const lines: string[] = [];
  lines.push(`【${ctx.title}】${ctx.periodStart} - ${ctx.periodEnd}`);
  lines.push('');
  lines.push(`## 一、本${ctx.period}概览`);
  lines.push(
    `本${ctx.period}共完成 **${ctx.summary.tasksDone} 项** 任务,沉淀 **${ctx.summary.achievementsAdded} 项** ${ctx.achievementName},推进 **${ctx.summary.projectsAdvanced} 个** ${ctx.projectName}。`,
  );
  lines.push('');
  if (ctx.highlights.length) {
    lines.push('## 二、高光时刻');
    ctx.highlights.forEach((h) => lines.push(`- ${h}`));
    lines.push('');
  }
  lines.push(`## 三、分${ctx.projectName}进展`);
  if (ctx.byProject.length === 0) {
    lines.push('_(本${ctx.period}暂无关联事项)_');
  } else {
    ctx.byProject.forEach((g) => {
      lines.push(`### ${g.projectName}${g.progress !== undefined ? ` (${g.progress}%)` : ''}`);
      g.tasks.forEach((tt) => lines.push(`- ${tt}`));
      g.achievements.forEach((a) => {
        lines.push(`- 🏆 **${ctx.achievementName}**:${a.title}${a.metric ? ` — ${a.metric}` : ''}`);
      });
      lines.push('');
    });
  }
  lines.push(`## 四、下${ctx.period}计划`);
  if (ctx.nextPlans.length === 0) lines.push('_(尚未安排)_');
  else ctx.nextPlans.forEach((p) => lines.push(`- ${p}`));
  lines.push('');
  lines.push('## 五、需要支持');
  lines.push('_(在这里补充需要协调的资源、卡点、风险)_');
  return lines.join('\n');
}
