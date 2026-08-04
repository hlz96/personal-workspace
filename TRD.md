# 个人工作台 TRD(技术设计文档)

**产品名称**:个人工作成果管理台(My Workspace)
**文档版本**:V1.1
**日期**:2026-08-05
**对应 PRD**:[PRD.md](./PRD.md)
**负责人**:待填

**V1.1 更新**:配合 PRD V1.1 的通用化改造,新增 `profile`(身份画像)与 `templates`(场景模板)两块数据模型与前端机制,首次进入引导流程 & 术语替换机制补充。

---

## 一、总体架构

### 1.1 架构风格
- **前后端分离** + **单页应用(SPA)**
- V1.0 单用户场景,数据可先存本地(localStorage / IndexedDB),后期无缝切换到远端 API
- 前端一份代码,后端 REST 接口,鉴权用 JWT

### 1.2 系统架构图

```
┌───────────────────────────────────────────────┐
│                  浏览器 Client                 │
│  ┌─────────────────────────────────────────┐  │
│  │  React SPA (Vite + TS + Tailwind)       │  │
│  │  ├─ 路由层 (React Router)                │  │
│  │  ├─ 状态层 (Zustand + TanStack Query)    │  │
│  │  ├─ UI 层  (shadcn/ui + lucide-react)   │  │
│  │  └─ 存储层 (localStorage / IndexedDB)   │  │
│  └───────────────┬─────────────────────────┘  │
└──────────────────┼────────────────────────────┘
                   │ HTTPS / REST + JWT
                   ▼
┌───────────────────────────────────────────────┐
│              API Gateway (Nginx)              │
└──────────────────┬────────────────────────────┘
                   ▼
┌───────────────────────────────────────────────┐
│         Application Layer (Node.js)           │
│  ┌────────────────────────────────────────┐   │
│  │  NestJS / Express                      │   │
│  │  ├─ Auth Module      (JWT / Session)   │   │
│  │  ├─ Task Module                        │   │
│  │  ├─ Project Module                     │   │
│  │  ├─ Achievement Module                 │   │
│  │  ├─ Report Module    (周报/月报生成)    │   │
│  │  ├─ Review Module    (绩效复盘)         │   │
│  │  └─ Stats Module     (BI 聚合查询)      │   │
│  └───────────────┬────────────────────────┘   │
└──────────────────┼────────────────────────────┘
                   ▼
┌───────────────────┬───────────────────────────┐
│   PostgreSQL      │   Redis (缓存+队列)        │
│   (主数据)         │   (session / 定时任务)     │
└───────────────────┴───────────────────────────┘
                   ▲
                   │
         ┌─────────┴────────┐
         │ Cron Worker      │  ← 每周五 17:00 生成周报
         │ (Node + BullMQ)  │  ← 每月末生成月报
         └──────────────────┘
```

### 1.3 分阶段部署策略
| 阶段 | 数据存储 | 部署形态 | 说明 |
|-----|---------|---------|------|
| V1.0 α(自用) | localStorage / IndexedDB | 纯静态站点(Vercel) | 零后端成本,先验证功能 |
| V1.0 β(内测) | PostgreSQL + Redis | 单机 Docker Compose | 20 人内测,补齐后端 |
| V1.0 正式 | RDS + ElastiCache | K8s / 云托管 | 支持 1000 DAU |

---

## 二、技术选型

### 2.1 前端

| 类别 | 选型 | 版本 | 理由 |
|------|-----|------|------|
| 语言 | TypeScript | 5.x | 类型安全 |
| 框架 | React | 18.x | 生态成熟 |
| 构建 | Vite | 5.x | 冷启动快 |
| 路由 | React Router | 6.x | 官方推荐 |
| 状态 | Zustand | 4.x | 轻量,替代 Redux |
| 服务端状态 | TanStack Query | 5.x | 缓存 / 重试 / 乐观更新 |
| 样式 | Tailwind CSS | 3.x | Utility-first |
| 组件库 | shadcn/ui | latest | 可复制、可改 |
| 图标 | lucide-react | latest | 统一图标风格 |
| 图表 | Recharts | 2.x | BI 视图 |
| 表单 | React Hook Form + Zod | latest | 表单校验 |
| 富文本 | Tiptap | 2.x | 成果描述、周报编辑 |
| 拖拽 | dnd-kit | latest | 任务排序 |
| 日期 | date-fns | 3.x | 轻量 |
| 请求 | ky / axios | latest | HTTP 客户端 |
| 通知 | sonner | latest | Toast |

