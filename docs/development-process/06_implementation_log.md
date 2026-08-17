# 06 WishToday v0.2.0 实施日志

状态：Task 3 本地实现与兼容验证完成，待远程 staging 配置

负责角色：实现工程师

日期：2026-08-17

## 当前阶段

- 当前版本：v0.2.0
- 当前阶段：06 实现
- 当前任务：Task 3，账户数据库、注册验证与登录核心
- 当前结论：账户 schema、注册验证、重发验证、登录核心与本地数据库兼容套件已完成；真实 Supabase staging migrations 和 Resend 投递尚未执行
- 范围边界：仅实现账户、验证 token、Session 创建、密码恢复数据预留和精确限流；未实现 Refresh 轮换、退出、完整密码恢复、私人配方或前端认证接线

## Task 1 历史完成记录

1. 在 `codex/task-22-auth-capability-gate` 隔离分支固定 Node 22.23.2、NestJS 11.1.29、TypeScript 5.8、PostgreSQL `pg` 8、Argon2、JOSE 6、Resend、Vitest 3 与 Supertest 依赖基线。
2. 根前端加入 TanStack Query 5 与 Playwright 1.62 依赖，但未接入 UI；实现 `getPublicEnv()`，云功能默认关闭，开启时要求有效 API URL。
3. 实现服务端启动环境校验：PostgreSQL URL、SSL 模式、至少 2048 位且配对的 RSA Base64 PEM、JWT key ID、至少 32 字节 token pepper、精确 Origin allowlist 与端口；Resend 密钥保持可选。
4. 建立 NestJS Express 启动入口，配置受控 CORS、credentials、Cookie 解析、1 MB 请求体限制、DTO 白名单、请求 ID 和 `/api/v1` 全局前缀；`/healthz` 保持根路径。
5. 实现 `DatabaseService.transaction<T>()`、`ping()` 和健康检查；单测覆盖提交、业务异常、提交失败、回滚失败时销毁连接与连接释放，E2E 覆盖数据库成功、数据库失败和响应脱敏。
6. 增加只读/回滚数据库探针、20 次 staging 健康探针和三组 Argon2id 候选基准脚本。
7. 增加 Render 新加坡 Starter 蓝图，健康检查指向 `/healthz`；蓝图仅声明 Secret 名称，不存储值。
8. 创建 Render Singapore Starter 服务 `wishtoday-api-staging`，接入 Supabase Singapore PostgreSQL Session Pooler，并完成真实 TLS、事务上下文、数据库延迟、健康检查与 Argon2id 基准验收。

## Task 1 测试先行证据

- 前端环境测试先因 `src/lib/config/env.ts` 不存在而失败，随后 4 项契约转绿。
- 服务端环境与事务测试先因目标模块不存在而失败，随后 15 项契约转绿。
- 健康 E2E 首次收集后因 Nest 测试转译未生成构造器元数据返回 503；增加显式注入后转绿。
- 对健康控制器临时移除 `database.ping()` 后，两项 E2E 均按预期失败；恢复实现后重新验证。
- Render 检查先因 `render.yaml` 不存在而失败，创建蓝图后两项检查转绿。
- 独立代码审阅发现 Render devDependency 安装、TLS 覆盖参数、RSA 配对/强度、回滚失败连接复用、查询超时与 Pool 错误监听风险；新增 9 项失败断言后完成修复。

## 本地 Argon2id 脚本自检

在 Node 22.23.2、Windows 10、Intel Core i5-6300HQ、4 个逻辑 CPU 的本地环境中，各运行 20 次：19 MiB/2 次 P95 为 43.3 ms，32 MiB/3 次 P95 为 106.5 ms，64 MiB/3 次 P95 为 211.0 ms。三档均满足本机 500 ms 门槛，但该机器不是 Render Starter，因此 64 MiB/3 次只作为 `localCandidate`，不是正式参数结论。正式脚本同时要求 Render 原生运行标记、正确服务名及 staging/singapore/starter 环境标记。

## 真实 staging 验收

- Render 服务：`wishtoday-api-staging`，Singapore，Starter，Node 22.23.2；公开地址为 `https://wishtoday-api-staging.onrender.com`。
- 数据库连接：Supabase Singapore IPv4 Session Pooler。早期文档中的 Direct Connection 方案因 Render 运行环境与 Supabase Direct IPv6 可达性不匹配而修正；最终不再用服务端 `pg_stat_ssl` 推断 pooler 边界 TLS。
- TLS 验证：Node `pg` 客户端 socket 同时满足 `encrypted = true` 与 `authorized = true`，并由 Supabase Root CA、`rejectUnauthorized: true` 和 4 项 TLS 回归测试约束；没有关闭证书校验。
- 数据库探针：SSL 为真，事务内 `set_config` 回滚后上下文不残留，连接池可恢复；20 次查询 P95 为 2.7 ms。
- 健康检查：Render 实例内 20 次 P95 为 64.7 ms；本地到公开 staging 的初次 20 次 P95 为 123.5 ms，最终复验为 135.8 ms，均低于 1 秒门槛；`GET /healthz` 返回 `200 {"status":"ok"}`。
- Render Starter Argon2id 基准：19 MiB/2 次 P95 为 82.9 ms，32 MiB/3 次 P95 为 230.3 ms，64 MiB/3 次 P95 为 407.3 ms，每档 20 次、并行度 1。最终选择满足 P95 不高于 500 ms 的最强候选：Argon2id 64 MiB、3 次迭代、并行度 1、32 字节哈希。
- Render Shell 页面无法稳定回读既有输出时，临时提交 `4102d55` 暴露了仅 staging 生效的随机只读取证路径；取得结果后由 `c3feb10` 完整回滚。最终部署已确认该路径返回 404，同时 `/healthz` 保持 200。

