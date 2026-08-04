import type { Template } from '@/types';

const commonTerminology = {
  'nav.projects': '项目',
  'nav.achievements': '工作成果',
  'nav.reports': '周报月报',
  'nav.reviews': '绩效复盘',
  'report.weekly.title': '本周工作总结',
  'report.monthly.title': '本月工作总结',
  'review.title': '周期复盘',
  'achievement.singular': '成果',
};

const weeklyDefault = `【{{title}}】{{periodStart}} - {{periodEnd}}

## 一、本周概览
本周共完成 **{{summary.tasksDone}} 项** 任务,沉淀 **{{summary.achievementsAdded}} 项** {{achievementName}},推进 **{{summary.projectsAdvanced}} 个** {{projectName}}。

## 二、高光时刻
{{#each highlights}}
- {{this}}
{{/each}}

## 三、分{{projectName}}进展
{{#each byProject}}
### {{projectName}}{{#if progressChange}} ({{progressChange.from}}% → {{progressChange.to}}%){{/if}}
{{#each tasks}}
- {{this}}
{{/each}}
{{#each achievements}}
- 🏆 **{{achievementName}}**:{{title}}{{#if metric}} — {{metric}}{{/if}}
{{/each}}
{{/each}}

## 四、下{{period}}计划
{{#each nextPlans}}
- {{this}}
{{/each}}

## 五、需要支持
_(在这里补充需要协调的资源、卡点、风险)_
`;

const monthlyDefault = weeklyDefault.replace('周', '月');

const reviewDefault = `# {{title}}({{periodStart}} - {{periodEnd}})

## Situation 背景
_(所在阶段的业务背景 / 学习背景)_

## Task 任务
{{#each keyTasks}}
- {{this}}
{{/each}}

## Action 行动
{{#each keyActions}}
- {{this}}
{{/each}}

## Result 结果
{{#each keyResults}}
- {{this}}
{{/each}}

## 数据汇总
- 完成任务:{{metrics.tasksDone}}
- 沉淀{{achievementName}}:{{metrics.achievementsAdded}}
- 参与{{projectName}}:{{metrics.projectsInvolved}}
`;

export const templates: Template[] = [
  {
    id: 'worker',
    name: '通用职场人',
    identity: 'worker',
    builtin: true,
    projectSamples: [
      { name: '当前主线项目', color: '#22C55E', description: '正在推进的核心工作' },
      { name: '支持性事务', color: '#3B82F6', description: '跨部门协作、日常运营' },
      { name: '个人成长', color: '#F59E0B', description: '学习、分享、提升' },
    ],
    tags: ['重要', '紧急', '协作', '汇报', '成长', '待跟进'],
    achievementTypes: [
      { value: 'report', label: '报告 / 文档' },
      { value: 'project', label: '项目里程碑' },
      { value: 'share', label: '分享 / 培训' },
      { value: 'tool', label: '工具 / 方法' },
      { value: 'other', label: '其他' },
    ],
    terminology: {
      ...commonTerminology,
    },
    weeklyTemplate: weeklyDefault,
    monthlyTemplate: monthlyDefault,
    reviewTemplate: reviewDefault,
  },
  {
    id: 'developer',
    name: '研发 / 技术',
    identity: 'worker',
    builtin: true,
    projectSamples: [
      { name: '当前迭代', color: '#22C55E', description: '本迭代的功能开发' },
      { name: '技术债务', color: '#EF4444', description: '重构、优化、稳定性' },
      { name: '学习成长', color: '#8B5CF6', description: '技术学习、分享、认证' },
    ],
    tags: ['Bug', '新功能', 'Code Review', '文档', '重构', '性能'],
    achievementTypes: [
      { value: 'feature', label: '上线功能' },
      { value: 'pr', label: 'PR / MR' },
      { value: 'share', label: '技术分享' },
      { value: 'tool', label: '工具沉淀' },
      { value: 'blog', label: '技术文章' },
      { value: 'other', label: '其他' },
    ],
    terminology: {
      ...commonTerminology,
      'achievement.singular': '技术产出',
    },
    weeklyTemplate: weeklyDefault,
    monthlyTemplate: monthlyDefault,
    reviewTemplate: reviewDefault,
  },
  {
    id: 'operator',
    name: '运营 / 市场',
    identity: 'worker',
    builtin: true,
    projectSamples: [
      { name: '活动运营', color: '#F59E0B', description: '当前进行的活动' },
      { name: '内容运营', color: '#3B82F6', description: '文章、视频、种草' },
      { name: '用户增长', color: '#22C55E', description: '拉新、留存、转化' },
    ],
    tags: ['数据', '活动', '内容', '用户', '增长', '复盘'],
    achievementTypes: [
      { value: 'campaign', label: '活动复盘' },
      { value: 'report', label: '数据报告' },
      { value: 'sop', label: 'SOP / 方法论' },
      { value: 'content', label: '内容产出' },
      { value: 'other', label: '其他' },
    ],
    terminology: {
      ...commonTerminology,
    },
    weeklyTemplate: weeklyDefault,
    monthlyTemplate: monthlyDefault,
    reviewTemplate: reviewDefault,
  },
  {
    id: 'student',
    name: '学生',
    identity: 'student',
    builtin: true,
    projectSamples: [
      { name: '课程学习', color: '#22C55E', description: '本学期课程与作业' },
      { name: '毕设 / 论文', color: '#8B5CF6', description: '毕业设计 / 论文进度' },
      { name: '实习 / 比赛', color: '#F59E0B', description: '实习工作或参赛项目' },
    ],
    tags: ['作业', '考试', '实习', '技能', '比赛', '证书'],
    achievementTypes: [
      { value: 'assignment', label: '作品 / 作业' },
      { value: 'award', label: '奖项 / 比赛' },
      { value: 'certificate', label: '证书' },
      { value: 'paper', label: '论文 / 报告' },
      { value: 'skill', label: '技能掌握' },
      { value: 'other', label: '其他' },
    ],
    terminology: {
      ...commonTerminology,
      'nav.projects': '课题',
      'nav.achievements': '学习成果',
      'nav.reports': '周期总结',
      'nav.reviews': '学期复盘',
      'report.weekly.title': '本周学习总结',
      'report.monthly.title': '本月学习总结',
      'review.title': '学期复盘',
      'achievement.singular': '学习成果',
    },
    weeklyTemplate: weeklyDefault,
    monthlyTemplate: monthlyDefault,
    reviewTemplate: reviewDefault,
  },
];

export const defaultTemplateId = 'worker';

export function findTemplate(id: string): Template {
  return templates.find((t) => t.id === id) ?? templates[0];
}
