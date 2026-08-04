# 周报 / 月报 / 绩效复盘 自动生成规范

**文档**:report-generation-spec.md
**版本**:V1.0
**日期**:2026-08-04
**对应文档**:[PRD.md](./PRD.md) §3.5 / [TRD.md](./TRD.md) §6.3

---

## 一、设计原则

1. **零额外操作**:不要求用户"专门写日志",所有素材来自日常操作留痕(任务勾完成、项目进度更新、成果录入)。
2. **草稿即用**:自动生成的结果就是一份 **80 分可发** 的周报,用户只需润色和补"下周计划"。
3. **可解释**:每一条内容都能追溯到源数据(哪个任务、哪次进度更新)。
4. **可覆盖**:用户永远有最终编辑权,不做黑盒。
5. **分层可选**:V1.0 纯规则生成;V1.1 叠加 AI 润色;V1.2 支持个人风格学习。

---

## 二、留痕数据来源(埋点清单)

系统在后台自动记录的用户行为(核心表已在 TRD §3.2 定义,此处强调**触发时机**):

| 事件 | 数据表 | 触发点 | 记录字段 |
|-----|--------|-------|---------|
| 任务完成 | `tasks.status=2, done_at` | 用户勾选复选框 | done_at, project_id, priority, is_achievement |
| 任务新建 | `tasks` INSERT | 新增任务 | created_at, project_id |
| 项目进度变更 | `project_progress_log`(新表) | 用户改进度或系统重算 | old_progress, new_progress, changed_at |
| 里程碑达成 | `milestones.done_at` | 勾选里程碑 | done_at, milestone_name |
| 成果录入 | `achievements` INSERT | 新建成果 | done_date, type, metric |
| 标签使用 | `task_tags` INSERT | 打标签 | tag_id |

### 新增辅助表:`project_progress_log`

```sql
CREATE TABLE project_progress_log (
  id            BIGSERIAL PRIMARY KEY,
  project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_progress  SMALLINT,
  new_progress  SMALLINT,
  changed_at    TIMESTAMPTZ DEFAULT NOW(),
  source        VARCHAR(16)   -- manual / auto (任务算出的)
);
CREATE INDEX idx_ppl_user_time ON project_progress_log(user_id, changed_at);
```

用于回答:"本周库存项目从 60% 推到了 75%,是什么时候推的、被哪几条任务带动的"。

---

## 三、生成触发方式

### 3.1 周报
| 触发方式 | 时机 | 备注 |
|---------|-----|------|
| 自动定时 | 每周五 17:00(用户时区) | BullMQ Cron job |
| 手动生成 | 用户点「生成周报」按钮 | 可指定任意一周 |
| 补生成 | 用户回到过去某周点「生成」 | 支持历史数据回填 |

生成后:
1. 写入 `reports` 表,`status=0`(草稿)
2. 站内通知 + 桌面通知:"本周周报已生成"
3. 首页战报卡显示红点

### 3.2 月报
- 每月最后一天 18:00 自动生成
- 支持手动重新生成(会覆盖同期草稿,已发送的不动)

### 3.3 绩效复盘
- 季度末最后一周提醒用户生成
- 用户主动点「生成季度复盘」→ 弹出确认时间范围

---

## 四、数据聚合算法(核心)

以**周报**为例(月报、复盘同理,只是窗口不同)。

### 4.1 时间窗口
```
periodStart = 本周一 00:00:00 (用户时区)
periodEnd   = 本周日 23:59:59
```

### 4.2 SQL 聚合(伪代码)

```sql
-- ① 本周完成的任务(按项目聚类)
SELECT p.id, p.name, p.color,
       array_agg(t.title ORDER BY t.done_at) AS titles,
       COUNT(t.id) AS task_count
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.user_id = :uid
  AND t.status = 2
  AND t.done_at BETWEEN :start AND :end
GROUP BY p.id, p.name, p.color
ORDER BY task_count DESC;

-- ② 本周新增成果
SELECT id, title, type, metric, project_id
FROM achievements
WHERE user_id = :uid
  AND done_date BETWEEN :start::date AND :end::date
ORDER BY done_date;

-- ③ 本周有推进的项目
SELECT project_id,
       MIN(old_progress) AS start_progress,
       MAX(new_progress) AS end_progress
FROM project_progress_log
WHERE user_id = :uid
  AND changed_at BETWEEN :start AND :end
GROUP BY project_id
HAVING MAX(new_progress) > MIN(old_progress);

-- ④ 本周达成的里程碑
SELECT m.name, p.name AS project_name
FROM milestones m
JOIN projects p ON m.project_id = p.id
WHERE p.user_id = :uid
  AND m.done_at BETWEEN :start AND :end;

-- ⑤ 未完成但计划本周内的任务(→ 下周计划候选)
SELECT id, title, project_id
FROM tasks
WHERE user_id = :uid
  AND status IN (0, 1)
  AND plan_date <= :end
ORDER BY priority, plan_date;
```

