# WishToday MVP v0.1.0 部署与发布验证

- 执行日期：2026-08-12
- 部署版本：v0.1.0
- 部署平台：GitHub Pages
- 生产地址：`https://zhbptpt.github.io/WishToday/`
- 发布状态：已发布
- GitHub Actions：`https://github.com/zhbptpt/WishToday/actions/runs/31614452254`（Attempt 3）

## 平台决策

WishToday MVP 是使用本地 mock 数据和 mock 认证的 Vite 单页应用，不依赖服务端运行时。GitHub Pages 可以直接复用现有 GitHub 仓库与推送流程，不引入额外平台账户或运行时依赖，因此作为 v0.1.0 的首个发布平台。

## SPA 路由策略

- 生产资源基路径固定为 `/WishToday/`。
- React Router 使用 Vite 的 `BASE_URL` 作为 `basename`。
- Pages 构建将 `index.html` 复制为 `404.html`，让深链接请求返回应用入口，再由客户端路由解析具体页面。
- 未识别的应用路由继续由现有路由配置重定向到 `/home`。

## 自动发布流程

`.github/workflows/deploy-pages.yml` 在 `main` 分支推送后执行：

1. 安装锁定依赖。
2. 运行全量自动化测试。
3. 使用 `/WishToday/` 基路径构建生产产物。
4. 上传 `dist` 目录并部署到 GitHub Pages。

仓库 Pages 的发布源已设置为 `GitHub Actions`。`github-pages` Environment 的部署分支策略已新增 `main`，同时保留原有 `codex/archival-manuscript-visuals` 规则。最终工作流 Attempt 3 的 `build` 与 `deploy` job 均成功，部署提交为 `aff32527276e70d3475ac2973d97168a99c0cfc6`。

## 发布门禁

- 全量测试：通过（22 个 Vitest 测试文件、107 项测试；3 项部署配置测试）
- TypeScript 类型检查：通过
- GitHub Pages 生产构建：通过
- 依赖安全审计：通过（`npm audit`，0 项已知漏洞）
- 本地生产路由冒烟测试：通过（首页、详情、登录与未知路由回退）
- GitHub Actions 发布工作流：通过。最终运行 `31614452254` 的 Attempt 3 中，`build` 与 `deploy` 均成功。
- 生产 HTTP 冒烟测试：通过。首页和 `404.html` 返回 HTTP 200；鸡尾酒详情、登录页和未知深链接返回 GitHub Pages 预期的 HTTP 404，但响应体均为完整 SPA 入口，并包含 `/WishToday/assets/` 下的生产资源路径。
- 生产浏览器冒烟测试：通过。直接访问 `/WishToday/cocktails/old-fashioned` 可正确渲染古典鸡尾酒详情、风味图谱、配料清单、调制步骤与 DIY 入口，控制台无应用错误；首页最终落在 `/WishToday/home`。
- 路由回归测试：通过。自动化测试覆盖首页、详情、登录以及未知路由重定向到 `/home`；生产构建使用同一套路由配置。

## GitHub Pages 深链接说明

GitHub Pages 不提供服务端 SPA 重写规则。直接请求详情、登录或未知路由时，网络层会返回 HTTP 404 和项目的 `404.html`；该文件与 `index.html` 内容一致，因此浏览器仍会加载 React 应用，并由客户端路由渲染目标页面或将未知路由重定向到 `/home`。网络面板中的 404 是平台限制下的预期行为，不代表页面不可用。

## 已解除发布阻塞

- 仓库 Pages 的 `Build and deployment -> Source` 已设置为 `GitHub Actions`。
- `github-pages` Environment 原本仅允许 `codex/archival-manuscript-visuals` 部署；现已新增 `main` 允许规则。
- 环境策略修正后重新运行工作流，Attempt 3 已成功完成生产部署。

## 版本归档状态

- 初始部署配置提交：`7461fb2e236d082439b975922fbccefc36cbbf45`
- `v0.1.0` 标注标签对象：`d32943da833c8fc708497e4adbfd4c2c864e1750`
- `v0.1.0` 指向的签收提交：`a63d3996d72734120c7e962491d7274b0c32ea9f`
- 本地与远端标签引用一致，标签保持不变。
- 本次部署收尾文档提交晚于 v0.1.0 签收提交，不移动或重建已归档标签。

## 已知非阻塞问题

- 当前部署仍使用本地 mock 数据和 mock 认证，尚未接入真实后端与 API。这是 v0.1.0 已确认的 MVP 边界。
- GitHub Pages 仓库当前为公开可见。该状态不会在发布收尾中自动修改，仓库所有者需确认是否符合项目预期。

## 已解决遗留问题

- 已通过路由级懒加载拆分页面代码。Pages 生产构建中最大的 JavaScript chunk 为鸡尾酒详情页约 294.96 kB（gzip 89.86 kB），所有 chunk 均低于 Vite 默认的 500 kB 警告线。
- 已增加 Store 持久化回归测试，确认草稿、登录态和已保存配方可由 Zustand `persist` 恢复。浏览器环境使用 `localStorage`，正常刷新不会重置这些核心流程数据。
