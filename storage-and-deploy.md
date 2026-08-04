# 存储方案 & 部署方案

**文档**:storage-and-deploy.md
**版本**:V1.0
**日期**:2026-08-04
**对应文档**:[PRD.md](./PRD.md) / [TRD.md](./TRD.md)

---

## 一、总体策略:分阶段演进

个人自用产品,核心原则是「**先跑起来,再考虑体面**」。分三个阶段:

| Phase | 定位 | 存储 | 部署 | 成本 | 目标 |
|-------|------|-----|------|-----|------|
| **Phase 0** | α 自用 | localStorage | Vercel + GitHub | ¥0 | 1 天上线,先用起来 |
| **Phase 1** | β 稳定 | Supabase | Vercel + Supabase | ¥0 | 跨设备同步、GitHub 登录 |
| **Phase 2** | 正式版 | 自建 PostgreSQL | 云 VPS + Docker | ~¥50/月 | 完全自主、可接内网 |

不必一开始就上 Phase 2。**Phase 0 先跑,Phase 1 再谈优化**。

---

## 二、Phase 0:localStorage + Vercel

### 2.1 架构图
```
浏览器
  └─ React SPA
       ├─ Zustand (with persist)
       └─ localStorage ← 全部数据存这
GitHub
  └─ Push → Vercel 自动构建 → 上线
```

### 2.2 优点
- **0 成本**:Vercel 免费额度个人用一辈子;GitHub 公开仓库免费
- **0 后端**:不用写 API、不用鉴权、不用运维
- **秒级部署**:`git push` 后 30 秒上线
- **代码可读**:数据结构和 API DTO 一致,升级到 Supabase 零改数据模型

### 2.3 缺点与对策
| 缺点 | 对策 |
|------|-----|
| 换电脑数据没了 | 提供「导出 JSON / 导入 JSON」按钮 |
| 浏览器清缓存数据没了 | 同上 + 提示用户定期导出 |
| 单设备,无同步 | Phase 0 定位就是单设备,接受这个约束 |
| localStorage 上限 5MB | 通常 500-1000 条任务够用;超过切 IndexedDB(用 `idb-keyval`)|

### 2.4 关键实现

**数据层抽象**(切换存储时只改这一处):

```ts
// src/lib/storage/index.ts
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

// src/lib/storage/local.ts
export const localAdapter: StorageAdapter = {
  get: async (k) => JSON.parse(localStorage.getItem(k) ?? 'null'),
  set: async (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: async (k) => localStorage.removeItem(k),
};

// src/lib/storage/supabase.ts  ← Phase 1 加,签名不变
```

**Zustand persist**:
```ts
export const useTaskStore = create(
  persist(
    (set) => ({ tasks: [], addTask: ... }),
    { name: 'workspace-tasks' }
  )
);
```

**导入导出**:
- 导出:`JSON.stringify(全量 store) → 下载文件`
- 导入:`用户选文件 → 解析 → 灌回 store`
- 建议每周提示一次

