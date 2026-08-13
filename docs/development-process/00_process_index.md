# 00 WishToday 开发流程索引

状态：Task 21 实施计划修订已签收，可进入阶段 06
负责角色：流程协调员
日期：2026-08-13

## 输入

- `WishToday_PRD_产品需求文档_Codex.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/02_requirements_spec.md`
- `docs/development-process/03_design_spec.md`
- `docs/development-process/10_maintenance_handoff.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-signoff.zh-CN.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-deployment.zh-CN.md`
- 当前仓库、GitHub Pages 生产环境与 GitHub Actions 状态

## 范围

本索引维护 WishToday 各版本所处阶段、负责角色、交付物和交接入口。v0.2.0 首项 Supabase 认证能力硬门禁判定为 `NO-GO` 后，已停止后续云端实现并返回技术设计阶段。用户确认并签收方案 A，修订设计采用“最小化 NestJS 认证与私人数据网关 + Supabase PostgreSQL”；对应的 13 项修订实施计划已完成签收，可进入阶段 06。

## 当前周期

- 当前版本：v0.2.0
- 已完成阶段：01 产品发现、02 需求规格、03 产品设计、04 技术设计方案 A 修订、05 实施计划修订
- 当前阶段：06 实现准备
- 当前状态：Task 21 修订计划已签收；计划签收阻塞已解除
- 下一阶段：06 实现
- 下一角色：实现工程师
- 下一交付物：Task 1 工程基线及更新后的 `docs/development-process/06_implementation_log.md`

## 已完成工作

- 确认 WishToday MVP v0.1.0 已完成核心链路、正式签收并发布到 GitHub Pages。
- 完成 v0.1.0 维护交接与仓库治理确认，历史版本保持归档状态。
- 完成 v0.2.0 产品发现，选择“真实账户与云端私人笔记本”作为唯一核心目标。
- 明确游客路径、本地配方主动导入、失败恢复、非目标和成功信号。
- 将经典鸡尾酒配方库拆分为 v0.3.0 候选方向。
- 完成 v0.2.0 需求规格，定义账户、会话、云端保存、跨设备读取、本地导入和失败恢复的 P0 验收标准。
- 明确角色权限、数据归属、安全、隐私、可靠性、性能、可访问性和兼容性门槛。
- 完成 v0.2.0 信息架构、注册验证、密码恢复、认证回跳、本地主动导入和云端笔记本状态设计。
- 确认手机端保持“整屏即书页”的沉浸式笔记本结构，账户入口采用右侧书页索引签，不增加传统 App 导航栏。
- 定义响应式、键盘、焦点、状态播报、对比度、超时与减少动态效果规范。
- 完成 v0.2.0 技术方案比较并确认保留 React Web、采用 Supabase 托管后端。
- 定义 Zustand 与 TanStack Query 状态边界、Supabase Auth、PostgreSQL、RLS 和 Edge Functions 架构。
- 定义密码重置后的全局会话失效、私人配方所有权、保存幂等和本地导入判重。
- 定义 API、错误恢复、本地持久化迁移、安全、部署、测试、观测和回滚方案。
- 原实施计划曾将 v0.2.0 技术设计拆分为 12 个有序、可测试、可回滚的实施任务。
- 将 Supabase 密码更新终态、全局会话撤销、Auth Hook 与 RLS 联动设为首个 Go/No-Go 门禁。
- 定义每个实施任务的文件、接口、依赖、验证命令、提交边界和回滚规则。
- 建立 AUTH-01 至 ERROR-01 的逐项追踪，并补齐 24 小时待恢复动作、本地存储降级、限流、浏览器兼容、性能与观测门禁。
- 用户已于 2026-08-13 书面签收原 v0.2.0 实施计划；该版本随后因 Task 22 `NO-GO` 失效。
- 完成 Task 22 Supabase 认证能力门禁并得到 `NO-GO`，未降低密码重置后旧会话立即失效标准。
- 用户确认方案 A：提前引入最小化 NestJS 认证与私人数据网关，保留 Supabase PostgreSQL。
- 修订技术设计，将密码凭据、Refresh Session、`session_version` 与密码重置终态统一至 PostgreSQL 事务边界。
- 浏览器不再直连 Supabase Auth、PostgREST 或 Edge Functions；NestJS 成为唯一认证与私人数据 API 入口。
- 用户已于 2026-08-13 书面签收 Task 20 方案 A 修订设计。
- 完成 Task 21 实施计划修订，将新架构拆分为 13 个有序、可测试、可回滚的任务。
- 固定 NestJS 11 + Express、Node.js 22、原生 `pg` 8 显式事务、Argon2id、`jose` 6/RS256、Resend、Render Web Service 与 Supabase PostgreSQL 技术基线。
- 将新架构认证安全验证设为 Task 5 硬门禁；密码重置原子性与故障回滚、operation 幂等、双设备旧 Token 立即失效、Refresh 轮换与重放、精确限流、RLS 连接池隔离七项必须全部 `PASS`。
- 建立 AUTH-01 至 ERROR-01 的修订任务追踪，并纳入 CI、同站子域部署、观测、回滚和范围回归检查。
- 用户已于 2026-08-13 书面签收 Task 21 修订实施计划。