### 2.2 后端

| 类别 | 选型 | 版本 | 理由 |
|------|-----|------|------|
| 运行时 | Node.js | 20 LTS | - |
| 框架 | NestJS | 10.x | 分层清晰,DI |
| 数据库 | PostgreSQL | 16 | 关系模型 + JSONB |
| ORM | Prisma | 5.x | 类型安全,Migration 友好 |
| 缓存 | Redis | 7.x | Session + 队列 |
| 队列 | BullMQ | 5.x | 周报/月报定时生成 |
| 鉴权 | Passport + JWT | latest | - |
| 参数校验 | class-validator | latest | 配合 NestJS |
| API 文档 | Swagger / OpenAPI | 3.0 | 自动生成 |
| 日志 | pino | 8.x | 高性能结构化日志 |
| 测试 | Vitest + Supertest | latest | - |

### 2.3 基础设施
- **静态资源**:Vercel / Cloudflare Pages
- **应用服务**:Docker + Docker Compose(β) → Kubernetes(正式)
- **DB 托管**:阿里云 RDS PostgreSQL
- **对象存储**:阿里云 OSS(成果附件)
- **CDN**:阿里云 CDN
- **监控**:Sentry(前端)+ Prometheus / Grafana(后端)
- **CI/CD**:GitHub Actions

---

## 三、数据模型设计

### 3.0 通用化模型:Profile + Template

对应 PRD §2.0 的通用化设计,在核心数据模型之外新增两块:

#### 3.0.1 UserProfile(身份画像)
存放在 `users.settings.profile` JSONB 字段中(不单独建表,便于导入导出)。

```ts
interface UserProfile {
  identity: 'worker' | 'student' | 'freelancer' | 'founder' | 'jobseeker';
  role?: string;           // 岗位 / 专业 / 领域,自由填写或枚举
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'ondemand';
  templateId: string;      // 当前使用的模板 id
  onboardedAt?: string;    // 完成引导时间
  terminology?: Record<string, string>;  // 用户级术语覆盖
}
```

#### 3.0.2 Template(场景模板)
```ts
interface Template {
  id: string;              // built-in:'worker' / 'developer' / 'operator' / 'student' ...
  name: string;
  identity: UserProfile['identity'];
  builtin: boolean;        // 内置 vs 用户自定义
  projectSamples: Array<{ name: string; color: string; description?: string }>;
  tags: string[];
  achievementTypes: Array<{ value: string; label: string }>;
  terminology: Record<string, string>;   // 术语替换表
  weeklyTemplate: string;  // Markdown 含占位符
  monthlyTemplate: string;
  reviewTemplate: string;
}
```

#### 3.0.3 术语替换机制
- 内置文案里所有可替换的地方都用 key 引用,如 `t('report.weekly.title')`
- 系统默认字典 + 当前模板字典 + 用户自定义字典,三层合并
- 例:学生模板下 `t('report.weekly.title')` 返回「本周学习总结」

#### 3.0.4 内置模板清单(V1.0)
| id | 身份 | 备注 |
|----|-----|------|
| `worker` | worker(默认) | 通用职场人 |
| `developer` | worker | 研发/技术 |
| `operator` | worker | 运营/市场 |
| `student` | student | 学生 |

后续版本增加 `sales / designer / freelancer / founder / jobseeker` 等。

#### 3.0.5 存储扩展
- Phase 0(localStorage):`WorkspaceData` 增加 `profile` + `templates` + `activeTemplateId` 字段
- Phase 1(Supabase):`users.settings` 存 profile,`user_templates` 表存用户自定义模板

