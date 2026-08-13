# 06 WishToday v0.2.0 实施日志

状态：Task 22 已完成门禁判定，`NO-GO` 阻塞

负责角色：实现工程师

日期：2026-08-13

## 当前阶段

- 当前版本：v0.2.0
- 当前阶段：06 实现
- 当前任务：Task 22 / 实施计划 Task 1，Supabase 认证能力硬门禁
- 当前结论：`NO-GO`
- 停止条件：已触发；不得继续实施计划 Task 2 至 Task 12

## 已完成任务

1. 在 `codex/task-22-auth-capability-gate` 隔离分支执行基线验证：22 个 Vitest 文件、107 个 Vitest 测试和 3 个部署检查通过，`npm audit` 为 0 漏洞。
2. 测试先行实现 `evaluateCapabilityGate`、固定能力清单、当前证据报告、脱敏 CLI 与非零阻塞退出码。
3. 审阅 Supabase OTP、Custom Access Token Hook、RLS、Signout、Admin 用户更新、Auth 限流和 CAPTCHA 官方文档。
4. 记录 SDK 版本、源码提交、环境缺口、未执行的故障注入和限流差异。
5. 形成可审计报告 `docs/technical-spikes/2026-08-13-supabase-auth-capability-gate.md`。

## 偏离与停止说明

- 计划要求对五项能力执行 staging 故障注入；当前没有 Supabase 项目、凭据、CLI 或本地容器服务，因此该步骤未执行，也没有伪造结果。
- 密码更新官方接口契约未提供所需幂等键或可查询终态，已经足以触发硬门禁 `NO-GO`。
- 其余四项即使存在官方能力方向，也因没有本项目 staging 观测而保持 `unknown`。
- 没有创建数据库、RLS、Edge Functions、认证页面或其他云端功能；v0.3.0 经典鸡尾酒配方库和所有后置功能均未回流。

## 验证证据

```powershell
node --test scripts/supabase/auth-capability-probe.test.mjs
npm run probe:supabase-auth
npm test
npm run typecheck
npm run build:pages
git diff --check
```

其中 `npm run probe:supabase-auth` 按设计输出 `NO-GO` 并返回退出码 `1`；这表示门禁正常生效，不是探针故障。

## 遗留未处理问题

- 需要在 Task 20 技术设计中更换或重构认证边界，使密码更新具备服务端幂等键或可查询的契约终态。
- 新方案仍需满足旧 Access Token 立即失去私人数据权限、全部旧 Refresh Token 撤销和一次性 recovery 续执行能力。
- 需要决定受控认证入口或独立认证网关，以精确满足每 IP 五分钟 30 次和每目标地址每小时 3 封邮件的阈值。
- 新方案确定后，需要创建隔离 staging 环境并补做五项故障注入。

## 下一步推荐执行任务

返回 **Task 20：v0.2.0 技术设计**，新增认证边界改选决策。完成并签收新技术设计后，重写 Task 21 中受影响的认证实施步骤，再重新执行 Task 22 门禁。门禁变为 `GO` 前不启动任何后续云端任务。
