# 优化 Checklist · Personal Workspace

**创建日期**:2026-08-05
**背景**:线上部署打通后(Vercel + Supabase + GitHub OAuth 登录已可用),通读代码与配置后梳理的优化项。
**说明**:按优先级排列,每条标注「问题」「位置」「修复方向」。修一条勾一条。

---

## 🔴 P0 必做(不做会踩坑 / 丢数据)

- [x] **P0-1 成果附件字段清理** ✅ 已修(方案调整)
  - 更正:原判断「附件用 blob URL 刷新失效」有误——Settings/Reports 的 `createObjectURL` 实为导出 JSON/报告的正常用法。真实情况是 `attachments` 字段**只有类型定义 + DB 透传,前端无上传入口**(Achievements 表单无附件项),属未实现的预留字段。
  - 决策:采用方案 A「清理死字段」(而非实现 Storage 上传)。
  - 位置:`src/types/index.ts:95`、`src/lib/remoteStorage.ts`(Row 类型 + fromRow + toRow 3 处)、`supabase/schema.sql:196`。
  - 修复:移除 `attachments` 字段的类型定义、DB 透传与 schema 列。线上库已有的 `attachments` 列可保留(无数据无引用,无害);如需清理见下方 SQL。

- [x] **P0-2 缺少 ErrorBoundary** ✅ 已修
  - 问题:全项目无任何错误边界,一处崩溃 → 整页白屏(今日已踩)。
  - 位置:全局(`src/App.tsx` 外层)。
  - 修复:新增 `src/components/shared/ErrorBoundary.tsx`,在 `main.tsx` 顶层包裹 `<App/>`,崩溃时展示兜底 UI + 刷新按钮。

- [x] **P0-3 保存失败静默吞掉** ✅ 已修
  - 问题:`remoteStorage.ts` 内 19 处错误全是 `console.error`,无 toast/通知;云端保存失败用户无感。
  - 位置:`src/lib/remoteStorage.ts`(全文各 upsert/delete)。
  - 修复:新增 `src/lib/toast.ts`(零依赖发布订阅)+ `src/components/ui/Toaster.tsx`,挂到 `App` 顶层;写操作失败统一走 `warnSave()` 弹 toast(读操作有 fallback 保持 console)。

---

## 🟠 P1 建议做(体验 / 成本)

- [ ] **P1-1 关闭邮箱验证 + 处理存量用户**
  - 问题:Supabase 免费版邮件限流严重(email rate limit),个人自用不实用。
  - 修复:后台 Authentication → 关掉 Confirm email;已注册的 `1013949612@qq.com` 去 Users 手动 Confirm 或删除。
  - 注:纯后台操作,非代码改动。

- [x] **P1-2 收敛 OAuth 只留 GitHub** ✅ 已修
  - 问题:`Login.tsx` 有 Google 登录按钮,但未配置 Google Provider,点击会报错。
  - 位置:`src/pages/Login.tsx:190`。
  - 修复:删除 Google 按钮,收窄 `oauthLoading`/`oauth` 类型为 `'github'`,移除未用的 `Mail` 图标。

- [ ] **P1-3 认准固定 Production 域名**
  - 问题:带 hash 的部署快照 URL(如 `...-2bs4y4bx3-...`)会变且可能打不开。
  - 修复:统一使用 Production 域名 `personal-workspace-hlz3.vercel.app`;Supabase Site URL / Redirect URLs 对齐。
  - 注:纯配置,非代码改动。

- [ ] **P1-4 数据备份意识 / 主动提示**
  - 问题:Supabase 免费版无自动备份;README 提到「建议每周提示导出」但代码未实现。
  - 位置:`src/pages/Settings.tsx`(已有导出 JSON 能力)。
  - 修复:可选加「距上次备份 N 天」提示;至少养成定期手动导出习惯。

---

## 🟡 P2 锦上添花

