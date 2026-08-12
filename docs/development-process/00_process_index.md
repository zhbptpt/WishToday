# 00 WishToday 开发流程索引

状态：可交接到下一阶段
负责角色：流程协调员
日期：2026-08-13

## 输入

- `WishToday_PRD_产品需求文档_Codex.md`
- `docs/superpowers/specs/2026-07-08-wishtoday-core-flow-design.zh-CN.md`
- `docs/superpowers/specs/2026-07-08-wishtoday-core-flow-page-requirements.zh-CN.md`
- `docs/superpowers/plans/2026-07-08-wishtoday-core-flow-implementation-plan.zh-CN.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-signoff.zh-CN.md`
- `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-deployment.zh-CN.md`
- 当前仓库、GitHub Pages 生产环境与 GitHub Actions 状态

## 范围

本阶段只建立开发流程索引、映射现有交付物并明确当前阶段。不会重新定义产品范围、修改 UI、实现功能或启动下一版本。

## 已完成工作

- 识别并归档现有产品、需求、设计、技术、实施、QA、签收与发布材料。
- 确认 WishToday MVP v0.1.0 已完成核心链路、正式签收并发布到 GitHub Pages。
- 将当前活跃阶段切换为维护交接。
- 完成 GitHub 仓库治理确认：默认分支调整为 `main`，仓库继续保持公开可见。

## 阶段状态

| 阶段 | 负责角色 | 状态 | 主要文档 |
| --- | --- | --- | --- |
| 00 流程协调 | 流程协调员 | 可交接 | `docs/development-process/00_process_index.md` |
| 01 产品发现 | 产品访谈员 | 可交接 | `WishToday_PRD_产品需求文档_Codex.md` |
| 02 需求规格 | 需求分析师 | 可交接 | `docs/superpowers/specs/2026-07-08-wishtoday-core-flow-page-requirements.zh-CN.md` |
| 03 产品设计 | UX/UI 设计师 | 可交接 | `docs/superpowers/specs/2026-07-08-wishtoday-core-flow-design.zh-CN.md`、`docs/visual-direction-v1.zh-CN.md` |
| 04 技术设计 | 解决方案架构师 | 可交接 | `docs/technical-stack-and-scaffold.zh-CN.md` |
| 05 实施计划 | 工程计划员 | 可交接 | `docs/superpowers/plans/2026-07-08-wishtoday-core-flow-implementation-plan.zh-CN.md` |
| 06 实现 | 实现工程师 | 可交接 | Git 历史与实施计划中的 Task 1-11 |
| 07 质量保证 | QA 工程师 | 可交接 | Task 12、Task 12.1 验收记录及自动化测试 |
| 08 代码审查 | 代码审查员 | 可交接 | `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-signoff.zh-CN.md` |
| 09 发布 | 发布工程师 | 可交接 | `docs/releases/2026-08-12-wishtoday-mvp-v0.1.0-deployment.zh-CN.md` |
| 10 维护交接 | 维护负责人 | 可交接 | `docs/development-process/10_maintenance_handoff.md` |

## 决策

- v0.1.0 的发布后工作进入维护阶段，不在当前周期追加社区、摇一摇、发布、收藏或已保存配方编辑/删除。
- 新版本必须先回到产品发现和需求规格阶段，形成新的范围与验收标准后才能实施。
- 现有历史文档保持原路径，不为追求目录统一而搬迁，以避免破坏引用和版本归档。

## 交付物

- `docs/development-process/00_process_index.md`
- `docs/development-process/10_maintenance_handoff.md`

## 完成标准

- [x] 当前活跃阶段和负责角色清晰。
- [x] 已有文档已映射到开发阶段。
- [x] v0.1.0 的签收与发布状态有明确入口。
- [x] 下一阶段动作和治理问题已记录。

## 开放问题

- 下一版本是否优先建设真实后端/API，尚未进入产品决策。

## 给下一角色的交接

维护负责人先阅读本索引、v0.1.0 签收文档和部署文档，再使用 `docs/development-process/10_maintenance_handoff.md` 处理运行、验证、部署与排障。若启动 v0.2.0，必须先由产品角色定义目标和范围，不直接从维护阶段进入编码。
