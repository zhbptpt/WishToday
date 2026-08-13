# 04 WishToday v0.2.0 技术设计

状态：修订设计待用户签收
负责角色：解决方案架构师
日期：2026-08-13

## 输入

- `docs/development-process/00_process_index.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/02_requirements_spec.md`
- `docs/development-process/03_design_spec.md`
- `docs/development-process/05_implementation_plan.md`
- `docs/development-process/10_maintenance_handoff.md`
- `docs/technical-spikes/2026-08-13-supabase-auth-capability-gate.md`
- `docs/technical-stack-and-scaffold.zh-CN.md`
- WishToday v0.1.0 现有 React 代码、测试、GitHub Pages 与 GitHub Actions 配置
- 用户于 2026-08-13 确认的方案 A：提前引入最小化 NestJS 认证与私人数据网关

## 修订原因

Task 22 对原 Supabase Auth 方案执行硬能力门禁后得到 `NO-GO`。托管 Auth 的密码更新接口没有提供本设计所需的幂等键或可查询契约终态，且项目尚未取得旧 Access Token 立即拒绝、全局 Refresh Token 撤销等完整契约与 staging 证据。该结论不降低“密码重置后全部旧会话立即失效”的验收标准，而是要求改选认证边界。

本次采用 **NestJS 认证与私人数据网关 + Supabase PostgreSQL**。密码凭据、Refresh Session、会话版本和密码重置操作终态统一位于 PostgreSQL 事务边界，消除原方案跨 Supabase Auth 与业务数据库的非原子更新。

## 范围

本文把已签收的 v0.2.0“真实账户与云端私人笔记本”需求转换为可实施技术架构。范围包括：

- 邮箱注册、邮箱验证、登录、会话刷新、当前设备退出、密码恢复与重置。
- 私人配方保存、读取、本地配方主动导入与失败恢复。
- 原任务回跳、本地持久化迁移、幂等、限流、安全、部署、测试、观测和回滚。
- 一个严格受限的 NestJS 服务，只承担认证和私人数据 API 网关职责。

本阶段只修订技术方案，不创建 NestJS 脚手架、不修改业务代码、不创建 Supabase 资源，也不修订实施任务。

明确不纳入 v0.2.0：Flutter 重写、Redis、对象存储上传、管理后台、社区、发布、收藏、摇一摇、个人资料、第三方登录、从零创建配方、已保存配方编辑/删除、笔记本搜索/筛选和经典鸡尾酒配方库。经典鸡尾酒配方库仍是 v0.3.0 候选方向。

## 决策摘要

| 领域 | v0.2.0 修订决策 |
| --- | --- |
| Web 前端 | 保留 React 19、TypeScript、Vite、React Router、Zustand 与 GitHub Pages |
| 服务端状态 | TanStack Query 管理云端数据；Zustand 不充当云端数据仓库 |
| API 与认证 | 最小化 NestJS 服务统一提供认证和私人数据 API |
| 数据库 | Supabase PostgreSQL，NestJS 使用服务端数据库连接访问 |
| 密码存储 | 成熟的内存困难型密码哈希算法；每个密码使用独立盐并保存算法参数 |
| 会话 | 短期 Access Token + 轮换式 Refresh Session；服务端每次私人请求校验数据库 `session_version` |
| 权限 | NestJS 显式验证身份与所有权；RLS 作为数据库纵深保护并默认拒绝缺失可信上下文 |
| 限流 | NestJS 执行安全入口限流，PostgreSQL 保存初期限流计数，不引入 Redis |
| 邮件 | NestJS 通过可替换邮件适配器发送验证与重置邮件 |
| 前端部署 | 保留 GitHub Pages、SPA 基路径和现有 404 fallback；账户功能上线前配置与 API 同站的自定义域 |
| 服务端部署 | 独立 staging/production NestJS 服务；平台在实施计划修订前确定 |

## 现状与差距

现有 `src/store/useWishTodayStore.ts` 把草稿、模拟会话、保存状态和已保存配方共同持久化到 `wishtoday-flow-state`，且没有持久化 schema 版本。`src/services/apiClient.ts` 与 `recipeService.ts` 只提供延迟与内存仓库，刷新或更换设备后无法形成真实云端闭环。

现有登录和注册页面直接写入模拟 `UserSession`。私人笔记本与配方详情直接读取 Zustand 数组，尚无服务端所有权、加载失败、超时、跨设备刷新或越权保护。

现有 GitHub Pages 部署、`BrowserRouter` 的 `BASE_URL` basename、`404.html` SPA fallback 和路由级懒加载继续使用。前端不再引入 Supabase 浏览器客户端，也不得直接调用 Supabase Auth、PostgREST 或 Edge Functions。

