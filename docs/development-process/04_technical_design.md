# 04 WishToday v0.2.0 技术设计

状态：已签收，可交接到实施计划阶段
负责角色：解决方案架构师
日期：2026-08-13

## 输入

- `docs/development-process/00_process_index.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/02_requirements_spec.md`
- `docs/development-process/03_design_spec.md`
- `docs/development-process/10_maintenance_handoff.md`
- `docs/technical-stack-and-scaffold.zh-CN.md`
- WishToday v0.1.0 现有 React 代码、测试、GitHub Pages 与 GitHub Actions 配置
- 用户逐段确认的技术基线、架构边界、数据模型、API、安全、迁移、测试和部署决策

## 范围

本文把已签收的 v0.2.0“真实账户与云端私人笔记本”需求转换为可实施的技术架构。范围包括认证、会话、私人配方、原任务回跳、本地配方主动导入、幂等、失败恢复、安全、迁移、测试、部署和回滚。

本阶段只定义技术方案，不修改业务代码，不创建 Supabase 资源，也不编写实施任务。

明确不纳入 v0.2.0：Flutter 重写、NestJS、Redis、对象存储上传、管理后台、社区、发布、收藏、摇一摇、个人资料、第三方登录、从零创建配方、已保存配方编辑/删除、笔记本搜索/筛选和经典鸡尾酒配方库。经典鸡尾酒配方库仍是 v0.3.0 候选方向。

## 已完成工作

- 核对现有 React、React Router、Zustand、mock Service 和 GitHub Pages 架构。
- 比较 Supabase、Firebase 和自建 Node API 三套后端方案。
- 确认 v0.2.0 保留现有 React Web，采用 Supabase 托管后端。
- 定义前端状态边界、认证与会话生命周期、数据库模型和 RLS 权限。
- 定义直接保存和本地导入的数据库级幂等规则。
- 定义 API 合约、错误分类、超时、重试和原任务恢复规则。
- 定义 v0.1.0 本地持久化迁移、部署、安全、测试、观测和回滚方案。

## 决策摘要

| 领域 | v0.2.0 决策 |
| --- | --- |
| Web 前端 | 保留 React 19、TypeScript、Vite、React Router 和 Zustand |
| 服务端状态 | 新增 TanStack Query，Zustand 不再充当云端数据仓库 |
| 认证 | Supabase Auth，邮箱密码、邮箱验证、会话恢复和密码重置 |
| 数据库 | Supabase PostgreSQL |
| 权限 | 所有私有表启用 RLS，并校验所有者与会话版本 |
| 敏感写操作 | Supabase Edge Functions |
| 前端部署 | 保留 GitHub Pages 和 `/WishToday/` SPA 基路径 |
| 后续演进 | Flutter 客户端与 NestJS API 后续引入；Redis、对象存储和后台按实际需求增加 |

## 现状与差距

现有 `src/store/useWishTodayStore.ts` 把草稿、模拟会话、保存状态和已保存配方共同持久化到 `wishtoday-flow-state`，且没有持久化 schema 版本。`src/services/apiClient.ts` 和 `recipeService.ts` 只提供延迟与内存仓库，刷新或换设备后无法形成真实云端闭环。

现有登录和注册页面直接写入模拟 `UserSession`，认证回跳仅支持 `saveRecipe` 或一个查询参数路径。私人笔记本和配方详情直接读取 Zustand 数组，尚无服务端所有权、加载失败、超时、跨设备刷新或越权保护。

现有 GitHub Pages 部署、`BrowserRouter` 的 `BASE_URL` basename、`404.html` SPA fallback 和路由级懒加载可以继续使用。

## 系统架构

```text
React Web / GitHub Pages
├─ React Router
│  ├─ 公开核心链路
│  ├─ 认证与回调页面
│  └─ 受保护页面与原任务恢复
├─ Zustand
│  ├─ 游客草稿
│  ├─ v0.1.0 本地配方
│  ├─ 待恢复动作
│  └─ 导入客户端标识
├─ TanStack Query
│  ├─ 云端配方列表与详情
│  ├─ 导入批次状态
│  └─ 缓存、刷新、取消和有限重试
└─ Service / Repository 适配层
   ├─ Supabase Auth
   ├─ PostgREST + RLS
   └─ Supabase Edge Functions
                 │
                 ▼
       Supabase PostgreSQL
```