### 4.3 数据组装

```ts
interface WeeklyReportData {
  period: { start: Date; end: Date };
  summary: {
    tasksDone: number;
    achievementsAdded: number;
    projectsAdvanced: number;
    milestonesReached: number;
  };
  byProject: Array<{
    projectId: number;
    projectName: string;
    color: string;
    progressChange?: { from: number; to: number };
    tasks: string[];
    achievements: Achievement[];
    milestones: string[];
  }>;
  orphanTasks: string[];     // 未挂项目的任务
  achievements: Achievement[]; // 独立列出的成果 Top N
  nextWeekCandidates: Task[]; // 下周计划候选
  highlights: string[];       // 高光时刻(见下节规则)
}
```

### 4.4 「高光时刻」识别规则(V1.0 纯规则)

从聚合数据里挑 1-3 条最有汇报价值的:

| 规则 | 优先级 |
|-----|-------|
| 有量化数据的成果(metric 非空) | ★★★ |
| 达成里程碑 | ★★★ |
| 项目进度推进 ≥ 15% | ★★ |
| 高优先级任务完成数 ≥ 3 | ★★ |
| 单周任务完成数 > 上周 30% | ★ |

生成话术:
- "**推进** 库存预警优化项目 **15 个百分点**(60% → 75%)"
- "**达成** 需求评审通过 里程碑"
- "**产出** 3 项工作成果,其中《库存异常分析》**识别 12 个异常 SKU**"

---

## 五、模板设计

### 5.1 默认周报模板(Markdown + 占位符)

```markdown
【本周工作总结】{{periodStart}} - {{periodEnd}}

## 一、本周概览
本周共完成 **{{summary.tasksDone}} 项** 任务,沉淀 **{{summary.achievementsAdded}} 项** 成果,推进 **{{summary.projectsAdvanced}} 个** 项目。

## 二、高光时刻
{{#each highlights}}
- {{this}}
{{/each}}

## 三、分项目进展
{{#each byProject}}
### {{projectName}}{{#if progressChange}} ({{progressChange.from}}% → {{progressChange.to}}%){{/if}}
{{#each tasks}}
- {{this}}
{{/each}}
{{#each achievements}}
- 🏆 **成果**:{{title}}{{#if metric}} — {{metric}}{{/if}}
{{/each}}
{{#each milestones}}
- ✅ **里程碑**:{{this}}
{{/each}}
{{/each}}

{{#if orphanTasks}}
## 四、其他工作
{{#each orphanTasks}}
- {{this}}
{{/each}}
{{/if}}

## 五、下周计划
{{#each nextWeekCandidates}}
- {{title}}{{#if projectName}} (@{{projectName}}){{/if}}
{{/each}}

## 六、需要支持
_(在这里补充需要协调的资源、卡点、风险)_
```

### 5.2 模板引擎选型
- 后端:`handlebars` 或 `mustache`
- 好处:用户可编辑模板文件(V1.2 支持自定义模板)

### 5.3 变量清单
```
periodStart / periodEnd
summary.{tasksDone,achievementsAdded,projectsAdvanced,milestonesReached}
byProject[].{projectName,color,progressChange,tasks,achievements,milestones}
highlights[]
orphanTasks[]
nextWeekCandidates[]
```

---

## 六、月报差异

相比周报,月报多出:

1. **Top 3 成果** 板块(按 metric 权重 + 里程碑关联)
2. **月度趋势** 板块:每周任务完成数柱状图(Base64 图片嵌入)
3. **上月对比**:任务量、成果数、项目推进数环比
4. **持续项目**:跨月的项目列出「上月末进度 → 本月末进度」

---

## 七、绩效复盘差异

**周期**:季度 / 半年 / 年度

