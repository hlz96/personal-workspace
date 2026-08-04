import { useMemo, useState } from 'react';
import { Plus, Trophy, Trash2, Edit3 } from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, Chip } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { todayISO } from '@/lib/utils';
import type { Achievement } from '@/types';

export default function Achievements() {
  const t = useT();
  const achievements = useStore((s) => s.achievements);
  const projects = useStore((s) => s.projects);
  const template = useStore((s) => s.templates.find((tpl) => tpl.id === s.profile.templateId));
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [creating, setCreating] = useState(false);
  const removeAchievement = useStore((s) => s.removeAchievement);

  const byMonth = useMemo(() => {
    const map = new Map<string, Achievement[]>();
    [...achievements]
      .sort((a, b) => b.doneDate.localeCompare(a.doneDate))
      .forEach((a) => {
        const key = a.doneDate.slice(0, 7);
        const arr = map.get(key) ?? [];
        arr.push(a);
        map.set(key, arr);
      });
    return [...map.entries()];
  }, [achievements]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('nav.achievements')}</h2>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          新建{t('achievement.singular')}
        </button>
      </div>

      {achievements.length === 0 ? (
        <Empty
          title={`还没有${t('achievement.singular')}`}
          desc={`把可以拿出手的产出记下来,几个月后它就是你的素材库。`}
          action={
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              新建
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {byMonth.map(([month, list]) => (
            <div key={month}>
              <div className="text-sm text-[rgb(var(--muted))] mb-2 num">{month}</div>
              <div className="space-y-2">
                {list.map((a) => {
                  const project = projects.find((p) => p.id === a.projectId);
                  const typeLabel =
                    template?.achievementTypes.find((x) => x.value === a.type)?.label ?? a.type;
                  return (
                    <Card key={a.id} className="group">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center shrink-0">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium">{a.title}</div>
                            <Chip color="#F59E0B">{typeLabel}</Chip>
                            {project && (
                              <Chip color={project.color}>{project.name}</Chip>
                            )}
                            <div className="text-xs text-[rgb(var(--muted))] num ml-auto">
                              {a.doneDate}
                            </div>
                          </div>
                          {a.description && (
                            <div className="text-sm text-[rgb(var(--muted))] mt-1">
                              {a.description}
                            </div>
                          )}
                          {a.metric && (
                            <div className="mt-1 text-sm text-brand-600">📊 {a.metric}</div>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button className="btn-ghost h-8 w-8 !p-0" onClick={() => setEditing(a)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="btn-ghost h-8 w-8 !p-0 hover:text-red-500"
                            onClick={() => {
                              if (confirm('确认删除?')) removeAchievement(a.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AchievementModal
        open={creating || !!editing}
        editing={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function AchievementModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Achievement | null;
  onClose: () => void;
}) {
  const t = useT();
  const projects = useStore((s) => s.projects);
  const addAchievement = useStore((s) => s.addAchievement);
  const updateAchievement = useStore((s) => s.updateAchievement);
  const template = useStore((s) => s.templates.find((tpl) => tpl.id === s.profile.templateId));

  const types = template?.achievementTypes ?? [
    { value: 'report', label: '报告' },
    { value: 'project', label: '项目' },
    { value: 'other', label: '其他' },
  ];

  const [title, setTitle] = useState(editing?.title ?? '');
  const [type, setType] = useState(editing?.type ?? types[0].value);
  const [projectId, setProjectId] = useState(editing?.projectId ?? '');
  const [doneDate, setDoneDate] = useState(editing?.doneDate ?? todayISO());
  const [description, setDescription] = useState(editing?.description ?? '');
  const [metric, setMetric] = useState(editing?.metric ?? '');

  useMemo(() => {
    setTitle(editing?.title ?? '');
    setType(editing?.type ?? types[0].value);
    setProjectId(editing?.projectId ?? '');
    setDoneDate(editing?.doneDate ?? todayISO());
    setDescription(editing?.description ?? '');
    setMetric(editing?.metric ?? '');
  }, [editing]);

  const submit = () => {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      type: type as Achievement['type'],
      projectId: projectId || undefined,
      doneDate,
      description,
      metric,
    };
    if (editing) updateAchievement(editing.id, data);
    else addAchievement(data);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={editing ? `编辑${t('achievement.singular')}` : `新建${t('achievement.singular')}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>
            保存
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">标题</label>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="《库存异常分析》报告"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">类型</label>
            <select
              className="input mt-1"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {types.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">关联{t('nav.projects')}</label>
            <select
              className="input mt-1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">(未关联)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">完成日期</label>
          <input
            type="date"
            className="input mt-1"
            value={doneDate}
            onChange={(e) => setDoneDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">量化数据(推荐)</label>
          <input
            className="input mt-1"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="效率提升 30% · 覆盖 25 人 · 释放库存 30 万"
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))]">描述</label>
          <textarea
            className="input mt-1 resize-none h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="用 STAR 法则:背景、任务、行动、结果"
          />
        </div>
      </div>
    </Modal>
  );
}