### 2.5 部署步骤(5 步)
1. GitHub 建仓库 `personal-workspace`(建议先私有)
2. `pnpm create vite` 初始化 → 推第一个 commit
3. 登录 [vercel.com](https://vercel.com) 用 GitHub 授权
4. Import 仓库 → 全默认 → Deploy
5. 拿到 `xxx.vercel.app` 域名,想换自定义域名后续再绑

---

## 三、Phase 1:Supabase + Vercel

### 3.1 为什么是 Supabase
| 需求 | Supabase 是否满足 |
|------|-----------------|
| PostgreSQL(和 TRD 数据模型对齐) | ✅ 原生 |
| 鉴权(GitHub / 邮箱登录) | ✅ 内置 |
| 附件存储(成果附件) | ✅ Storage 模块 |
| 多用户隔离 | ✅ Row Level Security |
| 免费额度 | ✅ 500MB DB + 1GB Storage + 50k MAU |
| 前端直连(不写后端) | ✅ `@supabase/supabase-js` |
| 未来加实时同步 | ✅ RealTime 订阅 |
| 数据可导出 | ✅ 支持 `pg_dump` |

**结论**:个人产品的**最佳性价比**方案。

### 3.2 架构图
```
浏览器
  └─ React SPA
       ├─ Zustand (UI 状态)
       ├─ TanStack Query (缓存 + 请求)
       └─ Supabase JS SDK
                │
                ▼
       ┌────────────────────┐
       │    Supabase        │
       │  ├─ PostgreSQL      │
       │  ├─ Auth (GitHub)   │
       │  ├─ Storage (附件)  │
       │  └─ Edge Functions  │← 周报生成 Cron 放这
       └────────────────────┘
```

### 3.3 RLS 策略(核心安全)
所有表加一条策略:「行的 `user_id` 必须等于当前登录用户」。

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tasks only" ON tasks
  FOR ALL
  USING (auth.uid() = user_id::uuid)
  WITH CHECK (auth.uid() = user_id::uuid);
```

前端就算写错查询,数据库也会拒绝跨用户读取。

### 3.4 周报生成 Cron
Supabase 有两种选择:
- **pg_cron**(内置定时器)+ **Edge Function**:纯 Supabase 内做,免费
- **Vercel Cron Job**:免费额度 20 次/天,够用

推荐 **Vercel Cron**,代码在同一个仓库,好维护。

### 3.5 迁移(Phase 0 → Phase 1)
关键点:**用户已有 localStorage 数据不能丢**。

流程:
1. 用户首次登录 → 检测到本地有数据 → 弹窗:「检测到本地有 X 条数据,是否上传到云端?」
2. 用户点「上传」→ 遍历 localStorage → 批量 INSERT 到 Supabase
3. 上传成功 → 本地数据只作缓存,标记 `synced=true`
4. 后续所有操作走 Supabase,localStorage 作离线缓存

### 3.6 成本
- Supabase 免费版:500MB DB + 1GB Storage + 50k MAU + 2GB 出流量/月
- Vercel 免费版:100GB 流量/月
- **个人自用 = ¥0**

---

## 四、Phase 2:自建(可选)

### 4.1 触发条件(满足其一才考虑)
- Supabase 免费额度不够(个人几乎不可能)
- 想接公司内网数据(飞书/企微/公司 SSO)
- 数据合规要求(不出私域)
- 就是想练手

### 4.2 推荐方案
- **服务器**:腾讯云轻量应用服务器 2C4G(¥40-50/月)
- **系统**:Ubuntu 22.04
- **部署**:Docker Compose(1 个 compose 文件搞定 4 个服务)
  ```yaml
  services:
    postgres: ...     # 16
    redis: ...        # 7
    api: ...          # NestJS
    caddy: ...        # 反向代理 + 自动 HTTPS
  ```
- **前端**:仍然 Vercel(免费 CDN),API 请求打到自建服务器
- **备份**:每天 `pg_dump` → 对象存储(阿里 OSS 或 Cloudflare R2),保留 30 天

### 4.3 迁移(Phase 1 → Phase 2)
- 走 `pg_dump` + `pg_restore`,一条命令
- 前端只改 API base URL
- 数据模型完全一致(所以 Phase 1 就该用规范的 schema)

---

## 五、备选方案说明

### 5.1 Firebase
- **优**:功能类似 Supabase,更成熟
- **劣**:国内访问慢(Google);Firestore 是文档数据库,和 TRD 的关系模型不匹配,要重写数据层

### 5.2 Cloudflare D1 + Pages
- **优**:全边缘、全免费、和 Cloudflare 生态一体
- **劣**:D1 是 SQLite,复杂 SQL 弱;生态没 Supabase 成熟
- **适合**:偏极客路线,愿意折腾

### 5.3 GitHub Pages(替代 Vercel)
- **优**:代码和部署都在 GitHub,不依赖第三方
- **劣**:构建配置麻烦,Vite 项目要额外配 `base` 和 GitHub Actions
- **结论**:除非你不想用 Vercel,否则 Vercel 更省心

### 5.4 Notion / Airtable 作后端
- **优**:0 代码后端
- **劣**:API 限速严重(3 次/秒),做产品级应用不合适
- **结论**:❌ 不推荐

---

## 六、决策表

**如果你符合以下描述,选 Phase 0**:
- 想快速看到成品(1-2 天上线)
- 只在自己电脑用
- 还没想好长期怎么维护

**如果你符合以下描述,直接跳 Phase 1**:
- 要在手机、平板、公司电脑之间同步
- 想让家人朋友也能用
- 愿意花 1 小时接入 Supabase

**如果你符合以下描述,考虑 Phase 2**:
- 想接公司内网(飞书 / 企微 / 内部 SSO)
- 有数据不出私域的合规需求
- 已经跑了半年,数据非常重要

---

## 七、我的推荐路径

```
Week 1 → Phase 0 上线,先用起来
Week 2-3 → 稳定使用中,收集自己使用中真正缺的功能
Week 4 → 想同步了,花个周末迁到 Phase 1
Month 6+ → 视情况决定要不要 Phase 2
```

**不要提前优化**。个人产品最大的死因是"我先把架构搞好再开始做",然后就没有然后了。

---

## 八、GitHub 仓库建议

### 8.1 命名与可见性
- 仓库名:`personal-workspace`
- 可见性:**先私有**,稳定后再开源(避免早期暴露半成品)
- License:MIT(如后续开源)

### 8.2 目录结构
```
personal-workspace/
├── docs/                       ← 从这几份文档搬进去
│   ├── PRD.md
│   ├── TRD.md
│   ├── report-generation-spec.md
│   └── storage-and-deploy.md
├── src/                        ← 前端代码
├── supabase/                   ← Phase 1 加:migrations & functions
│   ├── migrations/
│   └── functions/
├── .github/
│   └── workflows/              ← CI:type check + build
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

### 8.3 关键 .gitignore
```
node_modules
dist
.env
.env.local
.vercel
supabase/.branches
supabase/.temp
*.local
```

### 8.4 README 骨架
- 项目截图 1 张
- 一句话介绍
- 功能清单
- 技术栈
- 本地启动:`pnpm i && pnpm dev`
- 部署指南:Vercel 一键 + Supabase 配置

### 8.5 环境变量
```
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME=Personal Workspace
```

真值在 Vercel 后台配,不进仓库。

---

## 九、下一步 Checklist

- [ ] GitHub 建 `personal-workspace` 仓库(私有)
- [ ] 本地 `pnpm create vite` 初始化 + Tailwind + shadcn/ui
- [ ] 搭 AppShell + 路由 + 首页 mock 数据
- [ ] 实现 `StorageAdapter` 抽象层(先用 localStorage)
- [ ] 首页 → 任务 → 项目 → 成果 依次开发
- [ ] 加导入导出按钮
- [ ] Push GitHub → 连 Vercel → 上线
- [ ] 用一周,收集不爽的地方
- [ ] 迁 Supabase(Phase 1)