## 阶段状态

| 阶段 | 负责角色 | v0.2.0 状态 | 主要文档 |
| --- | --- | --- | --- |
| 00 流程协调 | 流程协调员 | 可交接 | `docs/development-process/00_process_index.md` |
| 01 产品发现 | 产品访谈员 | 可交接 | `docs/development-process/01_project_brief.md` |
| 02 需求规格 | 需求分析师 | 可交接 | `docs/development-process/02_requirements_spec.md` |
| 03 产品设计 | UX/UI 设计师 | 已签收，可交接 | `docs/development-process/03_design_spec.md` |
| 04 技术设计 | 解决方案架构师 | 方案 A 修订已签收，可交接 | `docs/development-process/04_technical_design.md` |
| 05 实施计划 | 工程计划员 | Task 21 修订已签收，可交接 | `docs/development-process/05_implementation_plan.md` |
| 06 实现 | 实现工程师 | 可开始 Task 1；Task 6 受 Task 5 `GO` 门禁约束 | `docs/development-process/06_implementation_log.md` |
| 07 质量保证 | QA 工程师 | 未开始 | `docs/development-process/07_test_report.md` |
| 08 代码审查 | 代码审查员 | 未开始 | `docs/development-process/08_review_report.md` |
| 09 发布 | 发布工程师 | 未开始 | `docs/development-process/09_release_notes.md` |
| 10 维护交接 | 维护负责人 | 未开始 | `docs/development-process/10_maintenance_handoff.md` |

## 历史版本归档

v0.1.0 已于 2026-08-12 正式签收并发布。其核心链路为：

`今日推荐 -> 详情 -> 实验台 -> 预览 -> 登录保存 -> 配方详情 -> 私人笔记本`

| 内容 | 状态 | 入口 |
| --- | --- | --- |
| 产品与核心流程 | 已归档 | `WishToday_PRD_产品需求文档_Codex.md`、`docs/superpowers/specs/2026-07-08-wishtoday-core-flow-design.zh-CN.md` |
| 页面需求 | 已归档 | `docs/superpowers/specs/2026-07-08-wishtoday-core-flow-page-requirements.zh-CN.md` |
| 技术与实施 | 已归档 | `docs/technical-stack-and-scaffold.zh-CN.md`、`docs/superpowers/plans/2026-07-08-wishtoday-core-flow-implementation-plan.zh-CN.md` |
| 签收与发布 | 已归档 | `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-signoff.zh-CN.md`、`docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-deployment.zh-CN.md` |
| 维护交接 | 可使用 | `docs/development-process/10_maintenance_handoff.md` |

## 决策

- v0.2.0 的唯一核心目标为真实账户与云端私人笔记本。
- v0.2.0 保持 v0.1.0 核心链路；游客仍可走到预览，仅云端保存要求登录。
- 本地配方只能在用户主动操作后导入云端，不允许静默上传，重复导入不得产生重复项。
- v0.2.0 不加入社区、摇一摇、发布、收藏、个人资料、第三方登录、从零创建、已保存配方编辑/删除、笔记本搜索/筛选或经典鸡尾酒配方库。
- 经典鸡尾酒配方库作为 v0.3.0 候选方向，后续单独进行产品发现。
- 未验证邮箱账户只有游客能力；多设备会话允许并行，密码重置后全部旧会话失效。
- 云端保存、认证回跳、导入和失败重试必须幂等；本地导入按“账户 + 本地记录 ID”判重。
- 私人配方默认私有，本地配方仅在用户主动操作后上传，不用于营销、画像或公开展示。
- 认证采用原任务回跳型；首次本地导入提示位于认证成功与原任务恢复之间，“稍后处理”不得阻断回跳。
- 注册成功后进入独立“查收验证邮件”页；密码重置成功后全部旧会话失效并要求重新登录。
- 手机端保持现有沉浸式单页酒谱结构，账户入口使用右侧书页索引签，展开菜单仅提供必要账户动作。
- v0.2.0 保留现有 React Web、GitHub Pages、React Router、Zustand 和 TanStack Query。
- 认证与私人数据边界改为最小化 NestJS 网关；浏览器不直连 Supabase Auth、PostgREST 或 Edge Functions。
- 保留 Supabase PostgreSQL；密码凭据、Refresh Session、会话版本和重置 operation 终态使用同一数据库事务边界。
- NestJS 每次私人请求比较数据库当前 `session_version`；RLS 由受信任事务用户上下文驱动并对缺失上下文默认拒绝。
- Zustand 仅持久化游客草稿、本地旧配方和待恢复动作；TanStack Query 管理云端配方与导入批次状态。
- 直接保存使用“账户 + 保存意图 ID”幂等，本地导入使用“账户 + 本地记录 ID”判重。
- 密码重置原子更新密码哈希、递增 `session_version`、撤销全部 Refresh Session 并写入可查询 operation 终态。
- 当前仍不引入 Flutter、Redis、对象存储和管理后台；NestJS 仅限认证与私人数据网关职责。
- 服务端固定采用 NestJS 11 + Express、Node.js 22、原生 `pg` 8 参数化 repository 与显式事务，不引入 ORM。
- 密码固定采用 Argon2id；Access Token 由 `jose` 6 以 RS256 签发；Refresh Token 只以安全 Cookie 传输并在数据库保存带 pepper 的哈希。
- 邮件适配器采用 Resend，API 部署采用 Render Web Service，Supabase 仅提供 PostgreSQL；MVP 精确限流使用 PostgreSQL，不引入 Redis。
- production 前端与 API 必须位于同一可注册域的不同子域；未完成自定义域配置前，v0.2.0 账户功能保持关闭。
- 修订实施计划共 13 个任务；Task 5 七项新架构安全能力全部 `PASS` 后，方可开始 Task 6 及后续私人数据实现。
- 现有 v0.1.0 历史文档保持原路径，不迁移、不覆盖。

