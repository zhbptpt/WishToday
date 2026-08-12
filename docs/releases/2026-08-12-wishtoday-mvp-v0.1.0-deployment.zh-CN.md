# WishToday MVP v0.1.0 部署与发布验证

- 执行日期：2026-08-12
- 部署版本：v0.1.0
- 部署平台：GitHub Pages
- 生产地址：`https://zhbptpt.github.io/WishToday/`
- 发布状态：部署准备完成，生产发布被仓库 Pages 设置阻塞
- GitHub Actions：`https://github.com/zhbptpt/WishToday/actions/runs/31611992395`

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

## 发布门禁

- 全量测试：通过（22 个 Vitest 测试文件、107 项测试；3 项部署配置测试）
- TypeScript 类型检查：通过
- GitHub Pages 生产构建：通过
- 依赖安全审计：通过（`npm audit`，0 项已知漏洞）
- 本地生产路由冒烟测试：通过（首页、详情、登录与未知路由回退）
- GitHub Actions 发布工作流：失败。依赖安装与全部自动化测试通过，`Configure GitHub Pages` 因仓库尚未启用 Pages 而失败，后续构建与部署步骤被跳过。
- 生产 URL 冒烟测试：未通过。`https://zhbptpt.github.io/WishToday/` 当前返回 HTTP 404，与 Pages 尚未启用的状态一致。

## 发布阻塞项

仓库所有者需要在 GitHub 仓库执行一次设置：

1. 打开 `Settings -> Pages`。
2. 在 `Build and deployment` 中将 `Source` 设为 `GitHub Actions`。
3. 手动重新运行 `Deploy GitHub Pages` 工作流，或在 `main` 产生新的有效提交后等待自动运行。

该设置需要仓库管理权限。工作流自带的 `GITHUB_TOKEN` 不能首次启用 Pages；`actions/configure-pages` 的自动启用模式需要额外的个人访问令牌或具备 `administration:write` 与 `pages:write` 权限的 GitHub App，因此本次发布不引入额外密钥。

Pages 启用并且工作流成功后，需对生产首页、鸡尾酒详情、登录页、未知路由回退和至少一个直接访问的深链接执行生产环境冒烟测试，才能将发布状态更新为“已发布”。

## 版本归档状态

- 初始部署配置提交：`7461fb2e236d082439b975922fbccefc36cbbf45`
- `v0.1.0` 标注标签对象：`d32943da833c8fc708497e4adbfd4c2c864e1750`
- `v0.1.0` 指向的签收提交：`a63d3996d72734120c7e962491d7274b0c32ea9f`
- 本地与远端标签引用一致，标签保持不变。

## 已知非阻塞问题

- 当前部署仍使用本地 mock 数据和 mock 认证，尚未接入真实后端与 API。这是 v0.1.0 已确认的 MVP 边界。

## 已解决遗留问题

- 已通过路由级懒加载拆分页面代码。Pages 生产构建中最大的 JavaScript chunk 为鸡尾酒详情页约 294.96 kB（gzip 89.86 kB），所有 chunk 均低于 Vite 默认的 500 kB 警告线。
- 已增加 Store 持久化回归测试，确认草稿、登录态和已保存配方可由 Zustand `persist` 恢复。浏览器环境使用 `localStorage`，正常刷新不会重置这些核心流程数据。
