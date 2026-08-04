import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useStore } from '@/store';
import { templates } from '@/data/templates';
import type { Cadence, Identity } from '@/types';
import { cn } from '@/lib/utils';

interface Step {
  key: 'identity' | 'template' | 'cadence';
  title: string;
}

const steps: Step[] = [
  { key: 'identity', title: '你现在的身份是?' },
  { key: 'template', title: '选择一个更贴近的场景模板' },
  { key: 'cadence', title: '你希望多久总结一次?' },
];

const identityOptions: Array<{ value: Identity; label: string; desc: string }> = [
  { value: 'worker', label: '职场人', desc: '有工作项目、周报、绩效' },
  { value: 'student', label: '学生', desc: '课程、作业、比赛、实习' },
  { value: 'freelancer', label: '自由职业', desc: '多客户、多稿约' },
  { value: 'founder', label: '创业者', desc: '多线决策、里程碑' },
  { value: 'jobseeker', label: '待业 / 规划', desc: '求职、学习、面试' },
];

const cadenceOptions: Array<{ value: Cadence; label: string }> = [
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每两周' },
  { value: 'monthly', label: '每月' },
  { value: 'ondemand', label: '按需' },
];

export function OnboardingModal() {
  const profile = useStore((s) => s.profile);
  const finish = useStore((s) => s.finishOnboarding);

  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState<Identity>(profile.identity);
  const [templateId, setTemplateId] = useState(profile.templateId);
  const [cadence, setCadence] = useState<Cadence>(profile.cadence);

  if (profile.onboardedAt) return null;

  const filteredTemplates = templates.filter((t) => t.identity === identity);

  const submit = () => {
    finish({
      identity,
      templateId: filteredTemplates.some((t) => t.id === templateId)
        ? templateId
        : filteredTemplates[0]?.id ?? templateId,
      cadence,
    });
  };

  return (
    <Modal
      open
      title={`欢迎 · ${step + 1}/${steps.length}`}
      onClose={submit}
      footer={
        <>
          <button
            className="btn-ghost text-sm"
            onClick={submit}
            title="跳过后可在设置中修改"
          >
            跳过
          </button>
          {step > 0 && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              className="btn-primary"
              onClick={() => setStep(step + 1)}
            >
              下一步
            </button>
          ) : (
            <button className="btn-primary" onClick={submit}>
              开始使用
            </button>
          )}
        </>
      }
    >
      <h4 className="font-medium mb-3">{steps[step].title}</h4>

      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {identityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setIdentity(opt.value);
                const first = templates.find((t) => t.identity === opt.value);
                if (first) setTemplateId(first.id);
              }}
              className={cn(
                'text-left rounded-xl border p-3 transition-colors',
                identity === opt.value
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'hover:bg-black/5 dark:hover:bg-white/5',
              )}
              style={{
                borderColor:
                  identity === opt.value ? '#22C55E' : 'rgb(var(--border))',
              }}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-[rgb(var(--muted))] mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          {filteredTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setTemplateId(tpl.id)}
              className={cn(
                'w-full text-left rounded-xl border p-3 transition-colors',
                templateId === tpl.id ? 'border-brand-500 bg-brand-500/5' : '',
              )}
              style={{
                borderColor:
                  templateId === tpl.id ? '#22C55E' : 'rgb(var(--border))',
              }}
            >
              <div className="font-medium">{tpl.name}</div>
              <div className="text-xs text-[rgb(var(--muted))] mt-1">
                示例项目:{tpl.projectSamples.map((p) => p.name).join(' · ')}
              </div>
              <div className="text-xs text-[rgb(var(--muted))] mt-1">
                成果类型:{tpl.achievementTypes.map((t) => t.label).join(' / ')}
              </div>
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="text-sm text-[rgb(var(--muted))]">
              该身份的模板还在赶来的路上,先用「通用职场人」模板 → 后续可在设置中切换。
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {cadenceOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCadence(opt.value)}
              className={cn(
                'rounded-xl border p-3 transition-colors',
                cadence === opt.value ? 'border-brand-500 bg-brand-500/5' : '',
              )}
              style={{
                borderColor:
                  cadence === opt.value ? '#22C55E' : 'rgb(var(--border))',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