**结构改成 STAR 法则**:
```
Situation:  期间业务背景(用户手写或从项目描述提取)
Task:       承担的关键任务(自动:top-N 高优先级 + 高投入项目)
Action:     采取的行动(自动:任务标题聚合 + 里程碑事件)
Result:     达成的成果(自动:achievements + metric 汇总)
```

**量化仪表盘**:
- 完成任务总数、成果总数、项目参与数
- 关键项目里程碑完成率
- 时间投入分布饼图

**导出**:PDF / Word 双格式,面谈可打印带走。

---

## 八、AI 润色(V1.1 计划)

### 8.1 定位
生成完草稿后,用户点「AI 润色」→ 调 LLM 二次加工。**不替代规则生成**,只优化语言。

### 8.2 Prompt 设计(草稿)

```
你是一名资深职场人,请把下面这份周报草稿润色成更适合发给主管的版本。

要求:
1. 保留所有事实和数字,不得虚构
2. 相似任务合并,例如「对账×3」合成「完成 3 次供应商对账」
3. 用主动语态,突出结果和量化数据
4. 语言简洁书面,不要感叹号、不要"我认为"
5. 高光时刻放在开头 1 句话摘要
6. 输出为 Markdown

草稿:
{{draft_markdown}}

结构化数据(供你核对,不要输出):
{{report_data_json}}
```

### 8.3 模型选择
- 默认:Claude Haiku(便宜够用,~0.001 元/次)
- 高级用户:Claude Sonnet(付费用户开放)

### 8.4 成本估算
- 单次输入 ~1500 tokens,输出 ~800 tokens
- Haiku 单次成本约 ¥0.005;月活 1000 人 × 4 次 = ¥20/月

---

## 九、边界与降级

| 场景 | 策略 |
|-----|------|
| 用户本周啥都没记 | 生成空模板 + 提示"本周未记录数据,请手动填写" |
| 任务未挂项目 | 归入「其他工作」板块 |
| 项目无进度变化但有完成任务 | 显示任务不显示进度条 |
| 用户跨时区 | 以用户 `settings.timezone` 为准 |
| 数据量过大(单周 > 200 任务) | 只列 Top 30,末尾提示"另有 X 项已折叠" |
| AI 服务宕机 | 降级到纯规则生成,前端提示"AI 润色暂不可用" |
| 用户手动改过之后重新生成 | 弹确认框:"将覆盖你的修改,是否继续?" |

---

## 十、发送与分发

生成的周报支持一键分发:

1. **复制 Markdown**:一键复制到剪贴板
2. **导出 PDF**:puppeteer 服务端渲染
3. **发到邮箱**:配置常用邮箱,SMTP 直发
4. **发到 IM**:
   - 飞书:Webhook(用户配置)
   - 企业微信:Webhook
   - Slack(可选)
5. **同步到文档平台**(V1.2):飞书文档、Notion、语雀

---

## 十一、实现路线图

| 阶段 | 内容 | 依赖 |
|-----|------|-----|
| M1 | `project_progress_log` 建表 + 埋点 | TRD §3.2 表已建 |
| M2 | 聚合 SQL 抽成 `ReportAggregatorService` | Prisma + NestJS |
| M3 | Handlebars 模板引擎 + 默认模板 | - |
| M4 | 手动生成接口 `POST /reports/generate` | M2 + M3 |
| M5 | 前端周报编辑器(Tiptap) | shadcn/ui |
| M6 | BullMQ Cron 定时生成 | Redis |
| M7 | 站内通知 + 桌面通知 | Web Notification API |
| M8 | 导出 PDF(puppeteer) | Docker + Chromium |
| M9 | Webhook 发送(飞书/企微) | 用户配置 UI |
| M10 | AI 润色(V1.1) | Claude API 集成 |

---

## 十二、开放问题

1. 用户改过草稿后,下次自动重生成要不要保留改动?
   - 建议:一旦草稿被编辑,标记 `edited=true`,不再自动覆盖,除非用户主动点「重新生成」
2. 跨周任务(周三开始、下周二完成)算哪周?
   - 建议:以 `done_at` 归属周
3. 「本周计划」如何来?
   - 建议:V1.0 不做,由用户手工写;V1.1 从「上周未完成 + 本周 plan_date 内」推荐
4. 支持团队周报吗?
   - V2 才做,V1.0 严守个人视角
