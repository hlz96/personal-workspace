import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, Chip } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { getWeekRange, todayISO, cn } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types';

type Scope = 'today' | 'week' | 'later' | 'done';

const scopeLabel: Record<Scope, string> = {
  today: '今天',
  week: '本周',
  later: '稍后',
  done: '已完成',
};

const priorityColor: Record<TaskPriority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#94A3B8',
};

const priorityLabel: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function Tasks() {
  const t = useT();
  const [scope, setScope] = useState<Scope>('today');
  const [creating, setCreating] = useState(false);

  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const toggleTask = useStore((s) => s.toggleTask);
  const removeTask = useStore((s) => s.removeTask);

  const today = todayISO();
  const week = useMemo(() => getWeekRange(), []);

  const filtered = useMemo(() => {
    if (scope === 'today') {
      return tasks.filter((t) => t.status !== 'done' && t.planDate === today);
    }
    if (scope === 'week') {
      return tasks.filter((t) => {
        if (t.status === 'done') return false;
        if (!t.planDate) return false;
        const d = new Date(t.planDate).getTime();
        return d >= week.start.getTime() && d <= week.end.getTime();
      });
    }
    if (scope === 'later') {
      return tasks.filter((t) => t.status !== 'done' && !t.planDate);
    }
    return tasks.filter((t) => t.status === 'done');
  }, [tasks, scope, today, week]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    filtered.forEach((t) => {
      const key = t.projectId ?? 'orphan';
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('nav.tasks')}</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          新建任务
        </button>
      </div>

      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
        {(Object.keys(scopeLabel) as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px',
              scope === s
                ? 'border-brand-500 text-brand-600 font-medium'
                : 'border-transparent text-[rgb(var(--muted))]',
            )}
          >
            {scopeLabel[s]}
            <span className="ml-1 num text-xs">
              ({s === 'done'
                ? tasks.filter((t) => t.status === 'done').length
                : s === 'today'
                  ? tasks.filter((t) => t.status !== 'done' && t.planDate === today).length
                  : s === 'week'
                    ? tasks.filter((t) => {
                        if (t.status === 'done') return false;
                        if (!t.planDate) return false;
                        const d = new Date(t.planDate).getTime();
                        return d >= week.start.getTime() && d <= week.end.getTime();
                      }).length
                    : tasks.filter((t) => t.status !== 'done' && !t.planDate).length})
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty
          title="这里空空如也"
          desc="点右上角「新建任务」开始记录第一件事。"
          action={
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              新建任务
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {grouped.map(([key, list]) => {
            const project = projects.find((p) => p.id === key);
            return (
              <Card key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: project?.color ?? '#94A3B8' }}
                  />
                  <div className="text-sm font-medium">
                    {project?.name ?? '未关联项目'}
                  </div>
                  <div className="text-xs text-[rgb(var(--muted))] num">{list.length}</div>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                  {list.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 py-2 group">
                      <button onClick={() => toggleTask(task.id)}>
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 text-brand-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-[rgb(var(--muted))]" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm',
                            task.status === 'done' && 'line-through text-[rgb(var(--muted))]',
                          )}
                        >
                          {task.title}
                        </div>
                        {task.note && (
                          <div className="text-xs text-[rgb(var(--muted))] mt-0.5">
                            {task.note}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <Chip color={priorityColor[task.priority]}>
                          {priorityLabel[task.priority]}
                        </Chip>
                        {task.planDate && (
                          <span className="text-[rgb(var(--muted))] num">
                            {task.planDate.slice(5)}
                            {task.planTime ? ' ' + task.planTime : ''}
                          </span>
                        )}
                        {task.isAchievement && (
                          <Sparkles className="h-3 w-3 text-amber-500" />
                        )}
                        <button
                          onClick={() => removeTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-[rgb(var(--muted))] hover:text-red-500"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TaskCreateModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function TaskCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTask = useStore((s) => s.addTask);
  const projects = useStore((s) => s.projects);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(projects[0]?.id);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [planDate, setPlanDate] = useState(todayISO());
  const [planTime, setPlanTime] = useState('');
  const [isAchievement, setIsAchievement] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      projectId,
      priority,
      planDate: planDate || undefined,
      planTime: planTime || undefined,
      isAchievement,
    });
    setTitle('');
    setPlanTime('');
    setIsAchievement(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="新建任务"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
            创建
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">任务标题</label>
          <input
            autoFocus
            className="input mt-1"
            placeholder="比如:输出库存异常分析"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">关联项目</label>
            <div className="relative mt-1">
              <select
                className="input appearance-none pr-8"
                value={projectId ?? ''}
                onChange={(e) => setProjectId(e.target.value || undefined)}
              >
                <option value="">(未关联)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[rgb(var(--muted))]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">优先级</label>
            <div className="mt-1 flex gap-1">
              {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 rounded-lg border text-sm py-1.5',
                    priority === p ? 'border-brand-500 bg-brand-500/5' : '',
                  )}
                  style={{ borderColor: priority === p ? '#22C55E' : 'rgb(var(--border))' }}
                >
                  {priorityLabel[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">计划日期</label>
            <input
              type="date"
              className="input mt-1"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">时段(可选)</label>
            <input
              type="time"
              className="input mt-1"
              value={planTime}
              onChange={(e) => setPlanTime(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAchievement}
            onChange={(e) => setIsAchievement(e.target.checked)}
            className="accent-brand-500"
          />
          <span>标记为「成果类」,完成后一键沉淀</span>
        </label>
      </div>
    </Modal>
  );
}