## 系统架构

```text
React Web / GitHub Pages
├─ React Router
│  ├─ 公开核心链路
│  ├─ 注册、登录、验证与密码恢复页面
│  └─ 受保护页面与原任务恢复
├─ Zustand
│  ├─ 游客草稿与 v0.1.0 本地配方
│  ├─ 待恢复动作
│  └─ 导入客户端标识
├─ TanStack Query
│  ├─ 当前账户摘要
│  ├─ 云端配方列表与详情
│  └─ 导入批次状态
└─ API / Service / Repository 适配层
                 │ HTTPS /api/v1
                 ▼
NestJS Auth & Private Data Gateway
├─ AuthModule
├─ SessionModule
├─ AccountRecoveryModule
├─ RecipeModule
├─ RecipeImportModule
├─ RateLimitModule
├─ MailModule
└─ DatabaseModule
                 │ server-side connection
                 ▼
Supabase PostgreSQL
├─ 账户、密码凭据、会话与一次性令牌
├─ 私人配方与导入批次
├─ 密码重置操作终态与限流计数
└─ 约束、事务、索引与 RLS
```

### 信任边界

- 浏览器只信任 NestJS 公共 API，不持有数据库凭据或 Supabase 公钥，不直连任何 Supabase 数据面。
- NestJS 是应用身份和数据所有权的唯一执行入口。所有私人请求先验证 Access Token，再读取数据库当前账户状态与 `session_version`。
- NestJS 数据库角色不依赖匿名客户端身份。每个业务事务必须显式设置由服务端验证得到的用户上下文；RLS 对缺失、非法或不匹配上下文默认拒绝。
- 迁移角色与运行时角色分离。运行时角色不能修改迁移、提权函数或其他用户的认证数据。
- RLS 是纵深保护，不能替代 NestJS 的输入校验、身份校验、所有权判断和响应脱敏。

### 最小 NestJS 边界

NestJS 在 v0.2.0 只允许承担以下职责：

1. 邮箱注册、验证、登录、会话刷新、当前设备退出、密码恢复和重置。
2. 私人配方的本人保存、列表和只读详情。
3. v0.1.0 本地配方的主动导入、批次查询和失败项重试。
4. 服务端 schema 校验、幂等、事务、精确限流、日志脱敏和请求追踪。

不得借此加入社区、推荐服务、媒体上传、管理后台或公开配方库。Redis 只在多实例负载证明 PostgreSQL 限流或数据库压力不可接受后另行评审，不是 v0.2.0 前置依赖。

## 模块规划

具体文件拆分由修订后的 Task 21 决定，目录职责固定如下：

```text
src/
├─ lib/api/                # HTTP 客户端、基地址、凭据与错误映射
├─ services/auth/          # 注册、登录、验证、刷新、退出和密码重置合约
├─ services/recipes/       # 列表、详情与幂等保存接口
├─ services/imports/       # 导入批次、查询与失败重试接口
├─ queries/                # TanStack Query keys、queries、mutations
├─ store/                  # 草稿、本地配方、待恢复动作与持久化迁移
├─ routes/                 # 认证回调、保护与恢复编排
└─ pages/                  # 已签收页面和状态实现

server/
├─ src/auth/               # 注册、验证、登录与令牌签发
├─ src/sessions/           # Refresh Session 轮换、撤销与当前用户
├─ src/account-recovery/   # 恢复邮件、一次性 token 与重置事务
├─ src/recipes/            # 私人配方读写
├─ src/imports/            # 主动导入与批次恢复
├─ src/rate-limit/         # PostgreSQL 精确窗口限流
├─ src/mail/               # 邮件供应商适配器与模板
├─ src/database/           # 事务、可信用户上下文与健康检查
└─ test/                   # 单元、数据库集成与 API 集成测试

supabase/
├─ migrations/             # 表、约束、索引、RLS 与受限数据库函数
└─ tests/                  # PostgreSQL 约束、事务与 RLS 测试
```

## 认证与会话设计

### 注册与邮箱验证

1. 前端规范化邮箱首尾空格并做基础格式与密码最短长度校验，服务端重复完整校验。
2. `POST /api/v1/auth/register` 在事务中创建账户、密码凭据和邮箱验证 token 哈希。接口无论邮箱是否已存在都返回通用结果，避免账户枚举。
3. 原始验证 token 仅进入邮件链接，不落日志；数据库只保存其哈希、用户、用途、过期时间和使用时间。
4. 验证链接指向 GitHub Pages 的 `/auth/callback#token=...&type=email-verification`。fragment 不随 HTTP 请求发送；页面在应用初始化最前读取并用 `history.replaceState` 清除，再调用 NestJS 验证接口。
5. `POST /api/v1/auth/verify-email` 原子消费一次性 token 并标记邮箱已验证。重放返回稳定终态，不泄露账户细节。
6. 未验证邮箱账户只有游客能力，不能登录或访问私人数据。重新发送验证邮件遵守同一目标邮箱限流并返回通用结果。

