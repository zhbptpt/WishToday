# NestJS 认证网关能力门禁

状态：已完成，最终结论 `GO`

证据日期：2026-08-21（Asia/Shanghai）

对应版本：WishToday v0.2.0 / 实施计划 Task 5

## 门禁规则

最终结论只允许 `GO` 或 `NO-GO`。只有以下七项能力在隔离 Render/Supabase staging 全部为 `pass` 时才能记录 `GO`；缺失、跳过、未知或失败均为 `NO-GO`，并继续阻塞 Task 6 及任何私人数据实现。

| 能力 | 固定标识 | staging 状态 |
| --- | --- | --- |
| 密码重置五项写入原子提交 | `atomicPasswordReset` | `pass` |
| 五个写入点异常时完整回滚 | `rollbackOnInjectedFailure` | `pass` |
| 双设备旧 Access/Refresh 立即拒绝且新密码可登录 | `staleAccessRejected` | `pass` |
| 当前设备退出隔离与 Refresh family 重放撤销 | `refreshFamilyReplayRevoked` | `pass` |
| 丢弃重置响应后查询终态且重试幂等 | `resetOperationIdempotency` | `pass` |
| PostgreSQL 并发限流阈值 | `postgresRateLimits` | `pass` |
| RLS 连接池事务上下文隔离和默认拒绝 | `rlsContextIsolation` | `pass` |

## 探针设计

- 运行环境必须由 Render 原生变量证明为精确 API 主机、service ID、部署分支、40 位 commit、`wishtoday-api-staging`、Singapore、Starter 和 staging；部署 commit 还必须与本轮预先配置的 SHA 精确一致，数据库 host/port/user/database 的 SHA-256 身份指纹也必须匹配。任一证明失败时七项统一失败关闭。
- PostgreSQL URL 禁止任何 `ssl*` 或 `channel_binding` 覆盖参数；连接建立后还必须确认 TLS stream 同时为 encrypted 和 authorized。
- 探针创建随机隔离账户和 operation，数据库只保存 token 哈希；标准输出只包含固定能力名、状态、安全指标、短 commit、版本和随机运行标识。
- 报告环境 metadata 采用显式白名单；Render service ID、数据库身份指纹及任何未知字段都不会进入 JSON 输出。
- 密码重置为目标 operation 安装临时 PostgreSQL commit notifier；首次 HTTP 请求独立执行，只有 `NOTIFY` 证明其事务已经提交且响应头尚未到达时才主动断开，随后轮询终态并并发重试同一 `operationId`，确认密码哈希和 `session_version` 只变化一次。
- 故障注入只对随机隔离账户匹配的行生效，使用专用 SQLSTATE 和唯一事务 advisory lock；先在控制事务证明 Trigger 命中目标行，再从独立连接观察目标 HTTP 事务持锁，之后才接受精确应用 `500` 和相同请求 ID，最后核对五处写入完整回滚。
- Refresh 祖先重放与后继轮换并发执行；无论锁竞争结果如何，最终均从 PostgreSQL 证明整个 family 没有活动 Session。
- RLS 证据复用正式 `DatabaseService.transaction()` 和 `app.user_id`；探针占用连接池中除一个应用槽位外的连接，在同一 `pg_backend_pid()` 上执行 12 轮 A/B/无上下文顺序复用，每轮无上下文都必须默认拒绝。
- 限流证据通过真实 `/api/v1/auth/password-recovery` HTTP 入口并发执行 31 次同 IP 不同邮箱及 4 次同规范化邮箱请求，断言精确 `202`/`429 RATE_LIMITED`，并回查 PostgreSQL counter 为 31/4。
- 探针持有 PostgreSQL advisory lock；启动前与最终阶段按严格对象名正则和表白名单清扫遗留 Trigger、函数、临时 RLS 表和隔离账户。

## 本地测试先行证据

