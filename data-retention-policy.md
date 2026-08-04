# 数据保留与清理策略

**文档**:data-retention-policy.md
**版本**:V1.0
**日期**:2026-08-04
**对应文档**:[TRD.md](./TRD.md) §3 数据模型 / [storage-and-deploy.md](./storage-and-deploy.md)

---

## 一、设计原则

1. **核心资产永不自动删**:成果(achievements)、绩效复盘(reviews)是用户几年后还要看的东西,任何情况下都不能自动清理。
2. **分级过期**:按数据的「历史价值」分层设策略,不搞一刀切。
3. **软删除 + 冷冻期**:任何自动清理都是「先归档 → 冻结期 → 再清理」,给用户 30 天反悔窗口。
4. **删除前必导出**:清理前 7 天,系统主动推送「即将清理」提醒 + 一键导出。
5. **用户可控**:所有策略在「设置中心」可关闭 / 可调整周期。
6. **不可逆操作要明确同意**:硬删除永远需要用户二次确认。

**一句话**:自动化只做归档,硬删除永远问用户。

---

## 二、数据分级

| 等级 | 保留期 | 到期动作 | 适用数据 |
|-----|-------|---------|---------|
| **L1 永久** | ∞ | 不动 | 成果、绩效复盘、活跃项目 |
| **L2 长期** | 36 个月 | 归档 | 月报、季度报、已归档项目 |
| **L3 中期** | 24 个月 | 归档 | 周报、已完成任务 |
| **L4 短期** | 90 天 | 硬清理 | 埋点日志、通知、审计日志 |

「归档」= 从主表移到 `archive_*` 表 / 冷存储,不再在主视图显示,但可以在「回收站」看到;归档 12 个月后再走用户确认流程清理。

---

## 三、按表策略

### 3.1 tasks(任务)

| 状态 | 策略 |
|-----|------|
| 进行中 / 待办 | 永不过期 |
| 已完成 | **完成后 12 个月归档**,归档 6 个月后进入待清理队列 |
| 已归档(用户手动) | **归档后 12 个月** 进入待清理队列 |

**理由**:一年前做过什么任务,几乎不会再翻;真需要翻的多半是「成果」。

**例外**:标记为 `is_achievement=true` 的任务不自动归档(已升级为成果)。

### 3.2 achievements(工作成果)—— **L1 永久**

**永不自动删除,永不自动归档**。

理由:这是产品的核心资产。3 年后跳槽写简历、5 年后晋升答辩,都要翻这个。

用户可以主动删除或归档,但系统绝不代劳。

### 3.3 projects(项目)

| 状态 | 策略 |
|-----|------|
| 进行中 | 永不过期 |
| 已完成 | 完成后 24 个月归档 |
| 已归档 | 24 个月后进入待清理队列 |
| 暂停 > 6 个月 | 系统提醒「是否归档」,不自动执行 |

**关联数据**:项目被清理时,关联的任务同步归档;关联的成果**不删**(升级为独立成果,`project_id` 置 NULL)。

### 3.4 milestones(里程碑)
跟随所在项目的生命周期,单独不设过期。

### 3.5 reports(周报 / 月报)

| 类型 | 策略 |
|-----|------|
| 周报 | 生成后 24 个月归档 |
| 月报 | 生成后 36 个月归档 |
| 归档后 | 12 个月后进入待清理队列 |

**清理前动作**:自动打包为 PDF,存到用户「历史报告库」(小体积),原始数据清理。

### 3.6 reviews(绩效复盘)—— **L1 永久**
永不自动清理。理由同 achievements。

### 3.7 project_progress_log(进度埋点)—— **L4 短期**

**90 天硬清理**。

理由:量最大,增长最快,只用于周报/月报生成的素材聚合,过了当期就没有查询价值。

**保护措施**:清理前,把每个项目在这 90 天的「起止进度」写入 `project_progress_summary`(每月一行),保留长期视图。

### 3.8 通知 / 审计日志 —— **L4 短期**

- 站内通知:30 天硬清理
- 已读通知:7 天硬清理
- 审计日志:90 天硬清理

### 3.9 tags / task_tags / achievement_tags
- 未被任何数据引用的 tag:180 天硬清理
- 关联表跟随主体

---

## 四、字段设计(在 TRD 基础上补充)

所有主表加两个可空字段:

```sql
ALTER TABLE tasks
  ADD COLUMN archived_at TIMESTAMPTZ,   -- 归档时间,NULL = 未归档
  ADD COLUMN deleted_at  TIMESTAMPTZ;   -- 软删除时间,NULL = 未删除

CREATE INDEX idx_tasks_archived ON tasks(user_id, archived_at)
  WHERE archived_at IS NOT NULL;
CREATE INDEX idx_tasks_deleted  ON tasks(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
```

**查询规则**:业务查询默认 `WHERE archived_at IS NULL AND deleted_at IS NULL`。

**用户设置**表:

```sql
-- users.settings JSONB 里加:
{
  "retention": {
    "autoArchiveEnabled": true,
    "completedTaskArchiveMonths": 12,
    "weeklyReportArchiveMonths": 24,
    "monthlyReportArchiveMonths": 36,
    "progressLogRetentionDays": 90,
    "notifyBeforeCleanupDays": 7
  }
}
```

用户可在「设置 → 数据管理」调整或关闭。

---

## 五、清理任务实现

### 5.1 触发方式
每天 03:00(用户时区) 跑一次,用 BullMQ Cron 或 Supabase `pg_cron`。

### 5.2 执行流程

