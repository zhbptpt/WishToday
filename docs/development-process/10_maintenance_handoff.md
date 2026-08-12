# 10 WishToday MVP 维护交接

状态：可交接到下一阶段
负责角色：维护负责人
日期：2026-08-13

## 输入

- `docs/development-process/00_process_index.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-signoff.zh-CN.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-deployment.zh-CN.md`
- `docs/technical-stack-and-scaffold.zh-CN.md`
- 当前 `main` 分支代码与 GitHub Pages 生产环境

## 范围

本阶段说明如何理解、运行、验证、部署和排障 WishToday MVP v0.1.0，并记录已知限制和后续开发入口。不会加入新功能或改变已签收范围。

## 已完成工作

- 汇总本地开发、自动化验证和生产构建命令。
- 记录核心模块职责、状态持久化和 mock API 边界。
- 记录 GitHub Pages 自动部署、SPA 深链接行为和发布后检查步骤。
- 完成默认分支和仓库可见性治理确认，并记录 mock 数据边界等维护事项。

## 系统概览

WishToday 是 React 19、TypeScript、Vite 构建的单页应用。React Router 负责页面路由，Zustand 负责核心流程状态，当前数据和认证由本地 mock 实现。v0.1.0 的已签收主链路为：

今日推荐 -> 详情 -> 实验台 -> 预览 -> 登录保存 -> 配方详情 -> 私人笔记本

生产环境部署在 GitHub Pages：`https://zhbptpt.github.io/WishToday/`。

## 重要文件及职责

| 路径 | 职责 |
| --- | --- |
| `src/main.tsx` | 应用入口；使用 Vite `BASE_URL` 配置路由 basename。 |
| `src/routes/AppRouter.tsx` | 路由表、页面懒加载、未知路由回退。 |
| `src/routes/paths.ts` | 集中维护应用路由常量。 |
| `src/types/domain.ts` | 鸡尾酒、材料、草稿、配方与会话领域模型。 |
| `src/mocks/` | MVP 鸡尾酒和材料示例数据。 |
| `src/services/` | 数据访问边界；当前调用 mock，实现可被后续真实 API 替换。 |
| `src/store/useWishTodayStore.ts` | 草稿、登录态、保存状态和私人配方的核心流程状态。 |
| `src/pages/` | 首页、详情、实验台、预览、认证、配方详情和笔记本页面。 |
| `src/components/` | 跨页面或页面级可复用组件。 |
| `src/styles/global.css` | 全局视觉、响应式和页面样式。 |
| `.github/workflows/deploy-pages.yml` | `main` 推送后的测试、构建和 Pages 部署流程。 |
| `scripts/prepare-spa-fallback.mjs` | 将 `index.html` 复制为 `404.html`，支持 Pages 深链接启动 SPA。 |
| `scripts/deployment-config.check.mjs` | 部署配置和路由懒加载回归检查。 |

## 常见操作

### 首次安装与本地运行

运行环境使用 Node.js 22，与 GitHub Actions 保持一致。

```powershell
npm ci
npm run dev
```

Vite 会在终端输出本地访问地址。开发前确认当前分支和工作区状态：

```powershell
git status --short --branch
```

### 提交前验证

```powershell
npm test
npm run typecheck
npm run build:pages
npm audit
git diff --check
```

当前基线为 22 个 Vitest 文件、107 项测试和 3 项部署配置检查。测试数量会随后续版本变化，判断标准应以命令退出码和失败数为准。

### 本地检查 Pages 构建

```powershell
npm run build:pages
npm run preview -- --base=/WishToday/
```

`build:pages` 会生成 `dist/index.html` 和内容相同的 `dist/404.html`。不要手工维护 `dist`；它是构建产物并已被 Git 忽略。

### 生产部署

`main` 分支推送会触发 `.github/workflows/deploy-pages.yml`：

1. `npm ci`
2. `npm test`
3. `npm run build:pages`
4. 上传 `dist`
5. 部署到 `github-pages` Environment

部署前提：Pages Source 为 `GitHub Actions`，`github-pages` Environment 允许 `main` 分支部署。发布完成后检查 Actions 的 `build` 和 `deploy` job 均为成功。

### 发布后冒烟检查

- 首页：`https://zhbptpt.github.io/WishToday/`
- 详情深链接：`https://zhbptpt.github.io/WishToday/cocktails/old-fashioned`
- 登录页：`https://zhbptpt.github.io/WishToday/login`
- 未知路由：确认客户端最终回到 `/WishToday/home`
- 检查浏览器控制台没有应用错误。

GitHub Pages 对详情、登录和未知深链接的首个网络请求会返回 HTTP 404，但响应体是 `404.html` 中的 SPA 入口。只要页面正确渲染且资源从 `/WishToday/assets/` 加载，这就是预期行为。

## 状态与数据注意事项

Zustand persist 使用浏览器 `localStorage`，键名为 `wishtoday-flow-state`。持久化内容包括：

- 当前实验台草稿
- 模拟登录会话
- 待登录后继续保存的动作
- 保存状态和错误
- 已保存配方及最后保存的配方 ID

清除浏览器站点数据或执行以下操作会删除这些本地数据：