### 登录与 Access Token

- `POST /api/v1/auth/login` 校验密码哈希、邮箱验证状态、账户状态和限流后创建 Refresh Session，并签发短期 Access Token。
- Access Token 至少携带 `sub`、`session_id`、`session_version`、`iat`、`exp`、`iss` 和 `aud`，不得携带邮箱全文或私人配方数据。
- Access Token 只用于证明请求声明。NestJS 对每个私人 API 请求查询数据库，确认账户 active、Session 未撤销且 token 中的 `session_version` 等于数据库当前值；旧 token 因此立即拒绝，而不等待自然过期。
- Access Token 仅保存在当前页面内存。Refresh Token 使用 `Secure`、`HttpOnly` Cookie，由 API 域设置；前端 JavaScript 不读取它。
- production 前端与 API 必须位于同一可注册域的不同子域，例如 `app.example.com` 与 `api.example.com`，Cookie 使用 `SameSite=Lax`。不得把第三方 Cookie 或浏览器分区 Cookie作为会话可用性的必要前提。
- 所有使用 Cookie 的状态变更接口同时校验受控 Origin 和 CSRF token。CORS 只允许生产站点和明确的本地开发 origin，必须开启 credentials，不能使用通配符。

### 刷新、恢复与退出

- `POST /api/v1/auth/refresh` 使用 Refresh Token 哈希定位 Session，原子轮换 token 并撤销前一个 token。检测到已轮换 token 重放时，撤销对应 Session family 并要求重新登录。
- 应用启动调用 `POST /api/v1/auth/refresh` 或 `GET /api/v1/auth/me` 恢复当前账户。恢复期间受保护页面显示明确加载状态，不能先闪现空笔记本。
- 同一账户允许多个设备拥有独立 Refresh Session。
- `POST /api/v1/auth/logout` 只撤销当前设备 Session、清除 Refresh Cookie 和内存 Access Token；其他设备保持登录。
- 会话自然过期时保留游客草稿和仍有效的 `PendingAction`，重新登录后继续原任务。

### 密码恢复与重置

1. `POST /api/v1/auth/password-recovery` 无论邮箱是否存在都返回通用结果。符合条件时创建一次性 recovery token 哈希并发送邮件。
2. 重置链接指向 `/auth/reset-password#token=...&operationId=...`。前端立即清除 fragment，新的密码和 token 只存在于 TLS 请求与页面内存。
3. `POST /api/v1/auth/password-reset` 接受 `operationId`、一次性 token 和新密码。服务端使用单个 PostgreSQL 事务：
   - 锁定并校验未使用、未过期且属于该 operation 的 recovery token；
   - 校验密码策略并生成新密码哈希；
   - 更新 `password_credentials`；
   - 递增 `account_security.session_version`；
   - 撤销该用户全部 `auth_sessions`；
   - 消费 recovery token；
   - 将 `password_reset_operations` 写为 `completed`，记录安全终态和完成时间。
4. `operationId` 是该次重置的稳定幂等键。相同 operation 重试不得再次递增版本；成功后返回相同的通用完成结果。
5. 若响应丢失，前端调用 `POST /api/v1/auth/password-reset-operations/{operationId}/status` 查询契约终态，并在请求体再次提交仍保留于页面内存的 recovery token。服务端允许已被同一 operation 成功消费且仍在短期查询期内的 token 只读取通用终态；不能仅凭 operation ID 获取状态。
6. 事务失败则所有变化回滚，终态仍为可重试的 `pending` 或明确 `failed`；不存在“密码已改但旧 Session 未撤销”的跨系统中间态。
7. 重置完成后所有旧 Access Token 因 `session_version` 不匹配立即失败，所有旧 Refresh Session 已在同一事务撤销；用户必须重新登录。

密码哈希库、JWT 库和 token 生成必须采用有持续安全维护的成熟实现。哈希算法与参数在实施技术探针中依据目标部署资源确定，并支持未来重新哈希；不得自行实现密码学原语。

### 原任务回跳

待恢复动作使用受限联合类型，不接受任意外部 URL：

```ts
type PendingAction =
  | { kind: "saveRecipe"; intentId: string; createdAt: string }
  | { kind: "openNotebook"; createdAt: string }
  | { kind: "openRecipe"; recipeId: string; createdAt: string };
```