### 组件边界

- 页面和 Zustand action 不直接依赖 Supabase 表结构，统一通过 `authService`、`recipeRepository` 和 `importService` 调用。
- Supabase SDK 管理真实会话；Zustand 不持久化模拟登录真假、Access Token 或 Refresh Token。
- TanStack Query 管理远端数据，Zustand 只管理本地流程状态，避免双数据源冲突。
- 普通本人数据读取使用 PostgREST，并始终由 RLS 约束。
- 幂等保存、批量导入和全局会话失效由 Edge Functions 承担，不能依赖浏览器完成权限或事务判断。
- 前端只能使用 Supabase 项目 URL 和匿名公钥；`service_role` 及管理密钥只能存在于服务端 Secrets。

### 后续演进边界

正式版需要复杂社区、推荐、审核或后台能力时，可在 Supabase/PostgreSQL 前增加 NestJS API。当前 Service / Repository 接口应允许替换传输实现，后续 Flutter 客户端复用正式 API，而不是依赖 Web 页面状态。

Redis 只在出现热点缓存、信息流、分布式限流或摇一摇排除记录的实际负载后引入。对象存储只在用户头像、酒图或社区媒体上传进入已签收范围后引入。React/Next.js + Ant Design 管理后台作为独立应用规划，不与 v0.2.0 Web 包混合。

## 前端模块规划

实施阶段按现有目录习惯规划以下职责，具体拆分由 Task 21 决定：

```text
src/
├─ lib/supabase/           # 浏览器客户端与环境校验
├─ services/auth/          # 注册、登录、验证、重置、会话恢复
├─ services/recipes/       # 列表、详情与幂等保存接口
├─ services/imports/       # 导入批次、查询与失败重试接口
├─ queries/                # TanStack Query keys、queries、mutations
├─ store/                  # 草稿、本地配方、待恢复动作和持久化迁移
├─ routes/                 # 认证回调、保护与恢复编排
└─ pages/                  # 已签收页面和状态实现

supabase/
├─ migrations/            # 表、索引、约束、RLS、函数和 Hook
├─ functions/             # 敏感写操作 Edge Functions
└─ tests/                 # 数据库和权限集成测试
```

## 认证与会话设计

### 注册与邮箱验证

1. 前端去除邮箱首尾空格并进行格式与最短密码校验。
2. `authService.signUp` 调用 Supabase Auth，提交固定的生产或本地回调地址。
3. 页面始终进入独立“查收验证邮件”状态，公开反馈不得确认邮箱是否已经存在。
4. Supabase 邮件模板把一次性 `token_hash` 和类型放在应用回调 URL 的 fragment 中，例如 `https://zhbptpt.github.io/WishToday/auth/callback#token_hash=...&type=email`。fragment 不随 HTTP 请求发送到 GitHub Pages。回调页在首个同步脚本中读取后立即使用 `history.replaceState` 清除，再调用 `verifyOtp`；应用不得把 fragment 写入日志、分析事件、错误上报、剪贴板或持久化。
5. Supabase Auth 开启“确认邮箱后才建立普通登录会话”。Custom Access Token Hook 还会从受信任的 Auth 记录写入 `email_verified` claim，RLS 与 Edge Function 均要求该值为 `true`，形成服务端纵深校验。

### 登录、恢复与退出

- 登录成功后验证邮箱状态和当前 `session_version`，再依次执行本地配方检测、用户导入选择和原任务恢复。
- Supabase SDK 负责刷新后的会话恢复。恢复期间受保护页面显示明确加载状态，不能先闪现空笔记本。
- 同一账户允许多个设备同时登录。
- 主动退出只撤销当前设备会话，并清除待自动执行动作；其他设备保持登录。
- 会话自然过期时保留草稿和仍有效的待恢复动作，重新登录后继续。

### 密码重置后的全局失效