## 最终全量复验

- 根前端：23 个测试文件、111 项 Vitest 全部通过；6 项部署与 Render 配置检查全部通过。
- 根前端类型检查、生产构建和 GitHub Pages 构建全部通过，Pages 构建生成 SPA `404.html` fallback。
- 服务端在 Node 22.23.2 下串行执行：5 个测试文件、28 项 Vitest 全部通过，类型检查与生产构建通过。
- 公开 staging 最终执行 20 次健康探针，P95 为 135.8 ms；临时基准入口返回 404，公开健康契约保持 200。
- `git diff --check` 通过；最终提交仅归档本实施日志，不包含 Secret、构建产物或临时探针代码。

## 命令级偏离

- 原计划写有 Jest 参数 `--runInBand`。项目统一使用 Vitest 3，因此改为 `--pool=forks --poolOptions.forks.singleFork=true`，提供等价串行隔离，未引入 Jest。
- 当前工作机 Node 为 24.16.0；服务包通过 `engines.node`、`.node-version` 和 Render `NODE_VERSION` 固定 22.23.2，并使用 `npx node@22.23.2` 补跑服务端验证。

## 历史决策记录

此前 Supabase Auth 能力门禁结论为 `NO-GO`，原因是密码更新缺少本项目要求的服务端幂等终态。Task 20 与 Task 21 已修订为 NestJS 自建认证边界；本任务未删除旧探针或技术报告，以保留决策审计证据。

## 安全与范围说明

- Git、日志和聊天均未写入数据库、JWT、pepper 或 Resend 凭据。
- 数据库探针使用严格客户端 TLS，事务中的 `set_config(..., true)` 后显式回滚，并验证上下文清除与连接池恢复。
- Argon2id 脚本只使用固定基准字符串，不使用真实密码。
- 没有创建数据库 schema、账户接口、邮件适配器、RLS、配方接口、社区、摇一摇、发布、收藏、编辑/删除或经典鸡尾酒库。

## Task 1 历史遗留问题

- `RESEND_API_KEY` 仍未配置；Task 1 明确不启用邮件适配器，留到 Task 3 注册验证邮件接入时配置并验收。
- production 自定义域绑定留到 Task 13；本任务仅通过 Render Web Service 蓝图确认自定义域配置路径可用。

## Task 1 历史下一步

Task 1 最终全量复验和提交完成后，执行 Task 2：版本化本地持久化与损坏隔离。Task 3 开始前补充 `RESEND_API_KEY`，但不得在 Task 2 提前实现账户或邮件功能。

## 2026-08-14 staging 数据库预检更新

- 已创建隔离的 Supabase 项目 `wishtoday-staging`，区域为 Singapore；数据库凭据和应用密钥仅保存在本机受限临时文件与平台 Secret 中。
- Supabase 官方 Root CA 通过 `DATABASE_CA_CERT_BASE64` 注入，`pg` 始终使用 `rejectUnauthorized: true`；配置测试覆盖缺失和无效证书，未使用关闭证书验证的降级方案。
- 本机曾对 Supabase Direct Connection 完成只读严格 TLS 预检，连接成功且 `pg_stat_ssl = true`；后续真实 Render 验收发现 Direct IPv6 不适合作为当前运行边界，最终方案已按上文修正为 IPv4 Session Pooler 与客户端 socket 严格 TLS 验证。

## Task 2 交接记录

- 已提交 `78477ff feat: migrate local flow state to v2`。
- 本地流程状态升级到 v2，包含稳定草稿/保存意图标识、v1 备份、本地旧配方迁移、待恢复动作、持久化白名单和 localStorage 不可用时的内存降级。
- Task 2 未提前实现账户、邮件或云端私人数据能力。

## Task 3 已完成任务