- 默认有效期为 24 小时。
- 保存动作必须关联仍存在的本地草稿和同一个 `saveIntentId`。
- 主动退出清除动作；网络或会话过期触发的重新登录保留动作。
- 过期、结构非法或目标不可访问时停止自动执行并回到安全页面。

## 数据模型

所有业务主键使用 UUID，时间使用 `timestamptz` 并按 UTC 存储。配方正文中的数组和对象必须有服务端 schema 校验与大小上限。

### 认证与账户表

| 表 | 核心字段与约束 |
| --- | --- |
| `users` | `id`、规范化邮箱、邮箱查找哈希/唯一键、`email_verified_at`、`status`、时间戳；普通 API 不返回内部安全字段 |
| `password_credentials` | `user_id` 唯一外键、`password_hash`、算法与参数版本、`password_changed_at`；仅认证模块可访问 |
| `account_security` | `user_id` 唯一外键、`session_version` 正整数、失败计数/锁定状态与时间戳 |
| `auth_sessions` | `id`、`user_id`、Refresh Token 哈希、family/rotation 标识、到期/撤销/最后使用时间与有限设备摘要 |
| `email_verification_tokens` | token 哈希唯一、`user_id`、过期/使用时间；原 token 不落库 |
| `password_reset_tokens` | token 哈希唯一、`operation_id`、`user_id`、过期/使用/终态查询截止时间；同一 operation 仅一个有效 token，消费后只能在短期内查询该 operation 通用终态 |
| `password_reset_operations` | `id`、`user_id`、`status`、目标 `session_version`、结果码、创建/完成时间；同一 operation 形成可查询终态 |
| `rate_limit_counters` | 不可逆主体键、窗口类型、窗口起点、计数和过期时间；唯一键保证精确递增 |

邮箱规范化规则必须固定并测试，不做未经邮件服务契约支持的点号或别名折叠。邮件地址可按业务需要加密保存；日志和限流只使用带服务端 pepper 的不可逆键。

### `private_recipes`

| 字段组 | 说明 |
| --- | --- |
| 标识 | `id`、`owner_id`、`created_at`、`updated_at` |
| 来源 | `source_type`：`direct_save` 或 `local_import` |
| 幂等 | `save_intent_id`、`local_record_id` |
| 配方摘要 | 名称、英文名、来源鸡尾酒 ID/名称、基酒、备注 |
| 配方快照 | `flavor_tags`、`ingredients`、`steps`，使用经过校验的 JSONB |

约束：

- 直接保存使用部分唯一索引 `UNIQUE(owner_id, save_intent_id)`。
- 本地导入使用部分唯一索引 `UNIQUE(owner_id, local_record_id)`。
- 不使用内容哈希合并；内容相同但本地记录 ID 不同的配方可分别导入。
- 本版本只提供创建与只读，不提供更新或删除业务接口。

### 导入表

`recipe_import_batches` 保存 `id`、`owner_id`、`client_batch_id`、状态、成功/跳过/失败计数和时间戳，`UNIQUE(owner_id, client_batch_id)` 保证响应丢失后仍定位同一批次。

`recipe_import_items` 保存批次、`local_record_id`、状态、失败码、经同意上传的受限 payload、租约和时间戳，`UNIQUE(owner_id, local_record_id)` 防止同账户重复导入。

用户点击“立即导入”后，NestJS 在事务中建立批次及 `pending` 项。处理器原子领取有限租约，完成时必须匹配租约令牌；过期任务转为 `failed/INTERRUPTED`。重试只允许原批次的失败项。成功或跳过后清空 payload，失败 payload 仅在恢复期保留。

## 数据库上下文与 RLS

- 所有私人业务表创建时立即启用并强制 RLS，没有明确策略的操作默认拒绝。
- NestJS 对每个私人数据库操作开启事务，校验 Access Token 与数据库安全状态后，通过参数化、受限数据库函数设置当前 `user_id`；事务结束自动清除上下文。
- RLS 策略只允许 `owner_id` 等于当前可信用户上下文。缺失上下文、非 UUID、运行时角色直接查询或跨账户访问全部拒绝。
- 认证敏感表不向普通业务角色开放，密码哈希和 token 哈希不能通过 RLS 本人读取策略暴露。
- 使用连接池时必须验证上下文不会跨事务、跨请求泄漏；相关并发测试是发布门禁。
- 任何维护或迁移操作绕过 RLS 都必须使用独立凭据、受保护环境和审计记录。

## 幂等设计

### 直接保存

客户端在预览形成时创建稳定 `saveIntentId`。NestJS 在同一事务按 `owner_id + save_intent_id` 插入或返回已有记录；响应丢失、刷新或原任务恢复不得生成重复配方。

### 本地导入

