# 06 WishToday v0.2.0 实施日志

状态：Task 5 真实 staging 门禁通过，最终结论 `GO`

负责角色：实现工程师

日期：2026-08-21

## 当前阶段

- 当前版本：v0.2.0
- 当前阶段：06 实现
- 当前任务：Task 5，新架构认证安全硬门禁
- 当前结论：真实 Render/Supabase staging 七项固定能力全部为 `pass`，认证安全硬门禁最终结论为 `GO`
- 范围边界：仅验证 Task 3/4 已实现的认证基础；未开始 Task 6、前端认证接线、私人配方、主动导入、社区、摇一摇、经典鸡尾酒库或其他后置功能

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

## Task 3 真实 staging 验收

- 3 个认证 migrations 已应用到隔离 Supabase staging；远程权限检查确认认证 repository 使用固定数据库角色，敏感表未向 `PUBLIC` 或 Supabase 预置客户端角色开放。
- Render `wishtoday-api-staging` 已配置专用 Resend Sending access Key；Secret 仅保存在部署平台，未写入 Git、实施日志或聊天。
- 公开 staging 健康检查返回 `200 {"status":"ok"}`，响应不包含数据库或部署凭据。
- 使用一次性隔离测试账户完成真实注册、邮件投递、邮箱验证和登录：注册返回 `202 ACCEPTED`，邮件供应商状态为 `delivered`，验证返回 `200 PROCESSED`，登录返回 `200` 并签发 600 秒 Access Token。
- 验收过程中未记录真实邮箱、密码、Resend Key、验证 token、Access Token 或数据库凭据。

## Task 3 遗留未处理问题

- 异步邮件没有持久化队列，进程在投递过程中退出时可能丢信；Task 3 不扩展消息队列范围。
- 前端 `VITE_CLOUD_FEATURES_ENABLED` 默认关闭，因此尚未向 v0.1.0 用户暴露认证入口；前端认证接线留到后续任务。

## Task 4 已完成任务

1. 登录成功后签发 30 天 Refresh Token 与 CSRF Token；Refresh 原值只写入 host-only、`Secure`、`HttpOnly`、`SameSite=Lax` Cookie，响应 JSON 不包含 Refresh Token。
2. 实现 `POST /api/v1/auth/refresh` 原子轮换；Session 创建、轮换与退出统一按 `users -> account_security -> auth_sessions` 锁序执行，旧 token 重放与后继轮换并发时仍会撤销完整 Session family，两个设备保持独立 Session family。
3. 实现 `POST /api/v1/auth/logout`，只撤销当前 Refresh Session 并清除当前设备 Cookie，不影响其他设备。
4. 实现 RS256 Access Token 验证和 `GET /api/v1/auth/me`；固定校验算法、issuer、audience、`kid`，强制 `exp`、`iat`、`sub`，并校验 Session 状态与 `session_version`。
5. 实现允许 Origin 与双提交 CSRF 校验；Refresh 和 logout 在进入业务服务前拒绝缺失、错误或不受信 Origin。
6. 实现通用响应的密码恢复请求、目标邮箱限流、一次性 recovery token、密码重置 operation 幂等与 token 绑定状态查询；重置接口在 Argon2 前先执行 IP 限流和廉价 token/operation 预校验，事务提交时再次锁定校验。
7. 密码重置在单个认证角色事务内锁定 operation、token 和 user，并原子完成密码哈希更新、`session_version + 1`、全部 Session 撤销、token 消费和 operation `completed`。
8. 扩展真实数据库套件，覆盖双设备、Refresh 轮换/重放、并发轮换与祖先重放、Refresh/Reset 锁序、Login/Reset Session 创建屏障、当前设备退出、并发密码重置幂等，以及五个数据库触发器故障点的完整回滚。
9. 新增 `auth_sessions(family_id)` 索引迁移，避免重放撤销 family 时扫描完整 Session 表。

## Task 4 测试先行证据