- [x] **P2-1 登出即清内存态** ✅ 已修
  - 问题:`auth.tsx:41` signOut 仅调 Supabase,内存 store 靠 user 变 null 才 unbind。
  - 位置:`src/lib/auth.tsx:41`、`src/store/index.ts`。
  - 修复:store 新增 `clearSessionData()`(解绑同步 + 清 localStorage + 内存置空不写盘),signOut 调用之。

- [ ] **P2-2 CI 补 lint**
  - 问题:`ci.yml` 只有 typecheck + build,无 eslint。
  - 位置:`.github/workflows/ci.yml`。
  - 修复:可选加 `npm run lint` 步骤。

- [x] **P2-3 README 补部署坑位说明** ✅ 已修
  - 问题:部署章节未提 Supabase 环境变量、Deployment Protection(今日两大坑)。
  - 位置:`README.md`。
  - 修复:新增「部署注意事项」小节,覆盖环境变量、Deployment Protection、固定域名、Auth 回调、邮箱验证 5 个坑。

---

## 修复进度记录

| 项 | 状态 | 备注 |
|----|------|------|
| P0-1 附件走 Storage | ✅ 已修 | 改为方案A清理死字段 |
| P0-2 ErrorBoundary | ✅ 已修 | main.tsx 顶层包裹 |
| P0-3 保存失败提示 | ✅ 已修 | 零依赖 toast + warnSave |
| P1-1 关邮箱验证 | ⬜ 未开始 | 后台操作(非代码) |
| P1-2 收敛 OAuth | ✅ 已修 | 删 Google 按钮 |
| P1-3 固定域名 | ⬜ 未开始 | 配置(非代码) |
| P1-4 备份提示 | ⬜ 未开始 | |
| P2-1 登出清内存 | ✅ 已修 | clearSessionData() |
| P2-2 CI lint | ⬜ 未开始 | 可选 |
| P2-3 README | ✅ 已修 | 补部署注意事项 |

---

## 后续规划(Backlog)

本轮已完成 6 项代码优化(P0-1/2/3、P1-2、P2-1、P2-3),均通过 build。以下为剩余项,分两类推进。

### 甲、后台 / 配置操作(无需改代码,自行完成)

- [ ] **P1-1 关闭邮箱验证 + 处理存量用户**(找到入口了,待执行)
  - Supabase → Authentication → 关闭 Confirm email(Enable email confirmations)。
  - Authentication → Users → 找到 `1013949612@qq.com` → 手动 Confirm 或删除。
  - 验收:新邮箱注册后无需验证即可登录;不再出现 `email rate limit exceeded`。

- [ ] **P1-3 认准固定 Production 域名**
  - 统一使用 `personal-workspace-hlz3.vercel.app`,不再用带 hash 的快照 URL。
  - Supabase → Authentication → URL Configuration:Site URL 与 Redirect URLs 对齐该域名(本地保留 `http://localhost:5173/**`)。
  - 验收:登录回调稳定落在正式域名。

### 乙、待排期开发(需改代码,本轮未做)

- [ ] **P1-4 备份主动提示**(优先级中)
  - 在 `src/pages/Settings.tsx` 记录「上次导出时间」(localStorage),超过 N 天在设置页/首页轻提示。
  - 复用已有的导出 JSON 能力,只加提醒,不改导出逻辑。

- [ ] **P2-2 CI 补 lint**(优先级低,可选)
  - 前置:项目目前无 eslint 配置与 `lint` script,需先引入 eslint + 配置。
  - 然后在 `.github/workflows/ci.yml` 加 `npm run lint` 步骤。

- [ ] **附件功能(若未来需要)**
  - 本轮按方案 A 清理了 `attachments` 死字段。若将来要做「成果附件」,需:建 Supabase Storage bucket + RLS → Achievements 表单加上传 UI → 上传/删除逻辑 → 重新加回 `attachments` 字段(存持久化 URL,不用 blob URL)。

### 丙、可选的线上数据库清理(无害,不做也行)

- [ ] 线上 `achievements` 表仍有 `attachments` 列(无数据、无引用)。如需彻底清理,Supabase SQL Editor 执行:
  ```sql
  alter table public.achievements drop column if exists attachments;
  ```
