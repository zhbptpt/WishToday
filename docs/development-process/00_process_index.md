# 00 WishToday 开发流程索引

状态：实施计划待书面签收
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

本索引维护 WishToday 各版本所处阶段、负责角色、交付物和交接入口。当前记录 v0.2.0 产品发现、需求规格、产品设计、技术设计和实施计划结果；实施计划已形成正式文档，等待用户书面签收后交接到实现阶段。

## 当前周期

- 当前版本：v0.2.0
- 已完成阶段：01 产品发现、02 需求规格、03 产品设计、04 技术设计
- 当前阶段：05 实施计划
- 当前状态：实施计划文档已完成，待用户书面签收
- 签收后下一阶段：06 实现
- 签收后下一角色：实现工程师
- 签收后下一交付物：`docs/development-process/06_implementation_log.md`

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
- 将 v0.2.0 技术设计拆分为 12 个有序、可测试、可回滚的实施任务。
- 将 Supabase 密码更新终态、全局会话撤销、Auth Hook 与 RLS 联动设为首个 Go/No-Go 门禁。
- 定义每个实施任务的文件、接口、依赖、验证命令、提交边界和回滚规则。
- 建立 AUTH-01 至 ERROR-01 的逐项追踪，并补齐 24 小时待恢复动作、本地存储降级、限流、浏览器兼容、性能与观测门禁。

## 阶段状态

| 阶段 | 负责角色 | v0.2.0 状态 | 主要文档 |
| --- | --- | --- | --- |
| 00 流程协调 | 流程协调员 | 可交接 | `docs/development-process/00_process_index.md` |
| 01 产品发现 | 产品访谈员 | 可交接 | `docs/development-process/01_project_brief.md` |
| 02 需求规格 | 需求分析师 | 可交接 | `docs/development-process/02_requirements_spec.md` |
| 03 产品设计 | UX/UI 设计师 | 已签收，可交接 | `docs/development-process/03_design_spec.md` |
| 04 技术设计 | 解决方案架构师 | 已签收，可交接 | `docs/development-process/04_technical_design.md` |
| 05 实施计划 | 工程计划员 | 待书面签收 | `docs/development-process/05_implementation_plan.md` |
| 06 实现 | 实现工程师 | 未开始 | `docs/development-process/06_implementation_log.md` |
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
- v0.2.0 保留现有 React Web 和 GitHub Pages，采用 Supabase Auth、PostgreSQL、RLS 与 Edge Functions。
- Zustand 仅持久化游客草稿、本地旧配方和待恢复动作；TanStack Query 管理云端配方与导入批次状态。
- 直接保存使用“账户 + 保存意图 ID”幂等，本地导入使用“账户 + 本地记录 ID”判重。
- 密码重置使用 `session_version`、RLS 版本比较和 Refresh Token 全局撤销，使旧会话失效。
- Flutter、NestJS、Redis、对象存储和管理后台仅作为后续演进位置，不进入 v0.2.0。
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
- [x] v0.2.0 技术架构、数据模型、API、安全、迁移、测试和部署方案已形成文档。
- [x] 用户已于 2026-08-13 书面签收 `docs/development-process/04_technical_design.md`。
- [x] v0.2.0 实施任务顺序、依赖、文件、接口、测试、回滚和 Go/No-Go 门禁已形成文档。
- [ ] 用户书面签收 `docs/development-process/05_implementation_plan.md`。

## 开放问题

- 产品、需求和产品设计内容无阻塞项。
- `docs/development-process/03_design_spec.md` 已由用户书面签收。
- `docs/development-process/04_technical_design.md` 已完成并由用户书面签收。
- `docs/development-process/05_implementation_plan.md` 已完成，等待用户书面签收。
- Supabase Auth Hook、密码更新幂等/契约终态、全局 Refresh Token 撤销和 RLS 会话版本校验仍待 Task 1 探针验证；硬性能力不满足时必须停止实施并改选认证实现。

## 给下一角色的交接

实施计划已完成，等待用户书面签收。签收后下一角色为实现工程师，先创建 `docs/development-process/06_implementation_log.md` 并执行 Task 1 Supabase 认证能力硬门禁。只有报告为 `GO` 才能继续后续云端实现；`NO-GO` 必须返回技术设计阶段改选认证边界。实现期间不得加入 Flutter、NestJS、Redis、对象存储、管理后台或 v0.3.0 经典鸡尾酒配方库。