1. 判定器测试先因模块缺失失败，随后实现七项全 `pass` 才返回 `GO`。
2. 报告脱敏与 CLI 失败关闭测试先失败，随后固定输出字段并区分环境证明失败与探针准备失败。
3. staging 配置、Cookie 提取与 npm 接线测试先失败，随后实现受控配置和根命令。
4. 第一轮安全审查发现环境身份、故障误判、RLS 连接复用、真实 HTTP 限流、响应头前断线、关键竞态和异常清理缺口；各项均先补失败测试，再完成最小修复。
5. 自审额外复现“响应头已到但 body cancel 较慢”的竞态红灯，修复后该情况会严格失败而不会伪装成网络丢失。
6. 第二轮独立安全审查发现提交身份未绑定本轮 SHA、响应丢失可能由并发重试代为提交、故障 `500` 可能误判、退出遗漏旧 Refresh、RLS 未证明物理连接复用及 SQL `LIKE` 清理边界；六项均先补失败测试，再完成最小修复。

本地探针测试当前覆盖 42 项。本地结果只验证探针契约；最终结论以下述真实 staging 结果为准。

## 可复现命令

```powershell
node --test scripts/auth-gateway/capability-gate.test.mjs
npm run probe:auth-gateway
```

第一条用于本地契约验证。第二条只能在已证明身份的 Render staging Shell 中运行；其他环境必须输出脱敏 `NO-GO` 并以退出码 1 结束。

## 范围与安全边界

- 本任务不实现 Task 6、私人配方、前端认证接线、社区、摇一摇、发布、收藏或经典鸡尾酒库。
- 邮件投递继续沿用非持久化适配器；持久化邮件队列不扩入当前 MVP。
- 数据库 URL、密码、JWT、pepper、Resend Key、邮箱、Cookie 和 token 不写入 Git、报告或聊天。

## 真实 staging 证据

- 2026-08-21 05:52（Asia/Shanghai）在 Render `wishtoday-api-staging` 新实例内执行；环境证明为 Node v22.23.2、NestJS 11.1.29、PostgreSQL 17.6、Singapore、Starter，部署提交短标识为 `18045fe339f4`。
- 运行提交与预配置的 40 位期望提交精确一致；服务身份、数据库身份指纹、TLS socket、部署分支和 staging 标记均通过失败关闭预检。
- 第四个 migration 已由探针确认，`auth_sessions_family_idx` 存在；未记录数据库 URL、身份指纹、service ID 或任何 Secret。
- 探针输出 `decision: GO`，七项固定能力全部为 `pass`，并正常返回 Shell 提示符。

## 脱敏结果摘要

| 能力 | 期望 | 真实结果 |
| --- | --- | --- |
| `atomicPasswordReset` | 五项写入同一事务提交 | `pass`，`mutations=5` |
| `rollbackOnInjectedFailure` | 五个故障点均完整回滚 | `pass`，`faultPoints=5` |
| `staleAccessRejected` | 两设备旧 Access/Refresh 全部拒绝，新密码可登录 | `pass`，验证 2 个设备、2 个 Access 与 2 个 Refresh |
| `refreshFamilyReplayRevoked` | 当前设备退出隔离；祖先重放后 family 无活动 Session | `pass`，并发竞态完成且 `activeFamilySessions=0` |
| `resetOperationIdempotency` | 响应头前断线后可查终态，同 operation 并发重试不重复写入 | `pass`，重试 2 次，终态 `completed` |
| `postgresRateLimits` | 真实 HTTP 精确命中 IP 30 次和邮箱 3 次阈值 | `pass`，回环来源隔离，未发送客户端 `x-forwarded-for`，邮箱规范化生效 |
| `rlsContextIsolation` | 连接池复用不泄露事务上下文，无上下文默认拒绝 | `pass`，36 个顺序事务、12 轮复用、12 次默认拒绝，单物理连接成立 |

故障注入的预期结果是目标请求返回受控应用 `500`，密码、版本、Session、token 和 operation 五处状态均保持写入前值；真实结果五个故障点全部满足。限流与 RLS 探针均完成隔离清理，报告未输出账户、邮箱、原始 IP、Cookie、Token 或 Secret。

## 最终结论

`GO`。Task 5 的认证安全硬门禁已通过，Task 6 不再受本门禁阻塞。异步验证/恢复邮件缺少持久化队列仍作为已知运维风险保留，但不扩入当前 MVP。