1. 新增 `users`、`password_credentials`、`account_security`、`auth_sessions`、`email_verification_tokens`、`password_reset_tokens`、`password_reset_operations` 和 `rate_limit_counters`，约束覆盖邮箱唯一、token 哈希长度/唯一性、一次性消费时间、Session 版本与恢复操作状态。
2. 新增固定 `wishtoday_auth_repository` 数据库角色；敏感表撤销 `PUBLIC`、`anon`、`authenticated` 和 `service_role` 权限，认证 repository 的每个事务首句执行 `SET LOCAL ROLE wishtoday_auth_repository`。
3. 实现 `POST /api/v1/auth/register`、`verify-email`、`resend-verification` 和 `login`；注册与重发使用通用响应，未知账户与错误密码统一返回 `INVALID_CREDENTIALS`，正确密码但未验证返回 `EMAIL_UNVERIFIED`。
4. 密码采用 Argon2id 64 MiB、3 次迭代、并行度 1、32 字节哈希；一次性 token 使用 32 字节随机数，数据库只保存带 pepper 的 HMAC-SHA256 哈希。
5. Access Token 使用 RS256、固定 issuer/audience/kid 和 10 分钟 TTL；登录创建服务端 Session，但 Refresh 轮换和退出留到 Task 4。
6. 注册、验证、重发和登录在 Argon2 或邮件投递前消费数据库限流；主体以不可逆 HMAC 存储，过期计数每次最多清理 100 条并使用 `FOR UPDATE SKIP LOCKED`。
7. 邮件适配器通过 `MailPort` 隔离；验证邮件异步投递，不延长注册或重发响应，也不在日志中记录邮箱、原始 token 或供应商错误内容。
8. 原始 `DatabaseService` 不从全局数据库模块导出；健康控制器只获得 `ping()` 能力，业务模块只获得固定认证角色事务能力。

## Task 3 测试先行证据

- 认证 E2E 最初因认证模块、controller 和服务不存在而失败，随后覆盖通用注册/重发响应、验证 token 重放、未验证拒绝、统一错误凭据、Session-backed Access Token、DTO 上限和响应脱敏。
- 数据库套件最初因账户、token、Session 和限流表不存在而失败，随后覆盖约束、事务回滚、并发验证/重发、数据库时间过期判断、Session 版本和限流原子计数。
- 代理地址测试先证明 Render 转发地址未被应用信任，随后固定为单跳 trusted proxy，并验证限流使用真实客户端 IP。
- 慢邮件测试先证明 HTTP 响应等待投递，随后改为非阻塞投递，注册和重发均在邮件 promise 完成前返回。
- 权限测试先证明 Supabase `anon` 可读取敏感表，随后显式撤销 Supabase 预置角色权限，并增加受限 repository 角色事务测试。
- 限流清理测试先缺少并发跳锁约束，随后增加 100 条上限和 `FOR UPDATE SKIP LOCKED` 断言。

## Task 3 数据库与安全验证

- PostgreSQL 15 容器通过 3 个 migrations、账户约束与 registration-verification-session-rate-limit repository 套件。
- Supabase PostgreSQL 17.6.1.127 容器通过相同套件；另建 fresh Supabase PostgreSQL 17 容器从空数据库运行，使用 Node 22.23.2 再次通过。
- 独立安全审阅最初报告 1 个 Critical、4 个 Important、1 个 Minor；已修复 Supabase 角色越权、验证/重发反向锁序、应用时钟偏差、认证事务未切换固定角色、原始数据库能力导出和限流清理锁竞争。
- 本地最终数据库输出为 `{"status":"ok","migrations":3,"constraintSuite":"auth","repositorySuite":"registration-verification-session-rate-limit"}`。
- 当前工作机默认 Node 为 24.16.0；服务端验收继续通过 `npx node@22.23.2` 固定到项目基线 Node 22.23.2。

## Task 3 最终全量复验

- 服务端固定 Node 22.23.2：11 个测试文件、46 项 Vitest 全部通过；类型检查与生产构建通过。
- fresh Supabase PostgreSQL 17.6.1.127：从空数据库运行 3 个 migrations 后，账户约束与 registration-verification-session-rate-limit repository 套件通过。
- 根前端：26 个测试文件、121 项 Vitest 和 6 项部署配置检查全部通过；类型检查与 GitHub Pages 生产构建通过，SPA `404.html` fallback 正常生成。
- 最终差异检查覆盖 Secret、真实邮箱、原始 token、构建产物和范围外功能；`git diff --check` 已通过。

## Task 3 遗留未处理问题

- 尚未把 3 个 migrations 应用到真实远程 Supabase staging；本地 Supabase PostgreSQL 17 结果不能替代远程变更验收。
- 尚未配置并验证真实 Resend staging 投递。当前无 `RESEND_API_KEY` 时邮件适配器会失败并写入不含敏感内容的警告，用户可在配置后通过重发恢复。
- 异步邮件没有持久化队列，进程在投递过程中退出时可能丢信；Task 3 不扩展消息队列范围。
- 前端 `VITE_CLOUD_FEATURES_ENABLED` 默认关闭，因此尚未向 v0.1.0 用户暴露认证入口；前端认证接线留到后续任务。

## 下一步推荐执行任务

在配置真实 Supabase staging migrations 与 Resend 投递检查点后，执行 Task 4：会话轮换、当前设备退出与原子密码重置。
