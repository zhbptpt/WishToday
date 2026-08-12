# 00 WishToday 开发流程索引

状态：可交接到下一阶段
负责角色：流程协调员
日期：2026-08-13

## 输入

- `WishToday_PRD_产品需求文档_Codex.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/10_maintenance_handoff.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-signoff.zh-CN.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-deployment.zh-CN.md`
- 当前仓库、GitHub Pages 生产环境与 GitHub Actions 状态

## 范围

本索引维护 WishToday 各版本所处阶段、负责角色、交付物和交接入口。当前只记录 v0.2.0 产品发现结果并切换下一阶段，不编写详细需求、设计页面、选择技术方案或实现功能。

## 当前周期

- 当前版本：v0.2.0
- 已完成阶段：01 产品发现
- 当前状态：产品简报可交接
- 下一阶段：02 需求规格
- 下一角色：需求分析师
- 下一交付物：`docs/development-process/02_requirements_spec.md`

## 已完成工作

- 确认 WishToday MVP v0.1.0 已完成核心链路、正式签收并发布到 GitHub Pages。
- 完成 v0.1.0 维护交接与仓库治理确认，历史版本保持归档状态。
- 完成 v0.2.0 产品发现，选择“真实账户与云端私人笔记本”作为唯一核心目标。
- 明确游客路径、本地配方主动导入、失败恢复、非目标和成功信号。
- 将经典鸡尾酒配方库拆分为 v0.3.0 候选方向。

## 阶段状态

| 阶段 | 负责角色 | v0.2.0 状态 | 主要文档 |
| --- | --- | --- | --- |
| 00 流程协调 | 流程协调员 | 可交接 | `docs/development-process/00_process_index.md` |
| 01 产品发现 | 产品访谈员 | 可交接 | `docs/development-process/01_project_brief.md` |
| 02 需求规格 | 需求分析师 | 未开始 | `docs/development-process/02_requirements_spec.md` |
| 03 产品设计 | UX/UI 设计师 | 未开始 | `docs/development-process/03_design_spec.md` |
| 04 技术设计 | 解决方案架构师 | 未开始 | `docs/development-process/04_technical_design.md` |
| 05 实施计划 | 工程计划员 | 未开始 | `docs/development-process/05_implementation_plan.md` |
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
- 现有 v0.1.0 历史文档保持原路径，不迁移、不覆盖。

## 交付物

- `docs/development-process/00_process_index.md`
- `docs/development-process/01_project_brief.md`

## 完成标准

- [x] v0.2.0 当前阶段、负责角色和下一步清晰。
- [x] v0.2.0 产品简报已建立并达到可交接状态。
- [x] v0.1.0 历史交付物和维护入口仍可追溯。
- [x] v0.2.0 与 v0.3.0 候选范围边界明确。
- [x] 下一阶段交付物和角色已记录。

## 开放问题

- 产品层面的版本目标与范围没有阻塞项。
- 账户边界、导入判重、失败状态和隐私文案需要在 v0.2.0 需求规格阶段细化。
- 后端、认证、数据库、API 和部署技术尚未选择，应在需求确认后由技术设计阶段决定。

## 给下一角色的交接

需求分析师先阅读 `docs/development-process/01_project_brief.md`、`docs/development-process/10_maintenance_handoff.md` 和 v0.1.0 核心流程需求，再创建 `docs/development-process/02_requirements_spec.md`。只把已确认的 v0.2.0 产品范围转换为功能需求、非功能需求、权限规则、边界场景和可测试验收标准，不提前进行技术选型或实现，也不纳入 v0.3.0 经典鸡尾酒配方库。
