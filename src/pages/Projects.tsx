import { useMemo, useState } from 'react';
import { Plus, Trash2, Target, Edit3 } from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, Chip, Progress } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import type { Project, ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusLabel: Record<ProjectStatus, string> = {
  active: '进行中',
  paused: '暂停',
  done: '已完成',
  archived: '已归档',
};
const statusColor: Record<ProjectStatus, string> = {
  active: '#22C55E',
  paused: '#F59E0B',
  done: '#3B82F6',
  archived: '#94A3B8',
};

const palette = [
  '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316',
];

export default function Projects() {
  const t = useT();
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const achievements = useStore((s) => s.achievements);
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('nav.projects')}</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          新建{t('nav.projects')}
        </button>
      </div>

      {projects.length === 0 ? (
        <Empty
          title={`还没有${t('nav.projects')}`}
          desc="把你正在推进的主线放进来,方便聚合任务与成果。"
          action={
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              新建
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => {
            const taskCount = tasks.filter((t) => t.projectId === p.id).length;
            const doneCount = tasks.filter((t) => t.projectId === p.id && t.status === 'done').length;
            const acvCount = achievements.filter((a) => a.projectId === p.id).length;
            return (
              <Card key={p.id} className="group">
                <div className="flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `${p.color}20`, color: p.color }}
                  >
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{p.name}</div>
                      <Chip color={statusColor[p.status]}>{statusLabel[p.status]}</Chip>
                    </div>
                    {p.description && (
                      <div className="text-xs text-[rgb(var(--muted))] mt-1 line-clamp-2">
                        {p.description}
                      </div>
                    )}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))] mb-1">
                        <span>进度</span>
                        <span className="num">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} color={p.color} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[rgb(var(--muted))] mt-3">
                      <span>任务 <b className="num">{doneCount}/{taskCount}</b></span>
                      <span>{t('achievement.singular')} <b className="num">{acvCount}</b></span>
                      <span>里程碑 <b className="num">{p.milestones.length}</b></span>
                    </div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 btn-ghost h-8 w-8 !p-0"
                    onClick={() => setEditing(p)}
                    title="编辑"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectModal
        open={creating || !!editing}
        project={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function ProjectModal({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const t = useT();
  const addProject = useStore((s) => s.addProject);
  const updateProject = useStore((s) => s.updateProject);
  const removeProject = useStore((s) => s.removeProject);

  const isNew = !project;

  const [name, setName] = useState(project?.name ?? '');
  const [desc, setDesc] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? palette[0]);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active');
  const [manual, setManual] = useState(project?.manualProgress ?? false);
  const [progress, setProgress] = useState(project?.progress ?? 0);

  useMemo(() => {
    setName(project?.name ?? '');
    setDesc(project?.description ?? '');
    setColor(project?.color ?? palette[0]);
    setStatus(project?.status ?? 'active');
    setManual(project?.manualProgress ?? false);
    setProgress(project?.progress ?? 0);
  }, [project]);

  const submit = () => {
    if (!name.trim()) return;
    if (isNew) {
      addProject({
        name: name.trim(),
        description: desc,
        color,
        status,
        manualProgress: manual,
        progress,
      });
    } else if (project) {
      updateProject(project.id, {
        name: name.trim(),
        description: desc,
        color,
        status,
        manualProgress: manual,
        progress,
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={isNew ? `新建${t('nav.projects')}` : `编辑${t('nav.projects')}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && project && (
            <button
              className="btn-ghost text-red-500 mr-auto"
              onClick={() => {
                if (confirm('确认删除?已关联任务与成果的关联会被清空。')) {
                  removeProject(project.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
            保存
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">名称</label>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`比如:库存预警优化${t('nav.projects')}`}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">描述</label>
          <textarea
            className="input mt-1 resize-none h-20"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">颜色</label>
          <div className="flex gap-2 mt-1">
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-transform',
                  c === color ? 'scale-110' : 'border-transparent',
                )}
                style={{ background: c, borderColor: c === color ? '#fff' : 'transparent', boxShadow: c === color ? `0 0 0 2px ${c}` : 'none' }}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">状态</label>
            <select
              className="input mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {Object.entries(statusLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">进度</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                onMouseDown={() => setManual(true)}
                onTouchStart={() => setManual(true)}
                className="flex-1 accent-brand-500"
              />
              <span className="text-sm num w-10 text-right">{progress}%</span>
            </div>
            <label className="flex items-center gap-1 text-xs text-[rgb(var(--muted))] mt-1">
              <input
                type="checkbox"
                checked={manual}
                onChange={(e) => setManual(e.target.checked)}
                className="accent-brand-500"
              />
              手动设定进度(默认按任务自动算)
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