## 交付物

- `docs/development-process/00_process_index.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/02_requirements_spec.md`
- `docs/development-process/03_design_spec.md`
- `docs/development-process/04_technical_design.md`
- `docs/development-process/05_implementation_plan.md`

## 完成标准

- [x] v0.2.0 当前阶段、负责角色和下一步清晰。
- [x] v0.2.0 产品简报已建立并达到可交接状态。
- [x] v0.1.0 历史交付物和维护入口仍可追溯。
- [x] v0.2.0 与 v0.3.0 候选范围边界明确。
- [x] 下一阶段交付物和角色已记录。
- [x] v0.2.0 P0 需求、权限、数据、边界场景和非功能门槛已形成可测试规格。
- [x] v0.2.0 页面、流程、状态、响应式与可访问性设计已形成规格。
- [x] 用户书面签收 `docs/development-process/03_design_spec.md`。
- [x] 原 v0.2.0 技术设计已于 2026-08-13 书面签收，Task 22 已完成其硬能力验证。
- [x] Task 22 `NO-GO` 后的方案 A 技术架构、数据模型、API、安全、迁移、测试和部署修订已形成文档。
- [x] 用户已于 2026-08-13 书面签收修订后的 `docs/development-process/04_technical_design.md`。
- [x] v0.2.0 实施任务顺序、依赖、文件、接口、测试、回滚和 Go/No-Go 门禁已形成文档。
- [x] Task 21 已按新架构将 v0.2.0 实施计划修订为 13 个任务，并完成需求追踪与范围回归检查设计。
- [x] 用户已于 2026-08-13 书面签收修订后的 `docs/development-process/05_implementation_plan.md`。

## 开放问题

- 产品、需求和产品设计内容无阻塞项。
- `docs/development-process/03_design_spec.md` 已由用户书面签收。
- `docs/development-process/04_technical_design.md` 的方案 A 修订版已由用户书面签收。
- `docs/development-process/05_implementation_plan.md` 修订版已由用户书面签收，可进入实现。
- Task 22 已确认当前 Supabase 方案未同时取得五项硬能力的契约与 staging 观测证据；Admin 密码更新契约尤其缺少幂等键或可查询终态。
- Render、Supabase PostgreSQL staging/production、Resend 与 production 自定义域尚未创建或配置，须在实施阶段用真实环境证据关闭。
- Task 1 尚需验证 Render 到 Supabase PostgreSQL 的 SSL、事务级 `set_config`、健康检查和延迟，并在目标实例基准后固定 Argon2id 参数。
- Task 5 尚需取得七项新架构安全能力 `GO`；任一项失败即停止 Task 6 及以后任务并返回 Task 20 修订。

## 给下一角色的交接

Task 21 修订版已按签收的方案 A 写入并于 2026-08-13 获得用户书面签收，原计划中 Supabase Auth、Custom Access Token Hook、PostgREST 与 Edge Functions 的有效实施路径已废止。下一角色为实现工程师，从 **Task 1：NestJS、PostgreSQL 与部署工程基线** 开始，并更新 `docs/development-process/06_implementation_log.md`。Task 5 得到 `GO` 前，不得开始 Task 6 或任何私人配方/导入实现。