```javascript
localStorage.removeItem("wishtoday-flow-state")
```

此操作只用于明确的数据重置或排障。执行前应告知测试者草稿、模拟登录态和私人笔记本内容都会丢失。

`src/services/recipeService.ts` 还维护一个进程内 mock repository；页面刷新后，Store 中持久化的配方仍可恢复，但 service repository 本身会重新初始化。接入真实后端时应统一数据源，避免继续保留双重存储语义。

## 排障指南

### 页面空白或资源 404

1. 确认使用 `npm run build:pages`，而不是普通 `npm run build` 作为 Pages 产物。
2. 检查 HTML 资源路径是否以 `/WishToday/assets/` 开头。
3. 确认 `BrowserRouter` 的 basename 仍来自 `import.meta.env.BASE_URL`。
4. 检查 Actions 构建和部署 job 是否成功。

### 深链接刷新显示 GitHub 404

1. 检查 `dist/404.html` 是否存在并与 `dist/index.html` 一致。
2. 检查响应体是否包含应用根节点和 `/WishToday/assets/` 资源。
3. 使用真实浏览器确认客户端路由是否正常渲染；不要仅凭网络状态码判定失败。

### 草稿或私人笔记本数据异常

1. 检查 `localStorage` 中的 `wishtoday-flow-state`。
2. 运行 `src/store/useWishTodayStore.test.ts` 的持久化回归测试。
3. 只有在确认可丢弃数据后才清除存储键。

### 模拟失败场景

测试可使用 `src/services/apiClient.ts` 的 `configureMockFailure` 和 `resetMockFailures` 注入单次或多次操作失败。它们是测试控制能力，不应暴露为生产 UI 功能。

## 已知限制

- 当前没有真实后端、数据库和真实认证；生产数据只存在于访问者当前浏览器。
- 更换浏览器、设备、浏览器配置文件或清除站点数据后，私人数据不会同步或恢复。
- GitHub Pages 不提供真正的 SPA 服务端 rewrite，深链接首个响应保持 HTTP 404。
- 没有服务端监控、错误收集或产品分析；发布后观察依赖 Actions 状态和人工冒烟检查。
- 仓库继续保持公开可见；后续若需转为私有，应先评估 GitHub Pages 可用性和公开访问影响。
- GitHub 默认分支、部署分支和持续开发分支已统一为 `main`。

## 下一版本启动条件

v0.2.0 或其他新版本开始前，应先完成：

1. 产品角色确认目标、用户价值和明确的非目标。
2. 需求角色定义可测试的验收标准。
3. 决定是否优先接入真实后端/API；若接入，先定义认证、数据迁移、隐私与失败恢复策略。
4. 明确数据迁移方案，避免用户现有 `localStorage` 配方无提示丢失。
5. 形成新的技术设计和实施计划后再修改代码。

社区、摇一摇、发布、收藏、从零创建配方、已保存配方编辑/删除、笔记本搜索/筛选仍不属于 v0.1.0；后续是否纳入必须经过新版本产品决策。

## 决策

- 维护期以稳定现有核心链路和发布能力为主。
- 不移动 v0.1.0 标签；它继续指向已签收提交 `a63d3996d72734120c7e962491d7274b0c32ea9f`。
- 真实 API 接入应复用 `src/services/` 边界，不让页面直接依赖网络实现。
- GitHub 默认分支已调整为 `main`，仓库继续保持公开可见。

## 交付物

- `docs/development-process/10_maintenance_handoff.md`
- 更新后的 `docs/development-process/00_process_index.md`

## 交接验证

2026-08-13 已基于 `main` 分支完成以下验证：

| 检查 | 结果 |
| --- | --- |
| `npm test` | 通过：22 个 Vitest 文件、107 项测试，以及 3 项部署配置检查。 |
| `npm run typecheck` | 通过。 |
| `npm run build:pages` | 通过；生成仓库 base path 正确的 `dist/index.html` 和 `dist/404.html`。 |
| `npm run preview -- --base=/WishToday/` | 通过；本地 `/WishToday/` 返回 HTTP 200，入口和资源路径正确。 |
| `npm audit` | 通过：0 个已知漏洞。 |
| `git diff --check` | 通过。 |
| 生产 HTTP 冒烟 | 首页返回 200；详情深链接按 Pages 回退预期返回 404，二者响应体均包含 SPA 入口和 `/WishToday/assets/` 资源。 |
| 仓库治理 | 默认分支已调整为 `main`；仓库继续保持公开可见。 |

## 完成标准

- [x] 系统和核心模块职责已记录。
- [x] 本地运行、测试、构建和部署步骤已记录。
- [x] 状态持久化、数据重置影响和 mock 边界已记录。
- [x] 生产冒烟与 GitHub Pages 深链接限制已记录。
- [x] 已知限制、治理问题和下一版本启动条件已记录。

## 开放问题

- 下一版本是否优先建设真实后端/API，尚未进入产品决策。

## 给下一角色的交接

日常维护先按本文执行验证和排障。需要修改功能时，先阅读 `docs/development-process/00_process_index.md` 和 v0.1.0 签收范围；如属于新版本能力，交给产品角色开启新的发现与需求阶段，不直接在维护任务中实现。