`account_security.session_version` 初始为 `1`。Custom Access Token Hook 将版本、账户安全状态和由 `auth.users.email_confirmed_at` 派生的验证状态写入 JWT。RLS 与 Edge Functions 对每个私人请求比较 JWT claim 和数据库当前状态。

密码更新、业务数据库和 Auth Refresh Token 撤销跨越两个系统，不能假装为一个原子事务。回调页先以有效 recovery 会话向服务端换取短期、一次性 `reset_continuation`；服务端只保存其哈希、用户、过期时间和 recovery 验证证据。该能力只允许续执行密码重置，不受普通业务 `session_version` 和 RLS 影响，也不能读取私人配方。密码重置随后使用可重入、失败关闭的状态机：

1. 使用 `reset_continuation` 以 `reset_operation_id` 原子锁定 `account_security`，把 `security_status` 设为 `revocation_pending`、`reset_stage` 设为 `locked` 并递增 `session_version`。同一操作重试不再次递增。每个用户只允许一个未完成重置操作；新的 recovery 只能取得该操作的续执行能力，不能替换操作 ID。此后旧 Access Token 均不能访问私人数据。
2. 串行重置执行器在数据库事务中取得该用户的排他工作租约，把 `external_call_stage` 标记为 `password_update_in_flight` 后，才通过受信任 Auth Admin 能力更新密码。租约有效或外部调用结果尚未确定时，任何请求都不得开始第二次 Auth 调用。成功后以操作 ID、工作租约和预期阶段做 CAS 写入 `password_updated`。新密码只存在于当前 TLS 请求和用户仍打开页面的内存中，不写数据库或日志。
3. 同一个串行执行器以相同规则执行全局 Refresh Token 撤销，成功后用操作 ID、工作租约和预期阶段做 CAS 写入 `tokens_revoked`。
4. 只有步骤 2、3 均确认成功，且 CAS 仍证明这是当前操作时，才把 `security_status` 恢复为 `active`、`reset_stage` 设为 `completed` 并记录 `password_changed_at`；消费续执行能力，用户重新登录取得新版本令牌。
5. 函数中断时保持 `revocation_pending`。外部调用结果不确定时进入 `external_result_unknown` 隔离状态。只有认证提供方支持该密码更新操作的服务端幂等键，或提供可查询且契约上终局的操作状态时，自动补偿才可确认结果并继续；禁止用实测超时、租约过期或猜测释放隔离。若当前 Supabase 能力不满足，该账户保持失败关闭并进入人工安全恢复，v0.2.0 发布门禁判定失败，Task 21 必须更换具备该保证的认证实现或调整后端边界。新 recovery 链接只能续执行当前操作，所有后台补偿和完成写入都必须使用操作 ID + 工作租约 + 预期阶段的 CAS/fencing。任何路径都不能并发调用 Auth，也不能提前恢复私人数据访问。

数据库版本和安全状态比较使旧 Access Token 立即失去私人数据权限；全局撤销 Refresh Token 阻止旧设备换取新令牌。实施阶段必须先验证 recovery 会话的服务端可信识别、一次性续执行能力、Supabase Auth Hook、Admin 密码更新的幂等/终态能力和全局撤销接口，并注入各步骤故障验证接管与补偿。任一硬性能力不满足时 Task 21 必须阻塞并改选认证实现，不能降低为“等待旧令牌自然过期”或“超时后假定旧请求不会完成”。

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
- 对过期、结构不合法或目标不可访问的动作停止自动执行，并回到安全的已签收页面。

## 数据模型

所有业务主键使用 UUID，时间使用 `timestamptz` 并按 UTC 存储。配方正文中的数组和对象必须有服务端 schema 校验及大小上限。

### `account_security`

| 字段 | 类型 | 约束与用途 |
| --- | --- | --- |
| `user_id` | uuid | 主键，关联 `auth.users.id` |
| `session_version` | integer | 非空，默认 1，必须大于 0 |
| `security_status` | text | `active` 或 `revocation_pending`，非 active 时拒绝私人数据访问 |
| `reset_operation_id` | uuid | 当前或最近一次可重入重置操作标识 |
| `reset_stage` | text | `locked`、`password_updated`、`tokens_revoked` 或 `completed` |
| `reset_continuation_hash`、`reset_continuation_expires_at` | text、timestamptz | 短期续执行能力的哈希与有效期，原值不落库 |
| `external_call_stage`、`worker_lease_id`、`worker_lease_expires_at` | text、uuid、timestamptz | 串行化 Auth 外部调用并隔离结果不确定的请求 |
| `password_changed_at` | timestamptz | 最近密码更新时刻 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