客户端为一次确认生成稳定 `clientBatchId`，每条 v0.1.0 记录保留稳定 `localRecordId`。服务端按账户与本地记录 ID 判重；相同批次重放返回现有摘要，只重试失败项。

### 密码重置

`password_reset_operations.id` 是重置幂等键。所有密码、安全版本、Session 撤销和操作终态更新在同一事务内完成；响应不确定时查询该 operation，而不是重新发起另一次密码更新。

## API 合约

前端统一使用：

```ts
type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | {
      ok: false;
      code: ApiErrorCode;
      retryable: boolean;
      requestId: string;
      retryAfter?: number;
    };
```

稳定错误码至少包括：`AUTH_REQUIRED`、`EMAIL_UNVERIFIED`、`INVALID_CREDENTIALS`、`SESSION_REVOKED`、`VALIDATION_FAILED`、`NOT_FOUND`、`RATE_LIMITED`、`NETWORK_TIMEOUT`、`CONFLICT` 和 `INTERNAL_ERROR`。响应不得包含 SQL、堆栈、密码哈希、token、内部账户状态或邮箱存在性。

### P0 接口

| 接口 | 用途 | 核心规则 |
| --- | --- | --- |
| `POST /api/v1/auth/register` | 注册并发送验证邮件 | 通用响应，目标邮箱限流 |
| `POST /api/v1/auth/verify-email` | 消费邮箱验证 token | 一次性、可重放稳定终态 |
| `POST /api/v1/auth/resend-verification` | 重发验证邮件 | 不暴露邮箱是否存在 |
| `POST /api/v1/auth/login` | 登录并创建当前设备 Session | IP 限流、通用凭据错误 |
| `POST /api/v1/auth/refresh` | 轮换 Refresh Session | 重放检测，Cookie 更新 |
| `GET /api/v1/auth/me` | 当前账户摘要 | 每次校验 Session 与版本 |
| `POST /api/v1/auth/logout` | 当前设备退出 | 只撤销当前 Session |
| `POST /api/v1/auth/password-recovery` | 发送恢复邮件 | 通用响应，目标邮箱限流 |
| `POST /api/v1/auth/password-reset` | 原子完成密码重置 | operation 幂等、全旧会话立即失效 |
| `POST /api/v1/auth/password-reset-operations/{id}/status` | 查询重置契约终态 | 需提交同一 recovery token，不泄露账户 |
| `POST /api/v1/recipes` | 幂等保存配方 | 相同账户与 `saveIntentId` 返回同一记录 |
| `GET /api/v1/recipes` | 本人笔记本列表 | 按 `created_at desc`，有限分页 |
| `GET /api/v1/recipes/{id}` | 本人只读详情 | 不存在和无权统一为 `NOT_FOUND` |
| `POST /api/v1/recipe-imports` | 建立或继续导入批次 | 返回逐项状态与计数 |
| `GET /api/v1/recipe-imports/{clientBatchId}` | 恢复批次结果 | 回收过期租约并返回失败项 ID |
| `POST /api/v1/recipe-imports/{clientBatchId}/retry` | 重试失败项 | 只接受原批次失败项 |

## 超时、重试与恢复

- 请求 200ms 后显示处理中并阻止重复提交；10 秒后进入可恢复超时状态。
- 前端可用 `AbortController` 停止等待，但不能假定服务端没有完成。
- GET 网络错误最多自动重试 2 次并退避；认证失败、越权和其他 4xx 不自动重试。
- 写请求必须携带原幂等键，由用户动作或恢复编排重试。
- 保存超时保留 `saveIntentId`；导入超时先查询同一批次；密码重置超时先查询 operation 终态。
- 笔记本重新进入和应用回到前台时刷新云端数据。
- 加载、真实空状态、失败、超时、会话失效和无权访问保持不同状态语义。

## 本地持久化迁移

`wishtoday-flow-state` 增加显式版本和可重复执行的 `migrate`：

1. 首次迁移前复制原值到 `wishtoday-flow-state-v1-backup`，不自动删除备份。
2. 保留可解析 `currentDraft`，补入 schema 版本、稳定 `draftId` 和 `saveIntentId`。
3. 将 `savedRecipes` 转为只读 `localLegacyRecipes`，保留原 `id` 作为 `localRecordId`。缺失步骤按现有 `resolvePreviewSteps` 规则生成明确标记的迁移快照。
4. 将简单 `redirectAction` 转为受限 `PendingAction`，丢弃非法或过期值。
5. 删除持久化的模拟 `session`、保存瞬态和云端配方副本。
6. 云端列表与详情交给 TanStack Query；真实认证状态通过 NestJS API 恢复。

