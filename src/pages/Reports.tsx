import { useMemo, useState } from 'react';
import { Copy, Download, FileText, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, Chip } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { generateReport } from '@/features/reports/generate';
import type { Report, ReportType } from '@/types';
import { cn } from '@/lib/utils';

export default function Reports() {
  const t = useT();
  const reports = useStore((s) => s.reports);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const achievements = useStore((s) => s.achievements);
  const template = useStore((s) => s.templates.find((tpl) => tpl.id === s.profile.templateId));
  const saveReport = useStore((s) => s.saveReport);
  const removeReport = useStore((s) => s.removeReport);

  const [type, setType] = useState<ReportType>('weekly');
  const [current, setCurrent] = useState<Report | null>(null);

  const list = useMemo(
    () => [...reports].filter((r) => r.type === type).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports, type],
  );

  const activeReport = current ?? list[0] ?? null;

  const doGenerate = () => {
    if (!template) return;
    const draft = generateReport({
      type,
      tasks,
      projects,
      achievements,
      template,
    });
    saveReport(draft);
    setCurrent(draft);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t('nav.reports')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-0.5 text-sm" style={{ borderColor: 'rgb(var(--border))' }}>
            <button
              className={cn('px-2 py-1 rounded-md', type === 'weekly' ? 'bg-brand-500 text-white' : '')}
              onClick={() => setType('weekly')}
            >
              周报
            </button>
            <button
              className={cn('px-2 py-1 rounded-md', type === 'monthly' ? 'bg-brand-500 text-white' : '')}
              onClick={() => setType('monthly')}
            >
              月报
            </button>
          </div>
          <button className="btn-primary" onClick={doGenerate}>
            <Sparkles className="h-4 w-4" />
            自动生成
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2">
          {list.length === 0 ? (
            <Empty
              title={`还没有${type === 'weekly' ? '周报' : '月报'}`}
              desc="点右上角「自动生成」,一键把留痕聚合成草稿。"
            />
          ) : (
            list.map((r) => (
              <button
                key={r.id}
                onClick={() => setCurrent(r)}
                className={cn(
                  'w-full text-left card p-3 transition',
                  activeReport?.id === r.id ? 'ring-2 ring-brand-500' : '',
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-500" />
                  <div className="text-sm font-medium">
                    {r.periodStart.slice(0, 10)} - {r.periodEnd.slice(0, 10)}
                  </div>
                  {r.edited && <Chip color="#F59E0B">已编辑</Chip>}
                </div>
                <div className="text-xs text-[rgb(var(--muted))] num mt-1">
                  {r.createdAt.slice(0, 16).replace('T', ' ')}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {activeReport ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-[rgb(var(--muted))]">
                  {activeReport.periodStart.slice(0, 10)} - {activeReport.periodEnd.slice(0, 10)}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(activeReport.content).then(() => {
                        alert('已复制到剪贴板');
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    复制
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const blob = new Blob([activeReport.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${type}-${activeReport.periodStart.slice(0, 10)}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    下载
                  </button>
                  <button
                    className="btn-ghost text-red-500"
                    onClick={() => {
                      if (confirm('确认删除?')) {
                        removeReport(activeReport.id);
                        setCurrent(null);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <textarea
                className="w-full h-[500px] rounded-lg border bg-transparent p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 font-mono"
                style={{ borderColor: 'rgb(var(--border))' }}
                value={activeReport.content}
                onChange={(e) => {
                  const updated: Report = {
                    ...activeReport,
                    content: e.target.value,
                    edited: true,
                    updatedAt: new Date().toISOString(),
                  };
                  saveReport(updated);
                  setCurrent(updated);
                }}
              />
            </Card>
          ) : (
            <Card>
              <div className="text-sm text-[rgb(var(--muted))] py-10 text-center">
                点右上角自动生成,或从左侧选一份查看。
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