`auth.users` 创建后由 `SECURITY DEFINER` 数据库触发器建立对应行；上线迁移先为既有用户回填，再启用 Custom Access Token Hook。Hook 对缺失行、无效状态或读取异常一律失败关闭，不签发可访问私人数据的 claim。该表仅允许本人读取必要状态；普通客户端不得直接修改。版本和重置状态只允许受信任流程修改。

### `private_recipes`

| 字段组 | 说明 |
| --- | --- |
| 标识 | `id`、`owner_id`、`created_at`、`updated_at` |
| 来源 | `source_type`：`direct_save` 或 `local_import` |
| 幂等 | `save_intent_id`、`local_record_id` |
| 配方摘要 | 名称、英文名、来源鸡尾酒 ID/名称、基酒、备注 |
| 配方快照 | `flavor_tags`、`ingredients`、`steps`，使用经过校验的 JSONB |

约束：

- 直接保存：部分唯一索引 `UNIQUE(owner_id, save_intent_id)`，仅 `save_intent_id IS NOT NULL` 时生效。
- 本地导入：部分唯一索引 `UNIQUE(owner_id, local_record_id)`，仅 `source_type = 'local_import'` 且 `local_record_id IS NOT NULL` 时生效。
- `direct_save` 必须有 `save_intent_id`；`local_import` 必须有 `local_record_id`。
- 不使用内容哈希合并。内容相同但本地记录 ID 不同的配方可分别导入。
- 本版本只有创建与只读，不提供更新或删除业务接口。

### `recipe_import_batches`

| 字段 | 说明 |
| --- | --- |
| `id`、`owner_id` | 批次和所有者 |
| `client_batch_id` | 客户端生成的稳定批次 ID |
| `status` | `processing`、`completed`、`completed_with_failures` |
| 计数 | `total_count`、`imported_count`、`skipped_count`、`failed_count` |
| 时间 | `created_at`、`updated_at`、`completed_at` |

`UNIQUE(owner_id, client_batch_id)` 保证刷新、超时和响应丢失后仍可定位同一批次。

### `recipe_import_items`

| 字段 | 说明 |
| --- | --- |
| `batch_id`、`local_record_id` | 联合主键，标识批次内项目 |
| `status` | `pending`、`processing`、`imported`、`skipped`、`failed` |
| `recipe_id` | 成功或跳过时关联云端配方 |
| `error_code` | 稳定且脱敏的失败类别 |
| `attempt_count` | 尝试次数 |
| `lease_token`、`lease_expires_at` | 防止并发处理并允许中断恢复 |
| `payload` | JSONB | 用户确认上传后的该项配方快照；完成或跳过后清空 |
| `created_at`、`updated_at` | 时间 |

用户点击“立即导入”后，服务端在同一事务建立批次及全部 `pending` 项并保存已明确同意上传的快照。处理器通过数据库原子操作领取有限时长租约；完成写入时必须匹配租约令牌。超过恢复宽限期仍未领取的 `pending` 项，以及租约过期的 `processing` 项，由查询/恢复流程原子转为 `failed/INTERRUPTED`。用户看到的重试集合因此仍只包含失败项；重试只允许原批次中的 `failed` 项。`imported` 或 `skipped` 后清空项目 payload，失败 payload 在批次恢复期内保留并受同等 RLS/日志规则保护。数据库唯一约束是最终幂等保障。

## 权限与 RLS

