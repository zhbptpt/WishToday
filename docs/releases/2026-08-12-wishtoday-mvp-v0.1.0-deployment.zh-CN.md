# WishToday MVP v0.1.0 部署与发布验证

- 执行日期：2026-08-12
- 部署版本：v0.1.0
- 部署平台：GitHub Pages
- 生产地址：`https://zhbptpt.github.io/WishToday/`
- 发布状态：待远端工作流验证

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

- 全量测试：通过（22 个 Vitest 测试文件、106 项测试；2 项部署配置测试）
- TypeScript 类型检查：通过
- GitHub Pages 生产构建：通过
- 本地生产路由冒烟测试：通过（首页、详情、登录与未知路由回退）
- GitHub Actions 发布工作流：待复验
- 生产 URL 冒烟测试：待复验

## 已知非阻塞问题

- 主 JavaScript 包仍超过 Vite 默认的 500 kB 警告线。
- 当前部署使用本地 mock 数据和 mock 认证，刷新页面会重置运行期保存数据。
