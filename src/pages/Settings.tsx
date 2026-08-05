import { useRef, useState } from 'react';
import { Download, Upload, RefreshCcw, Palette, User } from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/lib/useT';
import { Card, CardTitle } from '@/components/ui/Card';
import { templates } from '@/data/templates';
import type { Identity, Cadence, UserSettings } from '@/types';

const identityLabel: Record<Identity, string> = {
  worker: '职场人',
  student: '学生',
  freelancer: '自由职业',
  founder: '创业者',
  jobseeker: '待业 / 规划',
};

const cadenceLabel: Record<Cadence, string> = {
  weekly: '每周',
  biweekly: '每两周',
  monthly: '每月',
  ondemand: '按需',
};

export default function Settings() {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateProfile = useStore((s) => s.updateProfile);
  const switchTemplate = useStore((s) => s.switchTemplate);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const resetAll = useStore((s) => s.resetAll);

  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const filteredTemplates = templates.filter((tpl) => tpl.identity === profile.identity);

  const doExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('已导出数据快照');
  };

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJSON(String(reader.result));
      setStatus(ok ? '导入成功' : '导入失败:数据格式错误');
    };
    reader.readAsText(f);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t('nav.settings')}</h2>

      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <User className="h-4 w-4" /> 个人信息
          </span>
        </CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">昵称</label>
            <input
              className="input mt-1"
              value={settings.name}
              placeholder="给自己起个名字,会显示在顶部问候语"
              onChange={(e) => updateSettings({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">主题</label>
            <select
              className="input mt-1"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as UserSettings['theme'] })}
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="auto">跟随系统</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Palette className="h-4 w-4" /> 身份与模板
          </span>
        </CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">身份</label>
            <select
              className="input mt-1"
              value={profile.identity}
              onChange={(e) => {
                const nextIdentity = e.target.value as Identity;
                updateProfile({ identity: nextIdentity });
                const first = templates.find((tpl) => tpl.identity === nextIdentity);
                if (first) switchTemplate(first.id);
              }}
            >
              {Object.entries(identityLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[rgb(var(--muted))]">总结节奏</label>
            <select
              className="input mt-1"
              value={profile.cadence}
              onChange={(e) => updateProfile({ cadence: e.target.value as Cadence })}
            >
              {Object.entries(cadenceLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-[rgb(var(--muted))]">场景模板</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
            {filteredTemplates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => switchTemplate(tpl.id)}
                className="text-left rounded-xl border p-3"
                style={{
                  borderColor:
                    profile.templateId === tpl.id ? '#22C55E' : 'rgb(var(--border))',
                  background: profile.templateId === tpl.id ? 'rgba(34,197,94,0.05)' : 'transparent',
                }}
              >
                <div className="font-medium">{tpl.name}</div>
                <div className="text-xs text-[rgb(var(--muted))] mt-1">
                  {tpl.projectSamples.map((s) => s.name).join(' · ')}
                </div>
              </button>
            ))}
          </div>
          <div className="text-xs text-[rgb(var(--muted))] mt-2">
            切换模板会改变导航文案与成果类型的默认选项,不会动已有数据。
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>数据管理</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={doExport}>
            <Download className="h-4 w-4" />
            导出 JSON
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
          <button
            className="btn-ghost text-red-500"
            onClick={() => {
              if (confirm('确认重置全部数据?此操作不可撤销,建议先导出。')) {
                resetAll();
                setStatus('已重置为初始示例数据');
              }
            }}
          >
            <RefreshCcw className="h-4 w-4" />
            重置全部数据
          </button>
          {status && <span className="text-xs text-brand-600 ml-2">{status}</span>}
        </div>
        <div className="text-xs text-[rgb(var(--muted))] mt-3 leading-relaxed">
          Phase 0 数据保存在浏览器本地,建议每周导出一份 JSON 快照。切换电脑或浏览器前先导出;
          后续接入云端后会提供「一键同步」按钮。
        </div>
      </Card>
    </div>
  );
}