- 所有业务表创建后立即启用 RLS；没有明确策略的操作默认拒绝。
- 私人配方的读取条件至少包括 `auth.uid() = owner_id`、JWT 的 `email_verified = true`、`security_status = active`，以及 JWT 会话版本等于数据库当前版本。
- 导入批次及项目只允许对应所有者读取。
- 客户端提交的 `owner_id` 不可信；Edge Function 从已验证 JWT 取得用户 ID并写入。
- 其他账户请求已知配方 ID时统一表现为 `NOT_FOUND`，不泄露记录是否存在或属于谁。
- 任何绕过 RLS 的服务端调用必须先显式验证 JWT、邮箱状态、会话版本和数据所有权。

## 幂等设计

### 直接保存

- 用户第一次对当前草稿触发保存时生成 `saveIntentId` 并本地持久化。
- 重复点击、认证回跳、请求超时和网络重试沿用同一个 ID。
- 服务端以 `(owner_id, save_intent_id)` 原子插入或查询，首次创建与重复命中都返回同一配方 ID。
- 草稿内容发生编辑后，下一次保存生成新的意图 ID；仅页面刷新不生成新 ID。

### 本地导入

- 当前账户和本地记录 ID 是唯一判重维度。
- 已存在记录返回 `skipped` 和现有配方 ID，而不是失败。
- 不同账户可以分别导入同一浏览器中的同一个本地记录。
- 响应丢失时先按 `clientBatchId` 查询批次摘要和逐项结果；过期的处理中项目先被服务端归类为 `failed/INTERRUPTED`，客户端只提交服务端返回的失败项。
- 导入成功、跳过或失败都不自动删除本地记录。

## API 合约

应用层统一使用可判别结果：

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

稳定错误类别至少包括：`AUTH_REQUIRED`、`EMAIL_UNVERIFIED`、`SESSION_REVOKED`、`VALIDATION_FAILED`、`NOT_FOUND`、`RATE_LIMITED`、`NETWORK_TIMEOUT`、`CONFLICT` 和 `INTERNAL_ERROR`。响应不得包含 SQL、堆栈、密钥、令牌或内部账户状态。

### P0 接口

| 接口 | 用途 | 核心规则 |
| --- | --- | --- |
| `POST /functions/v1/save-recipe` | 幂等保存配方 | 相同账户与 `saveIntentId` 返回同一记录 |
| `GET /rest/v1/private_recipes` | 本人笔记本列表 | RLS，按 `created_at desc`，支持游标或有限分页 |
| `GET /rest/v1/private_recipes?id=eq.{id}` | 本人只读详情 | 不存在和无权统一为 `NOT_FOUND` |
| `POST /functions/v1/import-recipes` | 建立或继续导入批次 | 返回逐项状态及成功/跳过/失败计数 |
| `GET /functions/v1/import-batches/{clientBatchId}` | 恢复批次结果 | 返回批次计数、逐项状态和可重试失败项 ID，并回收过期处理租约 |
| `POST /functions/v1/retry-recipe-import` | 重试失败项 | 仅接受原批次失败的本地记录 ID；使用已存 payload 或客户端同一来源快照 |
| `POST /functions/v1/complete-password-reset` | 可重入完成密码重置 | 仅接受短期 `reset_continuation`，按阶段更新密码、撤销令牌并恢复账户状态 |

认证注册、登录、验证、会话恢复和普通密码恢复通过 `authService` 封装 Supabase Auth SDK；涉及全局会话作废的密码更新必须进入受信任服务端流程。

## 超时、重试与恢复

- 请求 200ms 后显示处理中并阻止重复提交。
- 10 秒后进入可恢复超时状态；前端可用 `AbortController` 停止等待，但不能假定服务端没有完成。
- GET 网络错误最多自动重试 2 次并退避；认证失败、验证失败、越权和 4xx 业务错误不自动重试。
- 写请求不盲目自动重试，必须携带原幂等键，由用户动作或恢复编排重试。
- 保存超时保留草稿与 `saveIntentId`；再次请求返回同一配方。
- 导入超时先查询同一批次的摘要和逐项结果；服务端将租约过期项标记为 `failed/INTERRUPTED` 后，客户端只重试返回的失败项。
- 笔记本重新进入和应用回到前台时刷新云端数据。
- 加载、真实空状态、失败、超时、会话失效和无权访问必须保持不同状态语义。

## 本地持久化迁移

当前 `wishtoday-flow-state` 没有版本号。v0.2.0 必须增加显式持久化版本和可重复执行的 `migrate`：

