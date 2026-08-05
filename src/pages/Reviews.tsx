import { useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Trash2, Sparkles, FileDown } from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { PdfPreviewModal } from '@/components/ui/PdfPreviewModal';
import type { Review, ReviewPeriod } from '@/types';
import { getMonthRange, isInRange } from '@/lib/utils';
import { findTemplate } from '@/data/templates';
import { generateReviewDraft } from '@/features/reviews/generate';
import { reviewToMarkdown } from '@/lib/toMarkdown';

const periodLabel: Record<ReviewPeriod, string> = {
  quarter: '季度',
  half: '半年',
  year: '年度',
};

function currentPeriodRange(p: ReviewPeriod): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (p === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59);
    return { start, end, label: `${now.getFullYear()} Q${q + 1}` };
  }
  if (p === 'half') {
    const h = now.getMonth() < 6 ? 0 : 1;
    const start = new Date(now.getFullYear(), h * 6, 1);
    const end = new Date(now.getFullYear(), h * 6 + 6, 0, 23, 59, 59);
    return { start, end, label: `${now.getFullYear()} H${h + 1}` };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  return { start, end, label: `${now.getFullYear()}` };
}

export default function Reviews() {
  const t = useT();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const achievements = useStore((s) => s.achievements);
  const reviews = useStore((s) => s.reviews);
  const saveReview = useStore((s) => s.saveReview);
  const removeReview = useStore((s) => s.removeReview);
  const templateId = useStore((s) => s.profile.templateId);

  const [period, setPeriod] = useState<ReviewPeriod>('quarter');
  const [current, setCurrent] = useState<Review | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  const range = useMemo(() => currentPeriodRange(period), [period]);

  const metrics = useMemo(() => {
    const range = currentPeriodRange(period);
    const tasksDone = tasks.filter(
      (t) => t.status === 'done' && t.doneAt && isInRange(t.doneAt, range.start, range.end),
    ).length;
    const acvs = achievements.filter((a) =>
      isInRange(new Date(a.doneDate).toISOString(), range.start, range.end),
    ).length;
    const projectsInvolved = new Set(
      tasks
        .filter((t) => isInRange(t.doneAt, range.start, range.end))
        .map((t) => t.projectId)
        .filter(Boolean),
    ).size;
    return { tasksDone, achievementsAdded: acvs, projectsInvolved };
  }, [tasks, achievements, period]);

  const startNew = () => {
    const drafted = generateReviewDraft({
      period,
      periodStart: range.start.toISOString(),
      periodEnd: range.end.toISOString(),
      tasks,
      projects,
      achievements,
      template: findTemplate(templateId),
    });
    const draft: Review = {
      id: nanoid(8),
      period,
      periodStart: range.start.toISOString(),
      periodEnd: range.end.toISOString(),
      situation: drafted.situation,
      task: drafted.task,
      action: drafted.action,
      result: drafted.result,
      metrics,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveReview(draft);
    setCurrent(draft);
  };

  const list = reviews.filter((r) => r.period === period).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = current ?? list[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">{t('nav.reviews')}</h2>
        <div className="flex items-center gap-2">
          <select
            className="input w-32"
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReviewPeriod)}
          >
            {Object.entries(periodLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={startNew}>
            <Sparkles className="h-4 w-4" />
            自动生成复盘
          </button>
        </div>
      </div>

      <Card>
        <div className="text-sm text-[rgb(var(--muted))] mb-2">{range.label} 数据快照</div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="完成任务" value={metrics.tasksDone} />
          <Metric label={t('achievement.singular')} value={metrics.achievementsAdded} />
          <Metric label={`参与${t('nav.projects')}`} value={metrics.projectsInvolved} />
        </div>
      </Card>

      {active ? (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-[rgb(var(--muted))]">
              {active.periodStart.slice(0, 10)} - {active.periodEnd.slice(0, 10)}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-secondary" onClick={() => setPdfOpen(true)}>
                <FileDown className="h-4 w-4" />
                PDF
              </button>
              <button
                className="btn-ghost text-red-500"
                onClick={() => {
                  if (confirm('确认删除?')) {
                    removeReview(active.id);
                    setCurrent(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['situation', 'task', 'action', 'result'] as const).map((k) => (
              <div key={k}>
                <label className="text-xs text-[rgb(var(--muted))]">
                  {k === 'situation' ? 'Situation 背景'
                    : k === 'task' ? 'Task 任务'
                      : k === 'action' ? 'Action 行动'
                        : 'Result 结果'}
                </label>
                <textarea
                  className="input mt-1 h-32 resize-none"
                  value={(active as Review)[k] ?? ''}
                  onChange={(e) => {
                    const updated: Review = {
                      ...active,
                      [k]: e.target.value,
                      updatedAt: new Date().toISOString(),
                    };
                    saveReview(updated);
                    setCurrent(updated);
                  }}
                />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Empty
          title="点「自动生成复盘」开始"
          desc="每个周期结束前给自己一个小时,把 STAR 填一遍,绩效面谈/答辩/复投都能用。"
        />
      )}

      {list.length > 1 && (
        <Card>
          <div className="text-sm font-medium mb-2">历史复盘</div>
          <div className="space-y-1">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => setCurrent(r)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm flex items-center justify-between"
              >
                <span>{r.periodStart.slice(0, 10)} - {r.periodEnd.slice(0, 10)}</span>
                <span className="text-xs text-[rgb(var(--muted))]">{r.createdAt.slice(0, 10)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {active && (
        <PdfPreviewModal
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          title="复盘预览"
          content={reviewToMarkdown(active, findTemplate(templateId))}
          filename={`复盘_${active.periodStart.slice(0, 10)}`}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl px-3 py-3 bg-brand-500/5">
      <div className="text-xs text-[rgb(var(--muted))]">{label}</div>
      <div className="text-2xl font-semibold num mt-1">{value}</div>
    </div>
  );
}
