import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Folders,
  Trophy,
  FileText,
  PieChart,
  ChevronRight,
  Sparkles,
  Star,
} from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, CardTitle, Chip, Progress } from '@/components/ui/Card';
import { getMonthRange, getWeekRange, isInRange, pct, todayISO } from '@/lib/utils';

export default function Dashboard() {
  const t = useT();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const achievements = useStore((s) => s.achievements);
  const reports = useStore((s) => s.reports);
  const toggleTask = useStore((s) => s.toggleTask);

  const today = todayISO();
  const week = useMemo(() => getWeekRange(), []);
  const month = useMemo(() => getMonthRange(), []);

  const todayTasks = tasks.filter((t) => t.planDate === today);
  const todayDone = todayTasks.filter((t) => t.status === 'done').length;

  const todayAchievements = achievements.filter((a) => a.doneDate === today).length;
  const weekDoneTasks = tasks.filter(
    (t) => t.status === 'done' && isInRange(t.doneAt, week.start, week.end),
  ).length;
  const weekAchievements = achievements.filter((a) =>
    isInRange(new Date(a.doneDate).toISOString(), week.start, week.end),
  ).length;
  const weekReports = reports.filter((r) =>
    isInRange(r.createdAt, week.start, week.end),
  ).length;
  const monthAchievements = achievements.filter((a) =>
    isInRange(new Date(a.doneDate).toISOString(), month.start, month.end),
  ).length;

  const activeProjects = projects.filter((p) => p.status === 'active');
  const topProject = [...activeProjects].sort((a, b) => b.progress - a.progress)[0];

  const weekGoal = pct(weekDoneTasks, Math.max(weekDoneTasks, 25));

  return (
    <div className="space-y-6">
      {/* 战报卡 */}
      <Card className="!p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 text-brand-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">
            今天完成了 <span className="num">{todayDone}</span> 项工作
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Tile
            title="今日任务"
            value={`${todayDone}/${todayTasks.length}`}
            tone="green"
          />
          <Tile
            title={`${t('achievement.singular')}(今日)`}
            value={`${todayAchievements} 项`}
            tone="orange"
          />
          <Tile title="本周节奏" value={`${weekGoal}%`} tone="blue" />
        </div>
      </Card>

      {/* 5 大功能入口 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <EntryCard to="/tasks" icon={<ClipboardList />} title={t('nav.tasks')} desc="计划 · 执行" color="#22C55E" />
        <EntryCard to="/projects" icon={<Folders />} title={t('nav.projects')} desc="跟进 · 推进" color="#F59E0B" />
        <EntryCard to="/achievements" icon={<Trophy />} title={t('nav.achievements')} desc="沉淀 · 展示" color="#EAB308" />
        <EntryCard to="/reports" icon={<FileText />} title={t('nav.reports')} desc="总结 · 汇报" color="#3B82F6" />
        <EntryCard to="/reviews" icon={<PieChart />} title={t('nav.reviews')} desc="分析 · 提升" color="#A855F7" />
      </div>

      {/* 左右分栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 今日待办 */}
        <Card className="lg:col-span-2">
          <CardTitle
            action={
              <Link to="/tasks" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                查看更多 <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            今日待办({todayTasks.length} 项)
          </CardTitle>
          <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
            {todayTasks.length === 0 && (
              <div className="text-sm text-[rgb(var(--muted))] py-4">
                今天还没有安排,去
                <Link to="/tasks" className="text-brand-600 mx-1 hover:underline">
                  任务管理
                </Link>
                添加吧。
              </div>
            )}
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2.5 group"
              >
                <button onClick={() => toggleTask(task.id)} className="shrink-0">
                  {task.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-brand-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-[rgb(var(--muted))]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={
                      task.status === 'done'
                        ? 'text-sm line-through text-[rgb(var(--muted))]'
                        : 'text-sm'
                    }
                  >
                    {task.title}
                  </div>
                </div>
                {task.planTime && (
                  <div className="text-xs text-[rgb(var(--muted))] num shrink-0">
                    {task.planTime}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* 项目进度 + 本周 + 月度 */}
        <div className="space-y-4">
          <Card>
            <CardTitle
              action={
                <Link to="/projects" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  全部 {activeProjects.length} 个 <ChevronRight className="h-3 w-3" />
                </Link>
              }
            >
              {t('nav.projects')}进度
            </CardTitle>
            {topProject ? (
              <div>
                <div className="text-sm font-medium">{topProject.name}</div>
                <div className="mt-2">
                  <Progress value={topProject.progress} color={topProject.color} />
                </div>
                <div className="text-xs text-[rgb(var(--muted))] mt-2 num">
                  {topProject.progress}%
                </div>
              </div>
            ) : (
              <div className="text-sm text-[rgb(var(--muted))]">还没有进行中的{t('nav.projects')}。</div>
            )}
          </Card>

          <Card>
            <CardTitle>本周概览</CardTitle>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-500" />
                本周完成 <b className="num">{weekDoneTasks}</b> 项任务
              </li>
              <li className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                本周新增 <b className="num">{weekAchievements}</b> 项{t('achievement.singular')}
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                本周生成 <b className="num">{weekReports}</b> 份{t('nav.reports')}
              </li>
            </ul>
          </Card>

          <Card>
            <CardTitle>月度{t('achievement.singular')}</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-amber-500" />
              本月已沉淀
              <b className="num text-xl mx-1">{monthAchievements}</b>
              项{t('achievement.singular')}
            </div>
          </Card>
        </div>
      </div>

      <div className="text-center text-sm text-[rgb(var(--muted))]">
        🎯 把每天做过的事,变成可复盘、可汇报、可沉淀的{t('achievement.singular')}记录
      </div>
    </div>
  );
}

interface TileProps {
  title: string;
  value: string;
  tone: 'green' | 'orange' | 'blue';
}
function Tile({ title, value, tone }: TileProps) {
  const colors = {
    green: 'text-brand-600 bg-brand-500/10',
    orange: 'text-amber-600 bg-amber-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
  }[tone];
  return (
    <div className={`rounded-xl px-4 py-3 ${colors}`}>
      <div className="text-xs opacity-80">{title}</div>
      <div className="text-2xl font-semibold mt-1 num">{value}</div>
    </div>
  );
}

interface EntryProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}
function EntryCard({ to, icon, title, desc, color }: EntryProps) {
  return (
    <Link
      to={to}
      className="card p-3 hover:shadow-md transition-shadow flex flex-col gap-2"
    >
      <div
        className="h-9 w-9 rounded-lg grid place-items-center"
        style={{ background: `${color}20`, color }}
      >
        <div className="[&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      </div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-[rgb(var(--muted))]">{desc}</div>
    </Link>
  );
}

// avoid unused warning in strict mode
void Chip;