1. 首次迁移前复制原值到 `wishtoday-flow-state-v1-backup`，不自动删除备份。
2. 保留可解析的 `currentDraft`，补充 schema 版本、稳定 `draftId` 和 `saveIntentId`。
3. 将 `savedRecipes` 转换为只读 `localLegacyRecipes`，保留每条原 `id` 作为 `localRecordId`。v0.1.0 没有独立保存 `steps`：迁移时优先使用 `sourceCocktailId` 和现有 `resolvePreviewSteps` 规则生成快照；来源不可解析时按当前详情页行为，将材料顺序规范化为只读步骤文本，并记录 `migrationSource = "v0.1-fallback"`，确保导入内容不缺步骤且不伪称为原始经典步骤。
4. 将简单 `redirectAction` 转换为受限 `PendingAction`；不合法或过期动作丢弃。
5. 删除持久化的模拟 `session`、`saveStatus`、`saveError` 和云端配方副本。
6. 真实会话交给 Supabase SDK 恢复，云端列表和详情交给 TanStack Query。

迁移过程中若单条本地记录损坏，应隔离该条并给出可理解提示，不能清空整个本地笔记本。迁移不上传数据；只有用户点击“立即导入”后才能把配方正文发送到服务端。密码和认证令牌不得进入 Zustand 或业务 localStorage。

应用启动时必须分别探测业务 localStorage 和 Supabase 会话存储。业务 localStorage 不可用时 Zustand 使用内存存储，当前页面内仍可登录、保存和读取云端笔记本，但刷新后草稿、待恢复动作和幂等键不能恢复。

邮件验证和密码恢复不依赖 PKCE verifier 跨标签持久化，而采用邮件 fragment 中的一次性 `token_hash` + `verifyOtp` 流程。fragment 在网络请求前不会发送给 GitHub Pages，但仍属于浏览器端敏感数据：回调入口不得加载第三方脚本，必须在应用初始化最前读取并清除；内容安全策略、测试和日志检查必须验证它不会泄漏。Task 21 必须用新标签、已关闭原页面和 localStorage 不可用三种场景验证邮件回调。

localStorage 不可用时云端账户、保存和笔记本保持可用，但刷新后需重新登录。界面必须在用户开始制作或保存前提示草稿无法跨刷新恢复，且不能声称草稿已持久化。

## 安全与隐私

### 密钥与传输

- 全部环境使用 HTTPS。
- 前端仅配置 `VITE_SUPABASE_URL` 和可公开的匿名公钥。
- `service_role`、管理凭据和邮件服务密钥只保存在 Supabase Secrets 或受保护 CI Secrets。
- `.env` 不提交仓库；生产构建前校验必需环境变量存在。

### 限流基线

| 操作 | 初始基线 |
| --- | --- |
| 密码登录/令牌端点 | 每 IP 每 5 分钟最多 30 次，由 Supabase Auth 项目限流执行 |
| 注册、验证与重置邮件 | 每目标地址每小时最多 3 封，并启用 Supabase CAPTCHA；平台不支持的额外 IP 维度必须通过受控认证入口补足 |
| 保存配方 | 每用户每分钟 20 次 |
| 本地导入 | 每用户同时 1 批；单批最多 100 条 |

直接 Auth SDK 调用只依赖 Supabase 服务端限流和 CAPTCHA，客户端节流不计入安全控制。配方与导入使用 Edge Functions 按用户执行应用层限流。触发后返回通用 `RATE_LIMITED` 与可用的 `retryAfter`，不得通过反馈暴露邮箱是否存在。实施探针必须确认所用 Supabase 版本可配置上述阈值；若无法满足，注册/登录/邮件请求改走受控 Edge Function 或独立认证网关。降低账户枚举保护必须重新评审。

### CORS、日志与隐私

