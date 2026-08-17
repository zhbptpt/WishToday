# 06 WishToday v0.2.0 实施日志

状态：Task 1 签收完成

负责角色：实现工程师

日期：2026-08-17

## 当前阶段

- 当前版本：v0.2.0
- 当前阶段：06 实现
- 当前任务：Task 1，NestJS、PostgreSQL 与部署工程基线
- 当前结论：工程基线、真实 staging 探针与最终全量复验全部通过
- 范围边界：仅建立工程、安全配置和部署可行性；未实现账户、邮件、配方或私人数据功能

## 已完成任务

1. 在 `codex/task-22-auth-capability-gate` 隔离分支固定 Node 22.23.2、NestJS 11.1.29、TypeScript 5.8、PostgreSQL `pg` 8、Argon2、JOSE 6、Resend、Vitest 3 与 Supertest 依赖基线。
2. 根前端加入 TanStack Query 5 与 Playwright 1.62 依赖，但未接入 UI；实现 `getPublicEnv()`，云功能默认关闭，开启时要求有效 API URL。
3. 实现服务端启动环境校验：PostgreSQL URL、SSL 模式、至少 2048 位且配对的 RSA Base64 PEM、JWT key ID、至少 32 字节 token pepper、精确 Origin allowlist 与端口；Resend 密钥保持可选。
4. 建立 NestJS Express 启动入口，配置受控 CORS、credentials、Cookie 解析、1 MB 请求体限制、DTO 白名单、请求 ID 和 `/api/v1` 全局前缀；`/healthz` 保持根路径。
5. 实现 `DatabaseService.transaction<T>()`、`ping()` 和健康检查；单测覆盖提交、业务异常、提交失败、回滚失败时销毁连接与连接释放，E2E 覆盖数据库成功、数据库失败和响应脱敏。
6. 增加只读/回滚数据库探针、20 次 staging 健康探针和三组 Argon2id 候选基准脚本。
7. 增加 Render 新加坡 Starter 蓝图，健康检查指向 `/healthz`；蓝图仅声明 Secret 名称，不存储值。
8. 创建 Render Singapore Starter 服务 `wishtoday-api-staging`，接入 Supabase Singapore PostgreSQL Session Pooler，并完成真实 TLS、事务上下文、数据库延迟、健康检查与 Argon2id 基准验收。

## 测试先行证据

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

## 遗留未处理问题

- `RESEND_API_KEY` 仍未配置；Task 1 明确不启用邮件适配器，留到 Task 3 注册验证邮件接入时配置并验收。
- production 自定义域绑定留到 Task 13；本任务仅通过 Render Web Service 蓝图确认自定义域配置路径可用。

## 下一步推荐执行任务

Task 1 最终全量复验和提交完成后，执行 Task 2：版本化本地持久化与损坏隔离。Task 3 开始前补充 `RESEND_API_KEY`，但不得在 Task 2 提前实现账户或邮件功能。

## 2026-08-14 staging 数据库预检更新

- 已创建隔离的 Supabase 项目 `wishtoday-staging`，区域为 Singapore；数据库凭据和应用密钥仅保存在本机受限临时文件与平台 Secret 中。
- Supabase 官方 Root CA 通过 `DATABASE_CA_CERT_BASE64` 注入，`pg` 始终使用 `rejectUnauthorized: true`；配置测试覆盖缺失和无效证书，未使用关闭证书验证的降级方案。
- 本机曾对 Supabase Direct Connection 完成只读严格 TLS 预检，连接成功且 `pg_stat_ssl = true`；后续真实 Render 验收发现 Direct IPv6 不适合作为当前运行边界，最终方案已按上文修正为 IPv4 Session Pooler 与客户端 socket 严格 TLS 验证。