```
Step 1  归档扫描
  ├─ 找出到期未归档的数据 → archived_at = NOW()
  └─ 记录到 retention_log

Step 2  提醒扫描
  ├─ 找出「归档后 11 个月」的数据(距清理还有 30 天)
  └─ 发通知:「以下数据即将清理,请导出」

Step 3  最后提醒
  ├─ 找出「归档后 12 个月零 7 天前」的数据
  └─ 发通知 + 邮件:「7 天后清理,最后机会」

Step 4  软删除
  ├─ 到期数据 → deleted_at = NOW()
  └─ 30 天回收站期开始

Step 5  硬删除
  ├─ deleted_at > 30 天的数据 → 真正 DELETE
  └─ 写入 retention_log 记录清理量
```

### 5.3 retention_log 表(审计用)

```sql
CREATE TABLE retention_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL,
  table_name   VARCHAR(32) NOT NULL,
  action       VARCHAR(16) NOT NULL,   -- archived / deleted / purged
  record_count INT NOT NULL,
  executed_at  TIMESTAMPTZ DEFAULT NOW(),
  detail       JSONB
);
```

每次清理都留痕,用户在「设置 → 数据管理」可查看。

---

## 六、用户体验设计

### 6.1 「回收站」页面
- 独立菜单入口「设置 → 回收站」
- 展示所有 `archived_at IS NOT NULL` 或 `deleted_at IS NOT NULL` 的数据
- 支持:恢复、永久删除、导出
- 顶部提示:「X 条数据将在 N 天后自动清理」

### 6.2 清理前通知
- 站内通知(必发)
- 桌面通知(用户开启的话)
- 邮件(最后 7 天必发)
- 首页顶部横幅(最后 3 天,红色警示)

通知文案模板:
```
【数据清理提醒】
你有 24 条已完成任务(2025.08-2025.09)将于 7 天后自动清理。
[立即导出] [推迟 1 年] [立即清理]
```

### 6.3 「推迟」操作
- 用户可以对任何即将清理的数据点「推迟 1 年」
- 推迟操作会写入 `archived_at` 重置为当前时间
- 单条数据总推迟次数无上限(不做强制清理)

### 6.4 一键导出
- 「设置 → 数据管理 → 全量导出」→ 打包 ZIP(JSON + Markdown + 附件)
- 每次清理前自动触发一次「归档快照」推送到用户邮箱(可选)

### 6.5 账号注销
- 触发 7 天冷静期(可撤销)
- 到期后:硬删除所有主表 + 附件
- 保留 `retention_log` 一份注销记录(合规需要)

---

## 七、性能考量

### 7.1 分区表(数据量大时)
`project_progress_log` 和 `retention_log` 按月分区:

```sql
CREATE TABLE project_progress_log (
  ...
) PARTITION BY RANGE (changed_at);

CREATE TABLE progress_log_2026_08 PARTITION OF project_progress_log
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

清理旧数据 = `DROP PARTITION`,几毫秒搞定,远快于 `DELETE`。

### 7.2 索引维护
每季度 `REINDEX CONCURRENTLY` 一次(pg_cron 定时),避免索引膨胀。

### 7.3 冷存储(V2 可选)
Supabase 免费额度撑不住时:
- 归档数据搬到 Cloudflare R2(免费 10GB)/ 阿里 OSS
- 主表只留元数据 + 冷存储 URL
- 用户点开归档条目时按需回源

---

## 八、开发实现清单

### 8.1 数据库层(Phase 1 落地)
- [ ] 主表加 `archived_at` / `deleted_at` 字段
- [ ] 所有业务查询加 `WHERE archived_at IS NULL AND deleted_at IS NULL`
- [ ] 建 `retention_log` 表
- [ ] 建 `project_progress_summary` 汇总表
- [ ] `users.settings` 加 retention 配置默认值

### 8.2 后端层
- [ ] `RetentionService`:归档、提醒、软删、硬删 4 个方法
- [ ] `pg_cron` / BullMQ 定时任务
- [ ] 通知模块:站内 + 邮件

### 8.3 前端层
- [ ] 「设置 → 数据管理」页面
- [ ] 「回收站」页面
- [ ] 首页红色横幅(最后 3 天)
- [ ] 「推迟 1 年」按钮
- [ ] 一键导出下载

### 8.4 测试项
- [ ] 归档到期任务不出现在业务列表
- [ ] 归档数据可恢复
- [ ] 关联清理:项目清了任务归档、成果保留
- [ ] 关闭自动归档后不执行
- [ ] 通知在正确时点发出

---

## 九、Phase 0(localStorage)的降级方案

Phase 0 没有真实数据库,localStorage 上限 5MB,处理方式:

### 9.1 触发点
每次启动 App 时检查 `localStorage.length` 或数据量。

### 9.2 简化策略
- 已完成任务超过 500 条 → 提示导出后清理
- 埋点数据(进度日志)只保留最近 90 天
- 通知只保留最近 30 天

### 9.3 用户流程
```
数据量接近上限时 → 弹窗:
  「本地存储将满,建议导出 JSON 后清理旧数据,
   或立即接入 Supabase 云存储。」
   [导出] [清理旧任务] [升级到云端]
```

---

## 十、开放决策

1. **默认周期是否合理?**
   - 建议先按本文默认值,产品上线后跟踪用户实际"推迟"率,>30% 就说明周期太短
2. **成果是否也可选自动归档?**
   - 建议:V1.0 严禁;V1.2 加「成果超过 5 年可选归档」选项
3. **附件如何清理?**
   - 建议:主表数据清理时,标记附件为 `orphan`,每周扫一次孤儿附件,超过 30 天清 OSS
4. **导出的 ZIP 保留在哪?**
   - 建议:生成后存 Supabase Storage 7 天,超时删除,用户可重新触发