迁移不上传数据。只有用户点击“立即导入”后才发送配方正文。单条损坏记录应隔离，不能清空整个本地笔记本。密码、Access Token、Refresh Token 和一次性邮件 token 不得进入 Zustand 或业务 localStorage。

业务 localStorage 不可用时使用内存状态，云端账户与笔记本在当前页面仍可使用，但刷新后需重新登录，草稿、待恢复动作和幂等键不能恢复。界面必须在用户制作或保存前准确提示该限制。

## 安全与隐私

### 密钥与传输

- 所有环境使用 HTTPS。
- 前端只配置 `VITE_API_BASE_URL`；不配置数据库 URL、Supabase 匿名公钥或服务端密钥。
- 数据库凭据、JWT 签名密钥、Refresh Token pepper、邮件服务密钥和数据加密密钥只存在于 NestJS 运行环境或受保护 CI Secrets。
- staging 与 production 使用独立数据库、签名密钥、Cookie 名称、邮件配置和 API 域。
- 密钥支持轮换；JWT 使用明确 `kid` 和允许算法列表，验证时固定 issuer/audience，拒绝算法降级。
- `.env` 不提交仓库；服务启动和生产构建前校验必需环境变量。

### 限流基线

| 操作 | 初始基线 |
| --- | --- |
| 密码登录、刷新与 token 验证入口 | 每 IP 每 5 分钟最多 30 次 |
| 注册、验证与重置邮件 | 每目标邮箱每小时最多 3 封，并叠加 IP 防滥用阈值 |
| 保存配方 | 每用户每分钟 20 次 |
| 本地导入 | 每用户同时 1 批，单批最多 100 条 |

NestJS 在进入昂贵密码哈希或邮件发送前执行限流。PostgreSQL 通过原子 upsert/受限函数维护精确窗口计数，主体键使用服务端 pepper 后的不可逆哈希。触发后返回通用 `RATE_LIMITED` 与可用的 `retryAfter`，不暴露邮箱是否存在。多实例部署必须共享同一数据库计数并通过并发测试；CAPTCHA 仅作为后续可配置纵深措施，不替代服务端限流。

### CORS、CSRF、日志与隐私

- CORS 精确允许生产 Pages origin 和明确本地 origin，禁止通配符与凭据并用。
- 使用 Cookie 的刷新、退出等写接口执行 Origin/CSRF 校验；Access Token 接口仍执行授权和输入校验。
- 日志记录 `requestId`、路由、耗时、状态和不可逆用户哈希；不记录邮箱全文、密码、token、Cookie、配方正文或本地记录 ID 原值。
- 配方默认私有；邮箱仅用于认证、验证、安全通知和密码恢复，不用于营销或公开展示。
- 数据库启用可用备份，并记录密钥轮换、迁移和恢复演练历史。

## 部署设计

### 环境

- 建立独立的 Supabase PostgreSQL staging 与 production 项目，数据和凭据不共用。
- 建立独立的 NestJS staging 与 production 服务，均提供 HTTPS、健康检查、日志和受保护 Secrets。
- 继续使用 GitHub Pages 托管前端并保留 `BASE_URL` basename 与 `404.html` fallback。v0.1.0 可继续从 `https://zhbptpt.github.io/WishToday/` 访问；v0.2.0 账户功能启用前，production Pages 必须绑定自定义前端域，并与 API 域处于同一可注册域。
- 前端 staging 构建只连接 staging API；production 构建只连接 production API。
- 邮件链接使用固定 Pages 回调路径和 fragment token，不允许任意域名或任意 redirect URL。

NestJS 部署平台、邮件供应商和 production 自定义域在修订 Task 21 前确定，选择标准包括：长期运行 Node 服务、HTTPS、自定义域、健康检查、Secrets、日志、staging 环境和数据库出站连接。若自定义域尚未就绪，现有 v0.1.0 公共流程继续可用，但 v0.2.0 账户与云端笔记本入口保持关闭；不得改用可被浏览器阻断的第三方 Cookie 降低兼容标准。

### 发布顺序

1. 在 staging 应用账户、会话、配方、导入、限流 schema、索引与 RLS。
2. 部署 staging NestJS，完成认证、数据库上下文、邮件、故障注入和 API 集成测试。
3. 部署连接 staging API 的前端并完成真实跨域、Cookie、SPA 回调和双设备 E2E。
4. 在 production 应用向前兼容数据库迁移并验证备份。
5. 部署 production NestJS，先保持业务入口关闭并通过健康检查。
6. 部署 production 前端，完成生产冒烟后开启账户与云端笔记本入口。

GitHub Actions 在现有前端测试和 Pages 构建上增加 server lint/typecheck/test、数据库集成测试和环境变量结构检查。生产数据库迁移使用受保护环境与人工确认，数据库和 JWT 密钥不得暴露给普通 Pages 构建步骤。