```sql
-- Phase 1 新增
CREATE TABLE user_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(64) NOT NULL,
  identity     VARCHAR(16) NOT NULL,
  payload      JSONB NOT NULL,           -- 完整 Template 结构
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.0.6 引导流程(前端)
1. App 挂载时读取 `profile.onboardedAt`
2. 空则弹出 3 步问卷 Modal(无法关闭,可跳过)
3. 完成后写入 `profile` + 载入对应模板 → `activeTemplateId`
4. 「设置 → 身份与模板」页面支持后续切换、混用、导入导出

---

### 3.1 ER 图(简化)

```
User ──1─┬─N── Task
         ├─N── Project ──1─N── Milestone
         ├─N── Achievement
         ├─N── Report
         ├─N── Review
         └─N── Tag
                │
Task ──N─N── Tag (via task_tags)
Task ──N─1── Project
Achievement ──N─1── Project
```

### 3.2 表结构(PostgreSQL)

#### `users` 用户表
```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(128) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(64) NOT NULL,
  avatar_url    VARCHAR(255),
  settings      JSONB DEFAULT '{}'::jsonb,  -- 主题、提醒偏好
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tasks` 任务表
```sql
CREATE TABLE tasks (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  note          TEXT,
  priority      SMALLINT DEFAULT 2,          -- 1 高 / 2 中 / 3 低
  status        SMALLINT DEFAULT 0,          -- 0 待办 / 1 进行中 / 2 完成 / 3 归档
  plan_date     DATE,                        -- 计划完成日
  plan_time     TIME,                        -- 计划时段
  done_at       TIMESTAMPTZ,
  is_achievement BOOLEAN DEFAULT FALSE,      -- 是否标记为「成果类」
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_plan_date ON tasks(user_id, plan_date);
CREATE INDEX idx_tasks_user_status    ON tasks(user_id, status);
```

#### `projects` 项目表
```sql
CREATE TABLE projects (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(128) NOT NULL,
  description   TEXT,
  color         VARCHAR(16) DEFAULT '#22C55E',
  status        SMALLINT DEFAULT 0,          -- 0 进行中 / 1 完成 / 2 暂停 / 3 归档
  progress      SMALLINT DEFAULT 0,          -- 手动覆盖时用,否则按任务算
  manual_progress BOOLEAN DEFAULT FALSE,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `milestones` 里程碑表
```sql
CREATE TABLE milestones (
  id            BIGSERIAL PRIMARY KEY,
  project_id    BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          VARCHAR(128) NOT NULL,
  plan_date     DATE NOT NULL,
  done_at       TIMESTAMPTZ,
  sort_order    INT DEFAULT 0
);
```

#### `achievements` 工作成果表
```sql
CREATE TABLE achievements (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  type          VARCHAR(32) NOT NULL,        -- report/project/share/tool/other
  description   TEXT,                        -- 富文本 HTML
  metric        VARCHAR(255),                -- 「效率提升 30%」
  attachments   JSONB DEFAULT '[]'::jsonb,   -- [{name,url,size}]
  done_date     DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_user_date ON achievements(user_id, done_date);
```

#### `tags` / `task_tags` / `achievement_tags`
```sql
CREATE TABLE tags (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    VARCHAR(32) NOT NULL,
  color   VARCHAR(16) DEFAULT '#94A3B8',
  UNIQUE(user_id, name)
);
CREATE TABLE task_tags (
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  BIGINT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(task_id, tag_id)
);
CREATE TABLE achievement_tags (
  achievement_id BIGINT REFERENCES achievements(id) ON DELETE CASCADE,
  tag_id         BIGINT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(achievement_id, tag_id)
);
```

#### `reports` 周/月报表
```sql
CREATE TABLE reports (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(16) NOT NULL,        -- weekly / monthly
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  content       TEXT,                        -- Markdown / HTML
  status        SMALLINT DEFAULT 0,          -- 0 草稿 / 1 已提交 / 2 已发送
  meta          JSONB DEFAULT '{}'::jsonb,   -- 生成时统计快照
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, period_start)
);
```

#### `reviews` 绩效复盘表
```sql
CREATE TABLE reviews (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period        VARCHAR(16) NOT NULL,        -- quarter / half / year
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  star_content  JSONB DEFAULT '{}'::jsonb,   -- {situation,task,action,result}
  metrics       JSONB DEFAULT '{}'::jsonb,   -- 汇总数据
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 前端本地存储(V1.0 α 阶段)

使用 `zustand` + `persist(localStorage)`,数据结构与 API DTO 保持一致,便于后期切换:

```ts
type Store = {
  user: User | null
  tasks: Task[]
  projects: Project[]
  achievements: Achievement[]
  reports: Report[]
  reviews: Review[]
  tags: Tag[]
}
```

存储上限:localStorage 5MB 够用;超过 500 条任务时切 IndexedDB(用 `idb-keyval`)。

---

## 四、API 设计

### 4.1 通用约定
- Base URL:`/api/v1`
- 鉴权:`Authorization: Bearer <JWT>`,有效期 7 天,滑动刷新
- 响应体:
  ```json
  { "code": 0, "data": {}, "message": "ok" }
  ```
- 分页:`?page=1&pageSize=20`,返回 `{ items, total, page, pageSize }`
- 时间:ISO 8601 UTC
- 错误码:0 成功;1xxx 参数;2xxx 鉴权;3xxx 业务;5xxx 系统

### 4.2 核心接口清单

#### Auth
| Method | Path | 说明 |
|--------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/logout` | 登出 |
| POST | `/auth/refresh` | 刷新 token |
| GET  | `/auth/me` | 当前用户信息 |

#### Task
| Method | Path | 说明 |
|--------|------|------|
| GET  | `/tasks?scope=today\|week\|later\|done` | 列表 |
| POST | `/tasks` | 创建 |
| PATCH | `/tasks/:id` | 更新 |
| PATCH | `/tasks/:id/toggle` | 切换完成状态 |
| PATCH | `/tasks/reorder` | 批量排序 |
| DELETE | `/tasks/:id` | 删除 |
| POST | `/tasks/:id/promote-achievement` | 沉淀为成果 |

#### Project
| Method | Path | 说明 |
|--------|------|------|
| GET  | `/projects` | 列表 |
| GET  | `/projects/:id` | 详情(含里程碑、任务、成果) |
| POST | `/projects` | 创建 |
| PATCH | `/projects/:id` | 更新 |
| DELETE | `/projects/:id` | 删除 |
| POST | `/projects/:id/milestones` | 新增里程碑 |
| PATCH | `/milestones/:id` | 更新里程碑 |
| DELETE | `/milestones/:id` | 删除里程碑 |

#### Achievement
| Method | Path | 说明 |
|--------|------|------|
| GET  | `/achievements?year=2026&type=report` | 列表 |
| POST | `/achievements` | 创建 |
| PATCH | `/achievements/:id` | 更新 |
| DELETE | `/achievements/:id` | 删除 |
| POST | `/achievements/export?format=pdf` | 导出成果集 |

#### Report
| Method | Path | 说明 |
|--------|------|------|
| GET  | `/reports?type=weekly` | 列表 |
| GET  | `/reports/:id` | 详情 |
| POST | `/reports/generate` | 手动触发生成 body: `{type, periodStart}` |
| PATCH | `/reports/:id` | 编辑草稿 |
| POST | `/reports/:id/send` | 发送到邮箱/飞书/企微 |

#### Review
| Method | Path | 说明 |
|--------|------|------|
| GET  | `/reviews` | 列表 |
| POST | `/reviews/generate` | 生成复盘 body: `{period, periodStart}` |
| PATCH | `/reviews/:id` | 编辑 |
| POST | `/reviews/:id/export` | 导出 PDF/Word |

#### Stats(BI 首页数据 + 数据统计页)
| Method | Path | 说明 |
|--------|------|------|
| GET  | `/stats/dashboard` | 首页战报卡数据 |
| GET  | `/stats/tasks-trend?days=30` | 任务完成趋势 |
| GET  | `/stats/achievements-by-type` | 成果分类占比 |
| GET  | `/stats/project-time` | 项目时间占比 |
| GET  | `/stats/heatmap` | 一周 × 时段热力 |

### 4.3 关键接口详例

#### 4.3.1 `GET /stats/dashboard`

**Response**
```json
{
  "code": 0,
  "data": {
    "todayCompleted": 5,
    "todayTotal": 8,
    "todayAchievements": 3,
    "weekGoalProgress": 72,
    "weekOverview": {
      "tasksDone": 18,
      "achievementsAdded": 3,
      "reportGenerated": 1
    },
    "topProject": {
      "id": 12,
      "name": "库存预警优化项目",
      "progress": 75
    },
    "totalProjects": 6,
    "monthAchievements": 4
  }
}
```

#### 4.3.2 `POST /reports/generate`

**Request**
```json
{ "type": "weekly", "periodStart": "2026-08-04" }
```

**处理流程**
1. 校验 `periodStart` 是周一
2. 计算 `periodEnd = periodStart + 6 天`
3. 查询该期间 `status=2` 的任务、`done_date` 在期内的成果、项目进展
4. 套用模板 → 生成 Markdown
5. 写入 `reports` 表(status=0 草稿)
6. 返回详情

---

## 五、前端架构

### 5.1 目录结构

```
personal-workspace/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router/            # 路由配置
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── Tasks/
│   │   ├── Projects/
│   │   ├── Achievements/
│   │   ├── Reports/
│   │   ├── Reviews/
│   │   ├── Stats/
│   │   └── Settings/
│   ├── components/
│   │   ├── ui/            # shadcn/ui
│   │   ├── layout/        # AppShell / Sidebar / Header
│   │   └── shared/        # 业务通用组件
│   ├── features/          # 按领域拆分
│   │   ├── tasks/
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── store.ts
│   │   │   └── components/
│   │   ├── projects/
│   │   ├── achievements/
│   │   ├── reports/
│   │   └── stats/
│   ├── lib/
│   │   ├── api-client.ts  # ky 实例 + JWT 拦截器
│   │   ├── date.ts
│   │   └── utils.ts
│   ├── styles/
│   │   └── globals.css
│   └── types/             # 全局类型
├── public/
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### 5.2 路由表

| 路径 | 页面 | 说明 |
|------|-----|------|
| `/` | Dashboard | 首页 |
| `/tasks` | Tasks | 任务管理 |
| `/projects` | ProjectList | 项目列表 |
| `/projects/:id` | ProjectDetail | 项目详情 |
| `/achievements` | Achievements | 工作成果 |
| `/reports` | Reports | 周报月报 |
| `/reports/:id` | ReportEditor | 编辑器 |
| `/reviews` | Reviews | 绩效复盘 |
| `/stats` | Stats | 数据统计 |
| `/settings` | Settings | 设置 |
| `/login` | Login | 登录 |

### 5.3 关键组件设计

**AppShell**
- 左侧导航(64px 宽) + 顶栏 + 主内容 outlet
- 深浅色主题切换 via `class="dark"`(Tailwind)

**TodayBanner**(首页战报)
- Props: `dashboardData`
- 数字 tabular-nums,进度条 Radix Progress

**TaskItem**
- Props: `task, onToggle, onEdit`
- Checkbox + 标题 + 时间徽章 + 右上更多菜单

**ProjectProgress**
- Radix Progress + 百分比 + 悬浮 Popover 展示里程碑

### 5.4 状态管理策略

| 数据类型 | 存放 |
|---------|------|
| 服务端数据(任务/项目...) | TanStack Query,查询 key `[domain, ...filters]` |
| UI 状态(侧栏折叠、Modal 开关) | Zustand `useUiStore` |
| 用户偏好(主题) | Zustand + persist |
| 表单临时值 | React Hook Form |

**乐观更新**:勾选任务、拖拽排序等高频操作用 `onMutate` + rollback。

---

## 六、后端架构

### 6.1 分层
```
Controller → Service → Repository (Prisma) → DB
                    ↘ Producer → Queue → Worker (Cron)
```

### 6.2 模块划分(NestJS)
```
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── tasks/
│   ├── projects/
│   ├── achievements/
│   ├── reports/
│   ├── reviews/
│   ├── stats/
│   └── tags/
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   └── interceptors/
├── infra/
│   ├── prisma/
│   ├── redis/
│   ├── queue/
│   └── storage/          # OSS 上传
└── main.ts
```

### 6.3 周报自动生成(异步任务)

```
BullMQ Queue: reports
  ├─ Producer: 每周五 17:00 遍历所有用户 → 塞任务
  └─ Worker  : 消费任务 → 调用 ReportsService.generate() → 写库 → 站内通知
```

失败重试 3 次,退避策略 `expBackoff`。

### 6.4 权限模型
- V1.0 单用户,所有资源必带 `user_id` 校验(在 `AuthGuard` + Service 层双重防护)
- 未来多用户/团队:引入 `Role` + `Membership`

---

## 七、非功能设计

### 7.1 性能
- **前端**
  - 路由级代码分割 `React.lazy`
  - 首屏关键 JS < 200KB gzip
  - 列表虚拟滚动(react-virtuoso)
  - 图片懒加载
- **后端**
  - 首页 `/stats/dashboard` 加 Redis 缓存 60s
  - 长查询走 EXPLAIN,加索引
  - 分页强制 pageSize ≤ 100

### 7.2 安全
- HTTPS 全站,HSTS
- 密码 bcrypt(cost=12)
- JWT + Refresh Token,存 httpOnly Cookie(β 起)
- CSRF:同源 + SameSite=Lax
- 输入过滤:class-validator + 富文本用 DOMPurify
- 附件上传:后端签名 URL 直传 OSS,校验大小(≤20MB)、类型白名单
- SQL 注入:Prisma 参数化查询
- XSS:React 默认转义,富文本渲染前 sanitize
- 依赖漏洞:`npm audit` + Dependabot

### 7.3 可观测性
- 前端:Sentry(错误 + Web Vitals)
- 后端:pino → Loki;Prometheus 采指标;Grafana 大盘
- 关键告警:5xx 突增、DB 慢查询 > 500ms、队列堆积 > 100

### 7.4 数据备份
- RDS 每日全量 + 7 天 WAL
- 用户主动导出:`/data/export` 打包 JSON

---

## 八、里程碑与工时估算

| 阶段 | 内容 | 工时 |
|------|------|-----|
| M1 | 项目脚手架 + 路由 + AppShell + 主题 | 2 天 |
| M2 | Dashboard 首页(含 mock 数据) | 2 天 |
| M3 | 任务管理 CRUD + 拖拽 | 3 天 |
| M4 | 项目管理 + 里程碑 | 3 天 |
| M5 | 工作成果 CRUD + 附件 | 2 天 |
| M6 | 周报生成器 + 编辑器 | 3 天 |
| M7 | 月报 + 绩效复盘 | 2 天 |
| M8 | 数据统计 BI(Recharts) | 2 天 |
| M9 | 后端脚手架 + 鉴权 + Task/Project API | 3 天 |
| M10 | 其余 API + 队列 + Cron | 3 天 |
| M11 | 部署 + 监控 + 联调 | 2 天 |
| M12 | 内测修复 + 上线 | 3 天 |

**合计**:约 30 人日,单人节奏 ≈ 6 周

---

## 九、风险与对策

| 风险 | 影响 | 对策 |
|------|-----|------|
| 需求膨胀(团队协作/移动端) | 延期 | V1.0 严守单用户 Web,V2 规划 |
| 富文本坑多(粘贴/图片) | 交付质量 | 选成熟 Tiptap,限定粘贴清洗 |
| 周报生成规则模糊 | 用户不满意 | 先输出「素材列表」,让用户自组;下一版加 AI |
| 数据迁移(localStorage → 后端) | 用户数据丢失 | 提供「一键导入」+ 双写过渡期 |
| 附件成本 | 云费用高 | 单文件 20MB,总量 500MB 免费额度 |

---

## 十、开放技术决策

1. **是否引入 AI 辅助**(周报文案生成、STAR 描述润色)?
   - 建议:V1.1 引入,调用 Claude/OpenAI,前端加「AI 润色」按钮
2. **导出格式**:PDF 用 `puppeteer` 还是 `jsPDF`?
   - 建议:服务端 `puppeteer` 生成,质量更好
3. **移动端**:V2 走 PWA 还是 React Native?
   - 建议:PWA 优先,复用同一份代码
4. **数据同步**:V1.0 α localStorage → β 后端切换时如何迁移?
   - 建议:提供 `导入本地数据` 按钮,一次性上传