- Edge Functions 显式校验生产站点和明确的本地开发 origin，并返回对应 CORS 头。Supabase 托管 PostgREST 的跨域行为不作为安全边界；其授权只依赖有效 JWT 与 RLS，即使跨域请求可发出也不能越权读取数据。
- 日志记录 `requestId`、函数、耗时、状态和不可逆用户哈希。
- 不记录邮箱全文、密码、令牌、配方正文或本地记录 ID 原值。
- 配方默认私有；邮箱只用于认证、验证、安全通知和密码恢复，不用于营销。
- Supabase 项目开启可用的数据库备份，并记录密钥轮换和迁移历史。

## 部署设计

### 环境

- 至少建立独立的 Supabase staging 与 production 项目，数据库和 Auth 配置不得共用。
- 生产前端继续部署到 `https://zhbptpt.github.io/WishToday/`。
- React Router 保留 `import.meta.env.BASE_URL` basename 和现有 `404.html` fallback。
- Supabase Site URL 指向 `https://zhbptpt.github.io/WishToday/`；邮件模板精确生成 `https://zhbptpt.github.io/WishToday/auth/callback#...` 和 `https://zhbptpt.github.io/WishToday/auth/reset-password#...`，Auth 允许列表包含对应的无 fragment 基础地址及明确的本地开发地址，禁止任意域名通配。

### 发布顺序

1. 在 staging 应用数据库 schema、索引、RLS、Hook 和 Edge Functions。
2. 完成集成、E2E、安全和回调验证。
3. 在 production 应用向前兼容的数据库迁移。
4. 部署 production Edge Functions。
5. 部署带关闭状态功能开关的前端。
6. 完成生产冒烟后开启账户与云端笔记本入口。

GitHub Actions 在现有全量测试和 Pages 构建基础上增加类型检查、Supabase 环境变量检查及适合 CI 的集成测试。生产数据库变更使用受保护环境和人工确认，不把管理密钥暴露给普通 Pages 构建步骤。

## 测试策略

### 单元测试

- 持久化 schema 迁移和损坏记录隔离。
- `PendingAction` 白名单、过期和恢复规则。
- 错误码映射、超时与重试判断。
- `draftId`、`saveIntentId` 和 `clientBatchId` 生命周期。

### Supabase 集成测试

- RLS：本人读取、跨账户越权、未验证邮箱和旧 `session_version`。
- 相同保存意图的并发与顺序重试最多产生一条记录。
- 相同账户导入判重、不同账户独立导入、部分失败和仅失败项重试。
- 密码重置后所有旧设备无法继续读取或写入私人数据。
- 限流、字段上限、非法 JSONB 和错误脱敏。

### 页面与 E2E

- 注册、查收验证邮件、验证结果、登录、忘记与重置密码。
- 游客保存后的认证回跳及草稿恢复。
- 本地导入的确认、稍后处理、进度、完成、部分失败和重试。
- 笔记本加载、真实空、失败、超时、会话失效和只读详情。
- 两个账户、两个浏览器上下文和多设备会话。
- 单设备退出、密码重置全局失效、跨设备读取和 GitHub Pages 深链接回调。
- 键盘、焦点、实时播报、200% 缩放、窄屏和减少动态效果。

## 可观测性

至少观测：

- 注册、登录、验证和密码恢复的成功率、失败率与限流次数。
- 保存成功率、P50/P95 延迟、超时和幂等命中次数。
- 导入成功、跳过、失败、重试和批次中断恢复。
- RLS 拒绝、`SESSION_REVOKED` 和 Edge Function 5xx。

告警与排障数据不得携带邮箱全文或私人配方正文。客户端展示的 `requestId` 可用于关联服务端脱敏日志。

## 回滚方案

- 前端故障：关闭云端功能开关并部署上一稳定构建。
- Edge Function 故障：暂停对应写入口，保留草稿、幂等键、导入批次和数据库记录。
- 数据库迁移只采用先新增、后切换、延后删除的扩展式策略；v0.2.0 发布窗口不删除旧列或本地兼容数据。
- 严重故障时不得回滚或删除已成功导入/保存的云端记录；恢复后使用原幂等键继续。
- 本地迁移保留 v0.1.0 备份键，回滚前端不应覆盖或清除该备份。

## 上线门禁