## 测试策略

### 前端单元与集成测试

- 持久化 schema 迁移、损坏记录隔离和 localStorage 降级。
- `PendingAction` 白名单、过期和恢复规则。
- API 错误映射、超时、取消与有限重试。
- Access Token 仅内存保存，认证恢复期间不闪现受保护内容。
- `draftId`、`saveIntentId` 和 `clientBatchId` 生命周期。

### NestJS 单元与 API 集成测试

- 邮箱规范化、密码策略与密码哈希验证/升级。
- 注册、验证、登录、刷新轮换、Refresh Token 重放检测和当前设备退出。
- 通用认证错误不暴露账户存在性。
- 密码重置 operation 幂等、响应丢失查询、事务回滚和全部旧会话失效。
- IP/邮箱/用户限流在边界、并发和窗口切换时精确。
- 配方保存、读取、导入、失败重试、字段上限和错误脱敏。

### PostgreSQL 与 RLS 测试

- 无可信上下文默认拒绝、本人读取、跨账户越权和连接池上下文不泄漏。
- 旧 `session_version`、已撤销 Session 和未验证邮箱拒绝私人数据。
- 密码、版本递增、Session 全撤销和 operation 完成同事务提交或同事务回滚。
- 相同保存意图与导入记录并发请求最多产生一条记录。
- 导入租约、部分失败、仅失败项重试和 payload 回收。

### E2E 与安全测试

- 注册、查收验证邮件、验证、登录、忘记和重置密码。
- 游客保存后的认证回跳、草稿恢复和主动本地导入。
- 两个账户、两个浏览器上下文、多设备 Session 与当前设备退出。
- 密码重置后，全部旧 Access Token 和 Refresh Token 立即失败；丢失重置响应后可查询成功终态。
- GitHub Pages 深链接、fragment 立即清除、跨域 Cookie、CORS、CSRF 和无第三方脚本泄漏。
- 笔记本加载、空、失败、超时、会话失效和只读详情。
- 键盘、焦点、实时播报、200% 缩放、窄屏和减少动态效果。

## 可观测性

至少观测：

- 注册、验证、登录、刷新和密码恢复的成功率、失败率与限流次数。
- Refresh Token 重放、`SESSION_REVOKED`、密码重置 operation 终态和事务回滚。
- 保存成功率、P50/P95 延迟、超时和幂等命中次数。
- 导入成功、跳过、失败、重试和批次中断恢复。
- RLS 拒绝、数据库连接池异常、API 5xx 和健康检查状态。

告警和排障数据不得携带邮箱全文、认证秘密或私人配方正文。客户端展示的 `requestId` 用于关联服务端脱敏日志。

## 回滚方案

- 前端故障：关闭云端功能开关并部署上一稳定构建，保留本地草稿和备份键。
- NestJS 故障：暂停对应入口或回滚上一服务版本；不得降级为浏览器直连数据库。
- 数据库迁移只采用先新增、后切换、延后删除的扩展式策略；v0.2.0 发布窗口不删除旧列或本地兼容数据。
- 严重故障时不删除已成功导入或保存的云端记录；恢复后使用原幂等键继续。
- 认证安全故障可递增受影响账户或全局会话版本、撤销 Session 并要求重新登录，操作需审计。

## 上线门禁

- [ ] 修订后的 Task 21 已签收，认证安全任务位于业务云端功能之前。
- [ ] 全量前端、NestJS、PostgreSQL 集成和 E2E 测试通过。
- [ ] staging 注册、验证、登录、刷新、退出、重置、保存、导入和跨设备流程通过。
- [ ] 密码重置单事务、operation 幂等/终态查询和旧 Access/Refresh Token 立即失效测试通过。
- [ ] RLS 越权、缺失上下文、旧会话和连接池上下文泄漏测试通过。
- [ ] 精确限流、错误脱敏、CORS、CSRF、Cookie 和 fragment 泄漏检查通过。
- [ ] production API、环境变量、数据库备份、SPA 深链接与回调 URL 验证通过。
- [ ] 生产冒烟通过后才开启账户与云端笔记本入口。

## 依赖选择及理由

| 依赖类别 | 选择原则与理由 |
| --- | --- |
| NestJS | 模块、Guard、Interceptor、Validation 与测试边界适合最小认证和私人数据网关 |
| `@tanstack/react-query` | 管理远端缓存、刷新、错误、取消和有限重试 |
| PostgreSQL driver / query layer | 必须支持参数化查询、显式事务、连接池和事务级用户上下文；具体实现由修订 Task 21 固定 |
| 密码哈希库 | 使用成熟、持续维护的 Argon2id 或等价内存困难型实现，禁止自研密码学 |
| JWT 库 | 使用成熟库并固定算法、issuer、audience、短期有效期与密钥轮换策略 |
| Supabase PostgreSQL | 关系约束、事务、部分唯一索引和 RLS 适合认证终态、私人配方与导入幂等 |