- 会话 E2E 先覆盖 Cookie 属性、响应脱敏、CSRF/Origin、Refresh 轮换、当前设备退出、RS256 claims 与错误 `kid` 拒绝，再补齐 controller、guard、verifier、repository 和 service 实现；提交前审查新增无 `exp`、无 `iat` 拒绝红灯。
- 密码重置 E2E 先定义通用恢复响应、operation 重试、同 token 状态查询和响应脱敏，再实现恢复 controller/service/repository。
- 故障注入夹具对密码、版本、Session、token 和 operation 五个写入位置逐项抛错，均确认事务恢复到写入前状态。
- 真实 PostgreSQL 套件对相同五个表安装临时 `before update` 触发器，逐项验证数据库事务回滚；每个触发器在 `finally` 删除，套件入口和总清理再次执行幂等清理。
- 代码审查补充错误 `kid` 拒绝、恢复邮箱服务层规范化和首条查询同时锁定 operation/token/user 的回归覆盖。
- 提交前独立安全审查复现了并发重放漏撤销、无效重置先执行 Argon2 和 JWT 非必需过期声明三个缺口；对应红灯分别观测到 1 条后继 Session 残留、1 次不必要哈希与无过期 token 返回 200，修复后均转绿。
- 修复复审继续复现了 Refresh/Reset 的 PostgreSQL `40P01` 死锁与 Login/Reset 旧版本 Session 插入交错；统一账户锁序并让 `createSession` 锁后重校验版本后，两项数据库屏障测试转绿。

## Task 4 数据库与安全验证

- 使用隔离的 PostgreSQL 18.4 临时数据库运行 4 个 migrations 和完整 repository 套件，输出为 `{"status":"ok","migrations":4,"constraintSuite":"auth","repositorySuite":"registration-verification-session-rotation-password-reset-rate-limit"}`。
- 临时数据库只监听 `127.0.0.1`，由 Windows 低权限 `NetworkService` 账户运行；未对 Supabase staging 安装故障触发器，也未修改 staging 数据或 Secret。
- Session 创建、轮换与退出统一先锁 `users`，再锁 `account_security`，最后读取或写入 `auth_sessions`；检测旧 token 重放后，在同一事务中撤销整个 family。真实 PostgreSQL 屏障测试确认祖先重放并发于后继轮换时 family 无有效 Session 残留，Refresh/Reset 无死锁，Reset 期间的 Login 不会插入旧版本活动 Session。
- 密码重置首条查询使用 `FOR UPDATE OF o, t, u`，五项写入共享同一认证角色事务；成功重试不会再次增加 `session_version`。
- Access Token 每次请求都查询 Session 与当前 `session_version`，因此 logout、Refresh 轮换和密码重置提交后旧 Access Token 立即失败。
- Git、业务响应和实施日志均未写入真实邮箱、密码、Refresh/Access/recovery token、JWT 私钥、数据库凭据或邮件密钥。

## Task 4 最终全量复验

- 服务端固定 Node 22.23.2：15 个测试文件、63 项 Vitest 全部通过；类型检查、生产构建和真实隔离 PostgreSQL 套件通过。
- 根前端：26 个测试文件、121 项 Vitest 和 6 项部署检查全部通过；类型检查与 GitHub Pages 生产构建通过。
- `git diff --check` 通过；差异仅包含 Task 4 服务端实现、测试、数据库套件扩展和本日志。

## Task 4 遗留未处理问题

- Task 4 完成时尚未执行 Render/Supabase staging 双设备与故障门禁；该证据随后已由 Task 5 的真实 staging 验收补齐并形成 `GO`。
- 异步恢复邮件沿用 Task 3 的非持久化投递方式，进程在投递期间退出仍可能丢信；本任务不扩展消息队列范围。
- 前端云功能默认关闭，尚未接入登录、恢复、Session 启动刷新或退出 UI；按计划留到 Task 7。

## 下一步推荐执行任务

执行 Task 6：本地与云端账户状态编排。Task 5 已形成 `GO`，Task 6 不再受认证安全门禁阻塞；仍须保持前端云功能默认关闭，并继续排除社区、摇一摇、发布、收藏和经典鸡尾酒库等后置范围。

## Task 5 本地完成记录

