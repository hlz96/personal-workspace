import { findTemplate, templates } from '@/data/templates';
import type { Template } from '@/types';

const defaultDict: Record<string, string> = {
  'app.name': '个人工作台',
  'greeting.suffix': '欢迎回来',
  'nav.dashboard': '首页',
  'nav.tasks': '任务管理',
  'nav.projects': '项目',
  'nav.achievements': '工作成果',
  'nav.reports': '周报月报',
  'nav.reviews': '绩效复盘',
  'nav.stats': '数据统计',
  'nav.settings': '设置中心',
  'report.weekly.title': '本周工作总结',
  'report.monthly.title': '本月工作总结',
  'review.title': '周期复盘',
  'achievement.singular': '成果',
};

export function makeTranslator(
  templateId: string | undefined,
  userOverride?: Record<string, string>,
) {
  const tpl: Template = findTemplate(templateId ?? templates[0].id);
  const dict = { ...defaultDict, ...tpl.terminology, ...(userOverride ?? {}) };
  return (key: string) => dict[key] ?? key;
}
