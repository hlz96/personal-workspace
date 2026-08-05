# 个人工作台 · Personal Workspace

**把每天做过的事,变成可复盘、可汇报、可沉淀的成长记录。**

面向所有需要沉淀个人成长与工作产出的人:职场人、学生、自由职业者、创业者、待业规划者……
底层能力通用(任务 → 项目 → 成果 → 周期总结 → 复盘),通过**身份画像 + 场景模板**适配不同群体。

## 特性

- **通用化设计** — 5 种身份画像 + 内置场景模板(通用职场人 / 研发 / 运营 / 学生),支持切换与混用
- **首页仪表盘** — 今日战报 · 项目进度 · 本周概览 · 月度成果 一屏俯瞰
- **任务管理** — 今天 / 本周 / 稍后 / 已完成,勾选完成即联动项目进度
- **项目/课题管理** — 进度条 + 里程碑,任务算进度或手动覆盖
- **成果沉淀库** — 按月归档,可标注量化数据、类型、关联项目
- **周报/月报自动生成** — 一键把留痕聚合成 80 分草稿,支持复制/下载 Markdown
- **周期复盘** — 季度 / 半年 / 年度,STAR 结构化模板
- **数据统计** — 30 天完成趋势 · 成果分类 · 项目分布
- **深浅色主题** — 一键切换,主题偏好本地保存
- **数据自主** — 全量导出 / 导入 JSON,数据永远在你手里

## 技术栈

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Zustand(状态 + localStorage 持久化)
- React Router 6
- lucide-react

## 本地开发

```bash
pnpm install    # 或 npm install / yarn
pnpm dev        # 启动 http://localhost:5173
pnpm build      # 生产构建
pnpm preview    # 预览构建结果
```

## 部署到 Vercel

1. 推送到 GitHub 仓库(见 `github.com/hlz96/personal-workspace`)
2. Vercel 后台 → New Project → 授权 GitHub → Import 仓库
3. Framework Preset 会自动识别为 Vite,默认设置即可 → Deploy
4. 拿到 `xxx.vercel.app` 域名,可按需绑定自定义域名

`vercel.json` 已配置 SPA 路由 rewrite,无需额外调整。

### ⚠️ 部署注意事项(踩过的坑)

- **必须在 Vercel 配置环境变量**:`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`(Settings → Environment Variables,勾选 Production)。这两个变量是**构建时**内联进 JS 的,改动后必须 **Redeploy 且取消 Build Cache** 才生效,否则线上连不上 Supabase。
- **关闭 Deployment Protection**:Vercel 默认可能开启 Vercel Authentication,导致站点对公众返回 302/401(表现为打不开或白屏)。Settings → Deployment Protection → 关掉 Vercel Authentication。
- **认准 Production 域名**:形如 `personal-workspace-hlz3.vercel.app`。带 hash 的部署快照 URL(如 `...-2bs4y4bx3-...`)会随每次部署变化且可能失效,不要用它做登录/分享入口。
- **Supabase Auth 回调**:Authentication → URL Configuration 里,Site URL 与 Redirect URLs 都要包含线上 Production 域名(本地开发再额外加 `http://localhost:5173/**`),否则 OAuth 登录回调会跳错域名。
- **邮箱验证**:Supabase 免费版内置邮件限流严重(易触发 `email rate limit exceeded`)。个人自用建议 Authentication 里关闭 Confirm email,改用 GitHub 登录或注册即登录。

## 目录结构

```
personal-workspace/
├── src/
│   ├── components/    # UI + Layout + 通用业务组件
│   ├── data/          # seed + 内置模板
│   ├── features/      # 按领域拆分(如 reports 生成器)
│   ├── lib/           # 工具、i18n、Theme hook
│   ├── pages/         # 8 大页面
│   ├── store/         # zustand store
│   ├── styles/        # globals.css
│   └── types/         # 全局类型
├── public/
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json        # Vercel SPA 配置
└── vite.config.ts
```

## 数据存储路线

- **Phase 0(当前)**:localStorage,单设备使用,提供 JSON 导入导出
- **Phase 1(计划)**:Supabase(PostgreSQL + Auth + Storage),跨设备同步
- **Phase 2(可选)**:自建 PostgreSQL / 云 VPS

详见 [`storage-and-deploy.md`](./storage-and-deploy.md)。

## 文档

- [`PRD.md`](./PRD.md) — 产品需求文档
- [`TRD.md`](./TRD.md) — 技术设计文档
- [`report-generation-spec.md`](./report-generation-spec.md) — 周报/月报生成规范
- [`storage-and-deploy.md`](./storage-and-deploy.md) — 存储与部署方案
- [`data-retention-policy.md`](./data-retention-policy.md) — 数据保留策略

## License

MIT
