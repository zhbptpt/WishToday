# 06 WishToday v0.2.0 实施日志

状态：Task 1 本地工程基线完成，staging 待配置

负责角色：实现工程师

日期：2026-08-13

## 当前阶段

- 当前版本：v0.2.0
- 当前阶段：06 实现
- 当前任务：Task 1，NestJS、PostgreSQL 与部署工程基线
- 当前结论：本地完成，真实 staging 探针待配置
- 范围边界：仅建立工程、安全配置和部署可行性；未实现账户、邮件、配方或私人数据功能

## 已完成任务

1. 在 `codex/task-22-auth-capability-gate` 隔离分支固定 Node 22.23.2、NestJS 11.1.29、TypeScript 5.8、PostgreSQL `pg` 8、Argon2、JOSE 6、Resend、Vitest 3 与 Supertest 依赖基线。
2. 根前端加入 TanStack Query 5 与 Playwright 1.62 依赖，但未接入 UI；实现 `getPublicEnv()`，云功能默认关闭，开启时要求有效 API URL。
3. 实现服务端启动环境校验：PostgreSQL URL、SSL 模式、至少 2048 位且配对的 RSA Base64 PEM、JWT key ID、至少 32 字节 token pepper、精确 Origin allowlist 与端口；Resend 密钥保持可选。
4. 建立 NestJS Express 启动入口，配置受控 CORS、credentials、Cookie 解析、1 MB 请求体限制、DTO 白名单、请求 ID 和 `/api/v1` 全局前缀；`/healthz` 保持根路径。
5. 实现 `DatabaseService.transaction<T>()`、`ping()` 和健康检查；单测覆盖提交、业务异常、提交失败、回滚失败时销毁连接与连接释放，E2E 覆盖数据库成功、数据库失败和响应脱敏。
6. 增加只读/回滚数据库探针、20 次 staging 健康探针和三组 Argon2id 候选基准脚本。
7. 增加 Render 新加坡 Starter 蓝图，健康检查指向 `/healthz`；蓝图仅声明 Secret 名称，不存储值。

## 测试先行证据

- 前端环境测试先因 `src/lib/config/env.ts` 不存在而失败，随后 4 项契约转绿。
- 服务端环境与事务测试先因目标模块不存在而失败，随后 15 项契约转绿。
- 健康 E2E 首次收集后因 Nest 测试转译未生成构造器元数据返回 503；增加显式注入后转绿。
- 对健康控制器临时移除 `database.ping()` 后，两项 E2E 均按预期失败；恢复实现后重新验证。
- Render 检查先因 `render.yaml` 不存在而失败，创建蓝图后两项检查转绿。
- 独立代码审阅发现 Render devDependency 安装、TLS 覆盖参数、RSA 配对/强度、回滚失败连接复用、查询超时与 Pool 错误监听风险；新增 9 项失败断言后完成修复。

## 本地 Argon2id 脚本自检

在 Node 22.23.2、Windows 10、Intel Core i5-6300HQ、4 个逻辑 CPU 的本地环境中，各运行 20 次：19 MiB/2 次 P95 为 43.3 ms，32 MiB/3 次 P95 为 106.5 ms，64 MiB/3 次 P95 为 211.0 ms。三档均满足本机 500 ms 门槛，但该机器不是 Render Starter，因此 64 MiB/3 次只作为 `localCandidate`，不是正式参数结论。正式脚本同时要求 Render 原生运行标记、正确服务名及 staging/singapore/starter 环境标记。

## 命令级偏离

- 原计划写有 Jest 参数 `--runInBand`。项目统一使用 Vitest 3，因此改为 `--pool=forks --poolOptions.forks.singleFork=true`，提供等价串行隔离，未引入 Jest。
- 当前工作机 Node 为 24.16.0；服务包通过 `engines.node`、`.node-version` 和 Render `NODE_VERSION` 固定 22.23.2，并使用 `npx node@22.23.2` 补跑服务端验证。

## 历史决策记录

此前 Supabase Auth 能力门禁结论为 `NO-GO`，原因是密码更新缺少本项目要求的服务端幂等终态。Task 20 与 Task 21 已修订为 NestJS 自建认证边界；本任务未删除旧探针或技术报告，以保留决策审计证据。

## 安全与范围说明

- Git、日志和聊天均未写入数据库、JWT、pepper 或 Resend 凭据。
- 数据库探针使用 SSL，事务中的 `set_config(..., true)` 后显式回滚，并验证上下文清除与连接池恢复。
- Argon2id 脚本只使用固定基准字符串，不使用真实密码。
- 没有创建数据库 schema、账户接口、邮件适配器、RLS、配方接口、社区、摇一摇、发布、收藏、编辑/删除或经典鸡尾酒库。

## 遗留未处理问题

- 尚未在 Render 创建 `wishtoday-api-staging` Starter 服务，也未在 Supabase 创建新加坡 PostgreSQL staging。
- 尚未配置 `DATABASE_URL`、JWT Base64 PEM、`JWT_KEY_ID`、`TOKEN_PEPPER`、`ALLOWED_ORIGINS` 和 `RESEND_API_KEY`。
- 尚未取得 PostgreSQL SSL、事务上下文、20 次数据库 P95、20 次健康检查 P95 的真实 staging 结果。
- 尚未在 Render Starter 上执行三组 Argon2id 各 20 次基准，因此不能提前选定最终参数。
- production 自定义域绑定留到 Task 13；本任务仅通过 Render Web Service 蓝图确认自定义域配置路径可用。

## 下一步推荐执行任务

在 Render 与 Supabase 控制台创建隔离的新加坡 staging，使用外部 Secret 配置蓝图；部署成功后执行：

```powershell
npm --prefix server run probe:database
$env:STAGING_BASE_URL = "https://<staging-service>"
npm --prefix server run probe:staging
npm --prefix server run benchmark:argon2
```

将脱敏的平台、区域、连接类型、P95 与最终 Argon2id 参数追加到本日志。真实探针通过后，Task 1 才进入完整签收；Task 2 可按修订计划与该外部检查点并行开发。

## 2026-08-14 staging 数据库预检更新

- 已创建隔离的 Supabase 项目 `wishtoday-staging`，区域为 Singapore；数据库凭据和应用密钥仅保存在本机受限临时文件与平台 Secret 中。
- Supabase 官方 Root CA 通过 `DATABASE_CA_CERT_BASE64` 注入，`pg` 始终使用 `rejectUnauthorized: true`；配置测试覆盖缺失和无效证书，未使用关闭证书验证的降级方案。
- 本机对 Supabase Direct Connection 完成只读严格 TLS 预检，连接成功且 `pg_stat_ssl = true`。Shared Pooler 的后端会话不满足该断言，因此 Render 持久服务采用官方建议的 Direct Connection，并在 Render Singapore 上复验 IPv6 可达性。
- Render `wishtoday-api-staging` Starter 尚未创建，真实事务上下文、数据库 P95、健康检查 P95 和 Argon2id 参数仍待 Render 实例验收；本段不把本机结果冒充 staging 结果。