- [ ] 全量单元、集成和 E2E 测试通过。
- [ ] staging 注册、验证、重置、保存、导入和跨设备流程通过。
- [ ] RLS 越权与旧会话失效测试通过。
- [ ] production 回调 URL、CORS、环境变量和 SPA 深链接验证通过。
- [ ] 数据库备份与恢复步骤经过验证。
- [ ] 日志脱敏、限流和告警配置通过检查。
- [ ] 生产冒烟通过后才开启云端功能开关。

## 依赖选择及理由

| 依赖 | 选择理由 |
| --- | --- |
| `@supabase/supabase-js` | 官方 Auth、PostgREST 和会话客户端，减少自建认证风险 |
| `@tanstack/react-query` | 明确管理远端缓存、刷新、错误、请求取消和有限重试 |
| Supabase PostgreSQL | 关系约束、事务、部分唯一索引和 RLS 适合私人配方与导入幂等 |
| Supabase Edge Functions | 承担敏感写入、批量导入和会话作废编排，不向浏览器暴露管理权限 |

不在 v0.2.0 引入 NestJS、Redis、Flutter、对象存储 SDK 或管理后台依赖。

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| 密码重置跨 Auth 与业务数据库且外部结果可能不确定 | 旧会话残留或迟到请求覆盖新密码 | 失败关闭状态机、串行租约、操作 fencing；密码更新幂等/终态能力作为硬性发布门禁 |
| GitHub Pages 深链接返回网络层 404 | 认证回调体验或第三方校验异常 | 保留 `404.html` fallback，并在 staging/production 真实回调冒烟 |
| 当前 Zustand 无版本迁移 | 本地草稿或配方丢失 | 版本化、迁移前备份、逐条隔离、可重复迁移测试 |
| 写请求响应丢失 | 用户误以为失败并重复创建 | 稳定幂等键、数据库唯一约束、重试前查询结果 |
| Supabase 平台耦合 | 后续迁移到 NestJS 成本上升 | 页面只依赖 Service / Repository 合约，不直接依赖表结构 |
| 导入批量过大 | 超时和函数资源压力 | 单批最多 100 条、逐项结果、批次恢复与失败项重试 |
| RLS 配置遗漏 | 私人数据泄露 | 默认拒绝、迁移即启用 RLS、跨账户自动化测试作为发布门禁 |

## 交付物

- `docs/development-process/04_technical_design.md`
- 更新后的 `docs/development-process/00_process_index.md`

## 完成标准

- [x] 技术基线、系统边界和后续演进方向已确认。
- [x] 认证、邮箱验证、密码重置和会话生命周期已定义。
- [x] 服务端所有权、RLS 和密码重置后的全局会话失效已定义。
- [x] 云端配方、保存幂等、本地导入判重和部分失败重试已定义。
- [x] API 合约、错误码、超时、重试和恢复规则已定义。
- [x] 前端状态拆分和 v0.1.0 本地数据迁移已定义。
- [x] GitHub Pages、环境变量、回调 URL、CORS 和密钥边界已定义。
- [x] 测试、观测、上线门禁和回滚方案已定义。
- [x] v0.2.0 非目标未回流。
- [x] 用户已于 2026-08-13 书面签收本文档。

## 开放问题

技术设计无产品阻塞项。以下为实施验证项，不改变本设计：

- Task 21 应把 Supabase Auth Hook、密码更新幂等/契约终态、全局 Refresh Token 撤销与 RLS 会话版本比较列为最早的技术探针；任一硬性能力不满足即阻塞并改选认证实现。
- Supabase staging/production 项目尚未创建，项目 URL、匿名公钥和最终 Auth 邮件模板在实施/部署阶段配置。
- 限流阈值需在 staging 验证误伤和资源消耗后确认生产值。

## 给下一角色的交接

本文已由用户书面签收。下一角色为工程计划员，请创建或更新 `docs/development-process/05_implementation_plan.md`，将本文拆成小步、可测试、可回滚的实施任务。

实施计划应先安排 Supabase 能力探针和本地持久化迁移测试，再安排数据库/RLS、认证、Service/Repository、云端保存、主动导入、页面状态、部署与 E2E。不得提前加入 Flutter、NestJS、Redis、对象存储、管理后台或 v0.3.0 经典鸡尾酒配方库。