1. 新增七项固定能力判定器；只有全部证据为 `pass` 才返回 `GO`，缺失、跳过、未知、格式错误或执行异常均失败关闭为 `NO-GO`。
2. 新增精确 Render 主机/service ID/分支/本轮预期 commit、数据库身份指纹、严格 TLS socket、第四个 migration 预检、advisory lock 和异常残留清扫。
3. 密码重置探针只在 PostgreSQL `NOTIFY` 证明目标 operation 已提交且响应头未到达时主动断线，之后轮询终态并并发重试相同 `operationId`；同时验证双设备旧 Access/Refresh 立即拒绝和新密码可登录。
4. Session 探针验证当前设备退出后旧 Access 与旧 Refresh 均精确拒绝；随后并发执行祖先 Refresh 重放与后继轮换，并从数据库确认整个 Session family 没有活动记录。
5. 探针报告只输出固定能力名、状态、错误码、安全指标及显式白名单环境字段，不输出账户、密码、Cookie、token、service ID、数据库身份指纹或其他平台 Secret。
6. 故障注入使用专用 SQLSTATE、控制事务和唯一事务 advisory lock；只有独立连接观察到目标 HTTP 事务持锁后才接受精确应用 `500` 与回显 request ID，五个写入点均核对完整回滚。
7. 限流改走真实 password-recovery HTTP 入口，验证代理 IP、邮箱规范化、精确 `429 RATE_LIMITED` 和 PostgreSQL counter；RLS 改用正式事务边界与 `app.user_id`，占满连接池只留一个应用槽位，在同一物理连接执行 12 轮 A/B/无上下文交替。
8. 启动清理不再使用带下划线通配符的 SQL `LIKE`；Trigger、函数和临时 RLS 表均通过严格对象名正则与表白名单后才删除。

## Task 5 本地测试先行证据

- 判定器、报告脱敏、CLI 失败关闭、staging 配置、Cookie 与 npm 接线均先观察到预期红灯，再完成实现。
- 两轮独立安全审查的 P1/P2 均逐项验证并以失败测试复现；修复后探针测试为 34 项。
- 自审额外捕获响应头已到但 body cancel 较慢的竞态，测试先失败，随后以独立 `headersArrived` 状态失败关闭。
- 原 Task 4 设备 A Refresh 拒绝断言重复一次，已在绿灯重构阶段去重，并把新密码登录放到全部旧令牌拒绝检查之后。

## Task 5 真实 staging 验收

- Render `wishtoday-api-staging` 已部署提交 `18045fe339f4`；新实例健康启动，公开 `GET /healthz` 返回 `200 {"status":"ok"}`。
- Render Shell 只读身份检查确认运行提交与 40 位期望提交精确一致；服务、分支、区域、规格、数据库身份、TLS 与 staging 标记均通过探针预检。
- 探针确认第四个 migration 和 `auth_sessions_family_idx` 已存在，随后输出 `decision: GO`。
- `atomicPasswordReset`、`rollbackOnInjectedFailure`、`staleAccessRejected`、`refreshFamilyReplayRevoked`、`resetOperationIdempotency`、`postgresRateLimits` 与 `rlsContextIsolation` 七项全部为 `pass`。
- 五处故障注入均完整回滚；双设备旧令牌全部拒绝；Refresh family 重放后无活动 Session；响应丢失后的重置 operation 终态为 `completed` 且重试幂等。
- 真实 HTTP 限流验证 IP 30 次与邮箱 3 次阈值，未发送客户端 `x-forwarded-for`；RLS 验证 36 个顺序事务、12 轮同连接复用和 12 次无上下文默认拒绝。
- 验收报告只保留短 commit、版本、固定能力名和安全指标，未记录数据库 URL、身份指纹、service ID、账户、邮箱、IP、Cookie、Token 或 Secret。

## Task 5 最终复验

- 根前端：26 个测试文件、121 项 Vitest 全部通过；部署与认证探针 Node 测试 48 项全部通过，其中认证门禁契约 42 项。
- 提交前全量并行复验暴露出本地 HTTP 竞态测试依赖 `5 ms` 固定超时；已改为服务端确认四个请求到达后确定性注入一次传输失败，并用退化为 `Promise.all` 的红灯验证该测试能够捕获提前返回回归。
- 前后端类型检查、服务端生产构建与 GitHub Pages 生产构建通过；SPA `404.html` fallback 正常生成。
- 最终门禁结论：`GO`。Task 6 不再受认证安全硬门禁阻塞。

## Task 5 遗留未处理问题

- 异步验证/恢复邮件仍没有持久化队列；进程在投递期间退出可能丢信。该问题不扩入当前 MVP，继续作为已知运维风险保留。
- 前端云功能仍默认关闭，账户状态编排与认证 UI 尚未实现，按计划由 Task 6 和 Task 7 处理。