本设计不使用 `@supabase/supabase-js` 作为浏览器依赖，不使用 Supabase Auth、PostgREST 或 Edge Functions。v0.2.0 不引入 Redis、Flutter、对象存储 SDK 或管理后台依赖。

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| 自建认证扩大安全责任 | 密码、Session 或恢复流程缺陷导致账户风险 | 成熟密码学库、威胁建模、模块隔离、故障注入、安全测试、密钥轮换和上线门禁 |
| 每次私人请求查询会话版本 | 增加数据库延迟与负载 | 索引化短查询、连接池与指标；未经测量不以缓存牺牲立即失效语义 |
| 前端与 API 不同站 | 第三方 Cookie 被浏览器阻断，登录无法可靠恢复 | GitHub Pages 与 API 使用同一可注册域的自定义子域；未配置前不开启账户功能 |
| Refresh Cookie 配置错误 | 登录恢复失败或 CSRF 风险 | Secure/HttpOnly/SameSite、固定 Origin、CSRF 测试与生产冒烟 |
| 数据库用户上下文跨连接泄漏 | 跨账户数据暴露 | 事务级上下文、自动清理、运行时默认拒绝和连接池并发测试 |
| PostgreSQL 限流热点 | 高并发时增加数据库压力 | 先按 MVP 负载测量并设置清理策略；达到明确阈值后再评审 Redis |
| GitHub Pages 深链接网络层 404 | 认证回调异常 | 保留 `404.html` fallback，并在 staging/production 真实冒烟 |
| 当前 Zustand 无版本迁移 | 本地草稿或配方丢失 | 版本化、迁移前备份、逐条隔离和可重复迁移测试 |
| 写响应丢失 | 用户重复创建或误判密码重置 | 稳定 operation/幂等键、数据库唯一约束和终态查询 |
| 导入批量过大 | 超时和数据库压力 | 单批最多 100 条、有限租约、逐项结果与失败项重试 |

## 交付物

- 修订后的 `docs/development-process/04_technical_design.md`
- 更新后的 `docs/development-process/00_process_index.md`

## 完成标准

- [x] Task 22 `NO-GO` 原因与方案 A 决策已记录。
- [x] NestJS 最小职责、浏览器/API/数据库信任边界已定义。
- [x] 注册、邮箱验证、登录、刷新、退出和恢复流程已定义。
- [x] 密码重置单数据库事务、操作终态查询和旧会话立即失效已定义。
- [x] 认证、私人配方、导入和限流数据模型已定义。
- [x] RLS 可信上下文、默认拒绝和连接池隔离已定义。
- [x] API、错误、超时、重试、本地迁移、安全和隐私已定义。
- [x] staging/production、测试、观测、上线门禁和回滚已定义。
- [x] v0.2.0 非目标未回流。
- [ ] 用户书面签收本次 Task 20 修订。

## 开放问题

以下为 Task 21 修订前必须确定的实施配置，不改变本设计的安全与范围边界：

- NestJS staging/production 部署平台与 production 自定义域尚未选择。前端和 API 必须能使用同一可注册域的不同子域，且平台满足长期 Node 运行、HTTPS、Secrets、健康检查和数据库连接要求。
- 事务与 PostgreSQL 用户上下文所用的 driver/query layer 尚未固定，应通过最小技术探针验证连接池隔离后选择。
- 密码哈希具体库与参数需依据部署平台资源基准确定，但必须使用成熟内存困难型算法并支持参数升级。
- 邮件供应商、发信域和模板尚未配置，需在 staging 验证投递、链接和目标邮箱限流。
- Supabase PostgreSQL staging/production 项目、NestJS 环境和凭据尚未创建。

## 给下一角色的交接

本修订文档须先由用户书面签收。签收后返回工程计划员，修订 `docs/development-process/05_implementation_plan.md`，废止其中以 Supabase Auth、Custom Access Token Hook、PostgREST 和 Edge Functions 为前提的任务。

新计划应先安排 NestJS/数据库最小脚手架、密码哈希与事务上下文探针，再安排认证核心、密码重置终态门禁、RLS、前端认证适配、云端保存、主动导入、页面状态、部署与 E2E。重新执行的新架构门禁必须得到 `GO` 后，才能继续私人数据业务实现。

不得提前加入 Flutter、Redis、对象存储、管理后台、社区或 v0.3.0 经典鸡尾酒配方库。
