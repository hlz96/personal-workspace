import { useMemo } from 'react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, CardTitle } from '@/components/ui/Card';
import { getMonthRange, isInRange } from '@/lib/utils';

export default function Stats() {
  const t = useT();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const achievements = useStore((s) => s.achievements);

  const last30 = useMemo(() => {
    const days: { date: string; done: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = tasks.filter((t) => t.status === 'done' && t.doneAt?.slice(0, 10) === key).length;
      days.push({ date: key, done: count });
    }
    return days;
  }, [tasks]);

  const maxDone = Math.max(1, ...last30.map((d) => d.done));

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    achievements.forEach((a) => {
      map.set(a.type, (map.get(a.type) ?? 0) + 1);
    });
    return [...map.entries()].map(([type, count]) => ({ type, count }));
  }, [achievements]);
  const acvTotal = Math.max(1, achievements.length);

  const byProject = useMemo(() => {
    return projects.map((p) => {
      const count = tasks.filter((t) => t.projectId === p.id).length;
      return { name: p.name, color: p.color, count };
    });
  }, [projects, tasks]);
  const projectMax = Math.max(1, ...byProject.map((x) => x.count));

  const monthRange = getMonthRange();
  const monthDone = tasks.filter((t) => isInRange(t.doneAt, monthRange.start, monthRange.end) && t.status === 'done').length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t('nav.stats')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardTitle>本月完成任务</CardTitle>
          <div className="text-3xl font-semibold num">{monthDone}</div>
        </Card>
        <Card>
          <CardTitle>{t('achievement.singular')}总数</CardTitle>
          <div className="text-3xl font-semibold num">{achievements.length}</div>
        </Card>
        <Card>
          <CardTitle>{t('nav.projects')}总数</CardTitle>
          <div className="text-3xl font-semibold num">{projects.length}</div>
        </Card>
      </div>

      <Card>
        <CardTitle>近 30 天任务完成趋势</CardTitle>
        <div className="flex items-end gap-1 h-32">
          {last30.map((d) => (
            <div
              key={d.date}
              className="flex-1 relative group"
              title={`${d.date}: ${d.done}`}
            >
              <div
                className="w-full bg-brand-500 rounded-t"
                style={{ height: `${(d.done / maxDone) * 100}%`, minHeight: d.done > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-[rgb(var(--muted))] mt-2 num">
          <span>{last30[0].date.slice(5)}</span>
          <span>{last30[last30.length - 1].date.slice(5)}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardTitle>{t('achievement.singular')}分类</CardTitle>
          {byType.length === 0 ? (
            <div className="text-sm text-[rgb(var(--muted))]">暂无数据</div>
          ) : (
            <div className="space-y-2">
              {byType.map((x) => (
                <div key={x.type} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span>{x.type}</span>
                    <span className="num text-xs text-[rgb(var(--muted))]">
                      {x.count} · {Math.round((x.count / acvTotal) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(x.count / acvTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{t('nav.projects')}任务分布</CardTitle>
          {byProject.length === 0 ? (
            <div className="text-sm text-[rgb(var(--muted))]">暂无数据</div>
          ) : (
            <div className="space-y-2">
              {byProject.map((x) => (
                <div key={x.name} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: x.color }} />
                      {x.name}
                    </span>
                    <span className="num text-xs text-[rgb(var(--muted))]">{x.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(x.count / projectMax) * 100}%`,
                        background: x.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
