# 05 WishToday v0.2.0 实施计划

> **给执行代理：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行；使用复选框逐步记录进度。Task 5 新架构安全门禁得到 `GO` 前，不得开始 Task 6 及之后的私人数据实现。

状态：已由用户书面签收，可交接到阶段 06 实现
负责角色：工程计划员
日期：2026-08-13

**目标：** 在不破坏 v0.1.0 核心链路与沉浸式笔记本视觉的前提下，实现真实邮箱账户、云端私人笔记本、幂等保存、跨设备读取和本地配方主动导入。

**架构：** 保留 React 19、TypeScript、Vite、React Router、Zustand、TanStack Query 和 GitHub Pages；新增严格限域的 NestJS 认证与私人数据网关。浏览器只调用 `/api/v1`，NestJS 通过显式 PostgreSQL 事务访问 Supabase PostgreSQL；密码凭据、Refresh Session、`session_version` 和密码重置 operation 终态位于同一数据库边界，RLS 作为默认拒绝的纵深保护。

**技术栈：** React 19、TypeScript 5.8、Vite 7、React Router 7、Zustand 5、TanStack Query 5、Vitest 3、NestJS 11、Node.js 22、`pg` 8、Argon2id、`jose` 6、PostgreSQL、Supabase 数据库、Resend 邮件、Playwright、Render、GitHub Actions/Pages。

## 输入

- `docs/development-process/00_process_index.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/02_requirements_spec.md`
- `docs/development-process/03_design_spec.md`
- 已签收修订版 `docs/development-process/04_technical_design.md`
- `docs/technical-spikes/2026-08-13-supabase-auth-capability-gate.md`
- 当前 React/Vite 仓库、测试、GitHub Pages 与 GitHub Actions 配置

## 修订说明

原计划 Task 1 已执行并得到 Supabase Auth `NO-GO`。原计划中 Supabase Auth、Custom Access Token Hook、浏览器 PostgREST、Edge Functions 和 `/functions/v1`/`/rest/v1` 接口全部废止；`e30b02a` 的报告作为历史决策证据保留，不继续补做原门禁。

本计划不修改需求和页面设计，只替换认证与服务端实施路径。原 Task 3 的本地持久化迁移尚未实施，应纳入新计划正常执行。

## 全局约束

- v0.2.0 唯一目标是“真实账户与云端私人笔记本”。
- 游客必须继续完成“今日推荐 -> 详情 -> 实验台 -> 预览”，仅保存和私人数据访问要求登录。
- 手机端保持“整屏即书页”，账户入口使用右侧书页索引签；不得添加传统顶栏或底部导航。
- 本地配方只有用户点击“立即导入”后才能上传；稍后处理、成功或失败均不得删除本地记录。
- 私人配方只能创建和只读；不得增加编辑、删除、分享、发布、收藏、搜索或筛选。
- 不加入社区、摇一摇、个人资料、账户中心、手机号/第三方登录或经典鸡尾酒配方库。
- 不引入 Flutter、Redis、对象存储或管理后台。
- NestJS 只承担认证、会话、密码恢复、私人配方、导入、限流和必要观测；不得扩展为社区或推荐后端。
- 浏览器不得直接调用 Supabase Auth、PostgREST 或 Edge Functions，不得依赖 `@supabase/supabase-js`。
- 所有写入必须幂等；私人请求必须由 NestJS 显式校验身份/所有权，并由 RLS 纵深保护。
- 密码、验证/重置 token、Refresh Token、数据库凭据和私人配方正文不得进入业务日志或 Zustand 持久化。
- 网络操作 200ms 后显示处理中，10 秒后进入可恢复超时；写请求不得无幂等键盲重试。
- production 前端与 API 必须使用同一可注册域的不同子域；未配置自定义域前，v0.2.0 账户入口保持关闭。
- 每个实现任务采用测试先行，相关测试、类型检查与构建通过后独立提交，并更新 `docs/development-process/06_implementation_log.md`。

## 固定技术选择

| 类别 | 选择 | 理由与边界 |
| --- | --- | --- |
| 服务框架 | NestJS 11 + Express adapter | 与 Node 22 兼容，模块/Guard/Interceptor/Test 边界成熟 |
| 数据访问 | `pg` 8 + 手写参数化 repository | 密码重置和 RLS 上下文需要明确事务/连接控制；不引入 ORM 隐藏边界 |
| 校验 | Nest DTO + `class-validator`/`class-transformer` | HTTP 输入统一白名单、长度与格式校验 |
| 密码 | `argon2` 0.45，Argon2id | 成熟内存困难型实现；参数由 Task 1 基准固定并写入哈希 |
| Token | `jose` 6 | 固定算法、issuer、audience、`kid` 与密钥轮换；不手写 JWT |
| 邮件 | Resend 适配器 | API 简单、支持测试域；所有调用置于 `MailPort` 后以便替换 |
| API 部署 | Render Web Service | 长期 Node 进程、HTTPS、自定义域、健康检查、Secrets 与 staging 环境 |
| 数据库 | Supabase PostgreSQL | 只使用数据库、备份与连接能力；不使用 Auth/PostgREST/Edge Functions |
| 限流 | PostgreSQL 精确窗口 | 多实例共享计数；MVP 不引入 Redis |

版本安装时使用当日审阅到的兼容版本并提交 lockfile；NestJS 包保持同一 minor。升级不与业务任务混合。

## 文件与模块规划

```text
src/
├─ app/AppProviders.tsx                  # QueryClient 与认证启动
├─ lib/api/apiClient.ts                  # /api/v1 HTTP、超时、credentials、错误映射
├─ lib/config/env.ts                     # VITE_API_BASE_URL 与功能开关
├─ services/api/types.ts                 # ApiResult、ApiErrorCode、分页类型
├─ services/auth/                        # 浏览器认证/会话/密码重置合约
├─ services/recipes/                     # 配方 Repository 合约与 HTTP 实现
├─ services/imports/                     # 导入合约与 HTTP 实现
├─ queries/                              # Query keys、queries、mutations
├─ store/persistence/                    # v0.1 -> v0.2 迁移与降级存储
├─ routes/                               # PendingAction、保护路由、fragment 消费
├─ components/account/                   # 账户索引签与菜单
├─ components/imports/                   # 主动导入便笺流程
└─ pages/auth/                           # 注册、验证、登录与重置章节

server/
├─ package.json                          # 独立服务依赖与脚本
├─ package-lock.json                     # 服务端锁文件
├─ tsconfig.json
├─ src/main.ts                           # 安全中间件、CORS、validation、cookie
├─ src/app.module.ts
├─ src/config/                           # 服务端 env schema
├─ src/common/                           # ApiResult、requestId、日志与异常映射
├─ src/database/                         # pg pool、事务、用户上下文、健康检查
├─ src/auth/                             # 注册、验证、登录与 Access Token
├─ src/sessions/                         # Refresh 轮换、重放检测、退出与 AuthGuard
├─ src/account-recovery/                 # 恢复 token 与原子密码重置 operation
├─ src/rate-limit/                       # PostgreSQL 精确窗口计数
├─ src/mail/                             # MailPort、Resend adapter 与测试 adapter
├─ src/recipes/                          # 私人配方 API/repository
├─ src/imports/                          # 导入批次、租约与重试
└─ test/                                 # API、数据库、双会话与故障注入

supabase/
├─ migrations/                           # 账户、会话、配方、导入、限流、RLS
└─ tests/                                # SQL 约束、事务与 RLS 测试

e2e/                                     # Playwright 双账户、多上下文与 Pages 回调
scripts/deployment/                      # 配置检查与生产冒烟
docs/technical-spikes/                   # 新架构门禁证据
```

现有 `src/pages/*`、`src/store/useWishTodayStore.ts`、`src/styles/global.css` 只做计划内接线，不重构全部样式或重写 v0.1.0 页面。

## 共享接口

以下名称在所有任务中保持一致：

```ts
export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "EMAIL_UNVERIFIED"
  | "INVALID_CREDENTIALS"
  | "SESSION_REVOKED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_TIMEOUT"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | {
      ok: false;
      code: ApiErrorCode;
      retryable: boolean;
      requestId: string;
      retryAfter?: number;
    };

export type SessionUser = {
  id: string;
  email: string;
  emailVerified: true;
};

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: SessionUser;
};

export type PendingAction =
  | { kind: "saveRecipe"; draftId: string; saveIntentId: string; expiresAt: string }
  | { kind: "openNotebook"; expiresAt: string }
  | { kind: "openRecipe"; recipeId: string; expiresAt: string };

export type PasswordResetStatus = "pending" | "completed" | "failed";
export type ImportItemStatus =
  | "pending"
  | "processing"
  | "imported"
  | "skipped"
  | "failed";
```

稳定标识统一使用 `draftId`、`saveIntentId`、`localRecordId`、`clientBatchId`、`operationId`；数据库列使用对应 snake_case。`PendingAction` 创建时默认 24 小时后过期，不接受任意 URL。

## HTTP 与安全约定

- API 基路径固定为 `/api/v1`，健康检查为 `/healthz`。
- Access Token 使用 `Authorization: Bearer`，只保存在浏览器内存，默认 10 分钟有效。
- Refresh Token 默认 30 天有效，原值只存在于 `Secure`、`HttpOnly`、`SameSite=Lax` Cookie；数据库只存 SHA-256 + 服务端 pepper 的哈希。
- production 使用 `app.<domain>` 与 `api.<domain>`；Cookie 不设置宽泛 `Domain`，由 API host-only 持有。
- Cookie 写接口要求受控 `Origin` 和双提交 CSRF token；CORS 只允许配置列表并开启 credentials。
- Access Token 固定 `RS256`、issuer `wishtoday-api`、audience `wishtoday-web`，通过 `kid` 支持签名密钥轮换。
- 数据库业务请求统一使用 `withUserTransaction(userId, fn)`，事务内执行 `select set_config('app.user_id', $1, true)`；任何 repository 不得自行从请求体接收 owner ID。

## 新架构 Go/No-Go 门禁

Task 5 是私人数据实现前的硬门禁。只有以下证据全部为 `PASS` 才记录 `GO`：

1. 密码重置在单个 PostgreSQL 事务中更新密码哈希、递增 `session_version`、撤销全部 Refresh Session、消费 recovery token 并写入 operation `completed`。
2. 任一步骤注入数据库异常时事务全部回滚，不出现密码与 Session 状态分裂。
3. 相同 `operationId` 重试不重复递增版本；响应丢失后提交同一 recovery token 可查询通用终态。
4. 两个设备的旧 Access Token 在重置提交后立即被 NestJS 拒绝，旧 Refresh Token 均无法刷新，新密码可重新登录。
5. Refresh Token 轮换重放可撤销对应 Session family；当前设备退出不影响其他设备。
6. PostgreSQL 限流并发测试满足每 IP 每 5 分钟 30 次、每目标邮箱每小时 3 封。
7. RLS 用户上下文在连接池并发请求间不泄漏，缺失上下文默认拒绝。

任一失败即 `NO-GO`，停止 Task 6 及以后任务，回到 Task 20 修订；不得以短 Access Token、前端退出或等待自然过期替代立即失效。

## 依赖顺序

```text
Task 1 工程与部署探针
  -> Task 2 本地持久化迁移
  -> Task 3 账户数据库与认证核心
  -> Task 4 会话、限流与密码重置
  -> Task 5 新架构安全门禁 GO
  -> Task 6 RLS 与私人数据上下文
  -> Task 7 前端认证适配
  -> Task 8 配方保存与只读查询
  -> Task 9 本地主动导入
  -> Task 10 认证与账户界面
  -> Task 11 私人笔记本与跨设备状态
  -> Task 12 E2E、安全、可访问性与范围回归
  -> Task 13 CI、部署门禁与发布准备
```

Task 2 可在 Task 1 的外部服务探针期间开发；Task 6 及以后不得绕过 Task 5。

---

### Task 1：NestJS、PostgreSQL 与部署工程基线

**需求覆盖：** 技术基线、部署可行性、安全密钥边界。

**文件：**
- 修改：`package.json`、`.gitignore`
- 新建：`.env.example`、`src/lib/config/env.ts`、`src/lib/config/env.test.ts`
- 新建：`server/package.json`、`server/package-lock.json`、`server/tsconfig.json`、`server/.env.example`
- 新建：`server/src/main.ts`、`server/src/app.module.ts`
- 新建：`server/src/config/env.ts`、`server/src/config/env.spec.ts`
- 新建：`server/src/common/api-result.ts`、`server/src/common/request-id.middleware.ts`
- 新建：`server/src/database/database.module.ts`、`server/src/database/database.service.ts`、`server/src/database/database.service.spec.ts`
- 新建：`server/src/health/health.controller.ts`、`server/test/health.e2e-spec.ts`
- 新建：`render.yaml`

**产出接口：** `getPublicEnv(): { apiBaseUrl: string; cloudFeaturesEnabled: boolean }`；`DatabaseService.transaction<T>(fn)`；`GET /healthz`。

- [ ] **Step 1：写环境与健康检查红灯测试**

  前端测试缺失 `VITE_API_BASE_URL` 且云端开关开启时抛错；服务端测试缺失 `DATABASE_URL`、JWT key、token pepper 或允许 origin 时启动失败。E2E 断言：

  ```ts
  await request(app.getHttpServer())
    .get("/healthz")
    .expect(200, { status: "ok" });
  ```

- [ ] **Step 2：运行红灯测试**

  执行 `npm test -- src/lib/config/env.test.ts` 和 `npm --prefix server test -- --runInBand`；预期因模块不存在失败。

- [ ] **Step 3：创建独立服务包并固定依赖**

  服务 dependencies 包含 NestJS 11、`pg` 8、`argon2`、`jose` 6、`class-validator`、`class-transformer`、`cookie-parser`、`resend`；devDependencies 包含 TypeScript、Vitest、Supertest、`tsx` 与类型包。根前端新增 `@tanstack/react-query` 和 `@playwright/test`。不得安装 Supabase JS SDK、ORM 或 Redis 客户端。

- [ ] **Step 4：实现最小服务与数据库事务边界**

  `DatabaseService.transaction` 必须从 pool 取得单一 client，并保证 release：

  ```ts
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const value = await work(client);
      await client.query("commit");
      return value;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  ```

- [ ] **Step 5：配置安全启动与 Render 蓝图**

  `main.ts` 设置 DTO whitelist/forbidNonWhitelisted、受控 CORS、cookie parser、1MB body 上限和 request ID。`render.yaml` 只声明环境变量名，不写值；健康检查指向 `/healthz`。前端 `.env.example` 只包含 `VITE_API_BASE_URL` 和 `VITE_CLOUD_FEATURES_ENABLED=false`。

- [ ] **Step 6：执行 Render/Supabase 连接探针**

  在隔离 staging 验证 Node 22 服务可通过 SSL 连接数据库、完成 `begin/set_config/rollback`、健康检查和自定义域配置路径。只记录平台、区域、延迟和脱敏连接类型，不记录凭据。

- [ ] **Step 7：验证并提交**

  执行 `npm test`、`npm run typecheck`、`npm run build:pages`、`npm --prefix server test`、`npm --prefix server run typecheck`、`npm --prefix server run build`；提交 `chore: scaffold NestJS API foundation`。

**回滚：** 前端云端开关默认关闭；删除未使用的 staging 服务不影响 v0.1.0。

### Task 2：版本化本地持久化与损坏隔离

**依赖：** Task 1；可与外部部署探针并行。

**文件：**
- 修改：`src/types/domain.ts`、`src/store/useWishTodayStore.ts`、`src/store/useWishTodayStore.test.ts`
- 修改：`src/pages/previewRecipeSteps.ts`
- 新建：`src/store/persistence/schema.ts`、`src/store/persistence/migrateV1ToV2.ts`
- 新建：`src/store/persistence/migrateV1ToV2.test.ts`、`src/store/persistence/storage.ts`、`src/store/persistence/storage.test.ts`
- 新建：`src/routes/pendingAction.ts`、`src/routes/pendingAction.test.ts`

**产出接口：** `PERSISTENCE_VERSION = 2`；`migrateV1ToV2(raw): V2PersistedState`；`createResilientStorage()`；`localLegacyRecipes`；`pendingAction?: PendingAction`；`persistenceAvailable`。

- [ ] **Step 1：写六类 fixture 红灯测试**

  覆盖完整 v0.1 状态、缺步骤配方、来源不可解析、单条损坏、重复迁移、localStorage 抛错；保存动作必须同时匹配 `draftId` 与 `saveIntentId`。

- [ ] **Step 2：运行红灯测试**

  执行 `npm test -- src/store/persistence src/routes/pendingAction.test.ts src/store/useWishTodayStore.test.ts`，预期新模块/字段缺失。

- [ ] **Step 3：实现稳定标识与迁移**

  首次迁移复制原值到 `wishtoday-flow-state-v1-backup`。为草稿补入 UUID `draftId`/`saveIntentId`；将 `savedRecipes` 逐条转换为 `localLegacyRecipes`，保留原 ID 为 `localRecordId`，缺步骤时使用 `resolvePreviewSteps` 或标记 `migrationSource: "v0.1-fallback"`。

- [ ] **Step 4：收窄持久化白名单**

  只持久化草稿、本地旧配方、待恢复动作、导入客户端标识和 schema 版本；移除模拟 `session`、`saveStatus`、`saveError` 和云端配方副本。`PendingAction` 默认 24 小时过期。

- [ ] **Step 5：实现存储降级**

  localStorage 不可用时切到内存，并设置 `persistenceAvailable=false`；不能白屏或声称刷新后可恢复。迁移本身不发网络请求。

- [ ] **Step 6：验证并提交**

  执行相关 Vitest、`npm run typecheck`、`npm run build:pages`；提交 `feat: migrate local flow state to v2`。

**回滚：** 永不自动删除 v1 backup；回滚版本不得覆盖备份。

### Task 3：账户数据库、注册验证与登录核心

**依赖：** Task 1。

**文件：**
- 新建：`supabase/migrations/202608130101_auth_accounts.sql`
- 新建：`supabase/migrations/202608130102_auth_tokens.sql`
- 新建：`supabase/migrations/202608130103_rate_limits.sql`
- 新建：`supabase/tests/auth_constraints.test.sql`
- 新建：`server/src/auth/*`、`server/src/mail/*`、`server/src/rate-limit/*`
- 新建：`server/test/auth-register-login.e2e-spec.ts`

**产出接口：** `POST /api/v1/auth/register`、`POST /api/v1/auth/verify-email`、`POST /api/v1/auth/resend-verification`、`POST /api/v1/auth/login`；`PasswordHasher`；`TokenHasher`；`MailPort`；`RateLimitService.consume(key, window, limit)`。

- [ ] **Step 1：先写数据库和 API 红灯测试**

  覆盖邮箱唯一、token 哈希唯一、过期/消费约束、`session_version > 0`、通用注册反馈、未验证账户拒绝、错误密码统一 `INVALID_CREDENTIALS`。API 断言响应不含 `passwordHash`、token 哈希或邮箱存在性。

- [ ] **Step 2：运行红灯测试**

  对隔离测试库运行 migrations tests，并执行 `npm --prefix server test -- auth-register-login`；预期表和模块不存在。

- [ ] **Step 3：实现账户 schema**

  创建 `users`、`password_credentials`、`account_security`、`auth_sessions`、`email_verification_tokens`、`password_reset_tokens`、`password_reset_operations`、`rate_limit_counters`。认证表权限只授予认证 repository 运行角色，不创建本人可读密码策略。

- [ ] **Step 4：实现密码与一次性 token 服务**

  Argon2id 哈希参数写入哈希编码；原始验证/恢复 token 用 `randomBytes(32)` 生成，数据库只存带 pepper 的 SHA-256 哈希。比较使用恒定时间函数。邮件通过：

  ```ts
  export interface MailPort {
    sendVerification(input: { to: string; link: string }): Promise<void>;
    sendPasswordRecovery(input: { to: string; link: string }): Promise<void>;
  }
  ```

- [ ] **Step 5：实现注册、验证与登录**

  注册与重发无论邮箱存在与否都返回通用结果；验证 token 原子消费；登录只允许已验证 active 用户，创建 Session 并签发 Access Token。所有 DTO 有邮箱、密码和字段长度上限。

- [ ] **Step 6：实现精确限流基础**

  用 `(subject_hash, window_kind, window_start)` 唯一键和原子 upsert 计数，在执行 Argon2/发邮件前消费额度。日志只记录 `requestId`、动作和不可逆主体哈希。

- [ ] **Step 7：验证并提交**

  运行服务端单元/API/数据库测试、typecheck 和 build；提交 `feat: add account registration and login core`。

**回滚：** 认证入口默认由功能开关关闭；schema 只新增，不删除历史数据。

### Task 4：会话轮换、当前设备退出与原子密码重置

**依赖：** Task 3。

**文件：**
- 新建：`server/src/sessions/*`、`server/src/account-recovery/*`
- 新建：`server/src/common/auth.guard.ts`、`server/src/common/csrf.guard.ts`
- 新建：`server/test/session-rotation.e2e-spec.ts`
- 新建：`server/test/password-reset-transaction.e2e-spec.ts`
- 新建：`server/test/password-reset-fault-injection.e2e-spec.ts`

**产出接口：** `POST /api/v1/auth/refresh`、`GET /api/v1/auth/me`、`POST /api/v1/auth/logout`、`POST /api/v1/auth/password-recovery`、`POST /api/v1/auth/password-reset`、`POST /api/v1/auth/password-reset-operations/{id}/status`；`AuthGuard`。

- [ ] **Step 1：写会话轮换红灯测试**

  覆盖两个设备独立 Session、Refresh 原子轮换、旧 token 重放撤销 family、当前设备退出不影响另一设备、Access Token 过期/issuer/audience/算法错误拒绝。

- [ ] **Step 2：写密码重置事务红灯测试**

  断言成功事务同时改变密码、`session_version + 1`、全部 Session `revoked_at`、token `used_at` 和 operation `completed`；同 operation 重试版本不再增加。

- [ ] **Step 3：写逐语句故障注入测试**

  在密码更新、版本递增、Session 撤销、token 消费、operation 完成前分别抛错；每次断言所有表保持事务前状态。响应丢失后以同一 recovery token 查询 `completed`。

- [ ] **Step 4：实现 Refresh Cookie 与 CSRF**

  Refresh Cookie 为 host-only、Secure、HttpOnly、SameSite=Lax；写 Cookie 接口校验允许 Origin 和双提交 CSRF token。Refresh 原值不进日志/响应 JSON，Access Token 只在 JSON 成功响应返回。

- [ ] **Step 5：实现每请求版本校验**

  `AuthGuard` 验证 RS256/issuer/audience/exp 后查询 Session 与 `account_security`；token `session_version` 不等于数据库值立即返回 `SESSION_REVOKED`。

- [ ] **Step 6：实现单事务重置**

  使用 `select ... for update` 锁 operation/token/user；完成密码、版本、Session 和终态更新。状态查询必须同时验证 operation ID 与同一 recovery token 哈希，只返回 `pending/completed/failed`。

- [ ] **Step 7：验证并提交**

  运行 `npm --prefix server test`、typecheck、build 和隔离数据库集成测试；提交 `feat: add rotating sessions and atomic password reset`。

**回滚：** 密码重置入口可独立关闭；不得回滚为旧令牌自然过期方案。

### Task 5：新架构认证安全硬门禁

**依赖：** Task 3、Task 4。

**文件：**
- 新建：`scripts/auth-gateway/capability-gate.mjs`
- 新建：`scripts/auth-gateway/capability-gate.test.mjs`
- 新建：`docs/technical-spikes/2026-08-13-nestjs-auth-gateway-capability-gate.md`
- 修改：`package.json`、`docs/development-process/06_implementation_log.md`

**产出接口：** `npm run probe:auth-gateway`；结论仅允许 `GO` 或 `NO-GO`。

- [ ] **Step 1：写门禁判定红灯测试**

  `evaluateGate(evidence)` 仅当七项证据全为 `pass` 返回 `GO`；缺失、跳过、`unknown` 或 `fail` 均返回 `NO-GO`。

- [ ] **Step 2：运行红灯测试并实现最小判定器**

  执行 `node --test scripts/auth-gateway/capability-gate.test.mjs`；先确认模块缺失失败，再实现纯判定函数并通过。

- [ ] **Step 3：执行双设备与故障注入**

  在隔离 staging 创建两个浏览器/HTTP Session，执行密码重置、旧 Access/Refresh 重放、响应丢失终态查询、当前设备退出和 Refresh family 重放。不得打印邮箱、密码、Cookie 或 token。

- [ ] **Step 4：执行并发限流与连接池隔离**

  并发越过 30/5min IP 与 3/hour 邮箱阈值，断言精确 `RATE_LIMITED`；并发交替两个用户和无用户事务，断言 RLS 上下文无泄漏。

- [ ] **Step 5：生成可审计报告**

  记录 commit、Node/NestJS/PostgreSQL 版本、Render/Supabase staging、脱敏测试标识、故障点、期望/实际结果和时间。任一失败写 `NO-GO` 并停止。

- [ ] **Step 6：验证并提交**

  执行 `npm run probe:auth-gateway`、探针单元测试、服务端全量测试。仅报告为 `GO` 才提交 `test: verify NestJS auth gateway capability gate` 并继续 Task 6；`NO-GO` 提交证据后返回 Task 20。

**回滚：** 探针只使用隔离账户和 staging；清除原始 token，保留脱敏报告。

### Task 6：私人数据 schema、事务用户上下文与 RLS

**依赖：** Task 5 = `GO`。

**文件：**
- 新建：`supabase/migrations/202608130104_private_recipes.sql`
- 新建：`supabase/migrations/202608130105_recipe_imports.sql`
- 新建：`supabase/migrations/202608130106_private_data_rls.sql`
- 新建：`supabase/tests/private_recipes_rls.test.sql`、`supabase/tests/import_idempotency.test.sql`
- 修改：`server/src/database/database.service.ts`
- 新建：`server/src/database/user-transaction.spec.ts`

**产出接口：** `private_recipes`、`recipe_import_batches`、`recipe_import_items`；`withUserTransaction<T>(userId, work)`。

- [ ] **Step 1：写 RLS/约束红灯测试**

  覆盖缺失上下文、非法 UUID、本人、其他账户、已知他人 ID、旧 `session_version`、连接复用和运行时角色直接查询。写并发唯一性测试验证保存与导入最多一条。

- [ ] **Step 2：运行红灯测试**

  对隔离数据库运行 SQL 与 `user-transaction.spec.ts`，预期表/策略未定义。

- [ ] **Step 3：建立私人数据与导入 schema**

  配方 JSONB 有结构/大小上限；创建 `(owner_id, save_intent_id)` 和 `(owner_id, local_record_id)` 部分唯一索引；导入批次/项目有状态、计数、租约和 payload 回收字段。

- [ ] **Step 4：实现强制 RLS 与用户事务**

  私人表 `enable row level security` 且 `force row level security`。`withUserTransaction` 只接受 Guard 验证后的 UUID，在同一事务执行：

  ```ts
  await client.query("select set_config('app.user_id', $1, true)", [userId]);
  ```

  策略读取 `nullif(current_setting('app.user_id', true), '')::uuid`；缺失时拒绝。

- [ ] **Step 5：验证连接池隔离**

  使用 pool size 2 并发交替至少 100 次两个用户与匿名事务；任何跨账户行或上下文残留即失败。

- [ ] **Step 6：验证并提交**

  运行数据库、服务端全量测试、typecheck/build；提交 `feat: add private data schema and RLS`。

**回滚：** 迁移扩展式新增；不删除成功数据或降低 RLS。

### Task 7：前端 API、认证状态与受保护动作

**依赖：** Task 2、Task 5 = `GO`、Task 6。

**文件：**
- 修改：`package.json`、`src/main.tsx`、`src/routes/AppRouter.tsx`、`src/routes/paths.ts`
- 新建：`src/app/AppProviders.tsx`、`src/app/AppProviders.test.tsx`
- 新建：`src/lib/api/apiClient.ts`、`src/lib/api/apiClient.test.ts`
- 新建：`src/services/api/types.ts`、`src/services/auth/authService.ts`、`src/services/auth/authService.test.ts`
- 新建：`src/services/auth/sessionStore.ts`、`src/services/auth/sessionStore.test.ts`
- 新建：`src/routes/RequireVerifiedSession.tsx`、`src/routes/authFragment.ts`、对应测试

**产出接口：** `apiRequest<T>()`；`register/login/refreshSession/logoutCurrentDevice/requestPasswordRecovery/resetPassword/getResetStatus`；`useSessionStore`。

- [ ] **Step 1：写 API 与会话红灯测试**

  覆盖 `credentials: "include"`、Bearer header、200ms pending 回调、10 秒 Abort、错误码映射、GET 两次重试/写请求零自动重试、Access Token 只在内存。

- [ ] **Step 2：写恢复与 fragment 红灯测试**

  应用启动 refresh 期间受保护页面显示加载；fragment 在首个同步步骤读取并 `replaceState` 清除，不写日志/localStorage；主动退出清除 `PendingAction`，自然过期登录保留有效动作。

- [ ] **Step 3：运行红灯测试**

  执行相关 Vitest，预期模块不存在。

- [ ] **Step 4：实现 Query/Session Provider**

  QueryClient 默认 query 最多重试两次，mutation 不自动重试。`useSessionStore` 不使用 persist；刷新成功只保存 `AuthSession` 内存值。

- [ ] **Step 5：实现 API 与保护路由**

  页面不直接 `fetch`；全部经 `apiRequest` 和 auth service。401/`SESSION_REVOKED` 清内存 Session、保留合规 PendingAction 并跳登录；公开核心链路不挂保护。

- [ ] **Step 6：验证并提交**

  运行前端全量测试、typecheck、Pages build；提交 `feat: connect frontend auth gateway services`。

**回滚：** 云端开关关闭时不启动认证恢复，公开 v0.1.0 链路保持可用。

### Task 8：幂等配方保存与只读查询 API

**依赖：** Task 6、Task 7。

**文件：**
- 新建：`server/src/recipes/*`、`server/test/recipes.e2e-spec.ts`
- 新建：`src/services/recipes/types.ts`、`src/services/recipes/recipeRepository.ts`
- 新建：`src/services/recipes/httpRecipeRepository.ts`、对应测试
- 新建：`src/queries/recipeKeys.ts`、`src/queries/useRecipes.ts`、`src/queries/useSaveRecipe.ts`
- 修改：`src/pages/PreviewRecipePage.tsx`、`src/pages/RecipeDetailPage.tsx`、对应测试

**产出接口：** `POST /api/v1/recipes`、`GET /api/v1/recipes`、`GET /api/v1/recipes/{id}`；`saveRecipe`、`listRecipes`、`getRecipe`；`recipeKeys`。

- [ ] **Step 1：写 API 红灯测试**

  覆盖重复点击、响应丢失原键重试、同键并发、其他账户已知 ID、无上下文 RLS、字段/JSONB 上限和每用户每分钟 20 次限流。

- [ ] **Step 2：写前端 Repository/页面红灯测试**

  未登录保存建立 `PendingAction`；成功清草稿并打开详情；超时保留草稿与同一 `saveIntentId`；详情 `NOT_FOUND` 不区分无权/不存在。

- [ ] **Step 3：实现服务端配方模块**

  owner 只来自 Guard；写入经 `withUserTransaction`，使用 `insert ... on conflict`/查询返回同一记录。列表按 `created_at desc, id desc` 有限分页；不创建 PATCH/DELETE。

- [ ] **Step 4：实现 TanStack Query 接线**

  `recipeKeys = { all, list(params), detail(id) }`；保存成功更新 detail 并失效 list，不能把云端列表复制进 Zustand。

- [ ] **Step 5：验证并提交**

  运行前后端/数据库测试、typecheck、build；提交 `feat: add idempotent private recipe API`。

**回滚：** 关闭保存入口，不删除已成功保存的记录。

### Task 9：本地配方主动导入、判重与恢复

**依赖：** Task 2、Task 6、Task 8。

**文件：**
- 新建：`server/src/imports/*`、`server/test/imports.e2e-spec.ts`
- 新建：`src/services/imports/types.ts`、`src/services/imports/importService.ts`
- 新建：`src/services/imports/httpImportService.ts`、对应测试
- 新建：`src/queries/importKeys.ts`、`src/queries/useRecipeImport.ts`
- 新建：`src/components/imports/ImportPromptSheet.tsx`、`ImportProgressNote.tsx`、对应测试

**产出接口：** `POST /api/v1/recipe-imports`、`GET /api/v1/recipe-imports/{clientBatchId}`、`POST /api/v1/recipe-imports/{clientBatchId}/retry`。

- [ ] **Step 1：写隐私与判重红灯测试**

  登录检测阶段网络正文上传次数必须为 0；只有“立即导入”发送正文。覆盖同账户重复、本账户不同 ID、不同账户相同 ID、单批 101 条拒绝。

- [ ] **Step 2：写租约/部分失败红灯测试**

  覆盖批次重放、处理租约过期转 `failed/INTERRUPTED`、成功/跳过清 payload、只重试失败项、计数总和等于 total。

- [ ] **Step 3：实现导入事务与恢复**

  相同 `clientBatchId` 返回已有批次；建立项目后原子领取有限租约，写结果时匹配 lease token。查询批次先回收过期租约，再返回失败 ID。

- [ ] **Step 4：实现前端明确选择流程**

  认证成功后显示待导入数量；“稍后处理”立即恢复原任务；导入中显示计数，可离开后再查询。无论结果都不删除 `localLegacyRecipes`。

- [ ] **Step 5：验证并提交**

  运行前后端/数据库测试、typecheck/build；提交 `feat: add explicit legacy recipe import`。

**回滚：** 关闭导入入口；保留本地记录、批次和成功云端记录。

### Task 10：账户索引签与完整认证页面

**依赖：** Task 7、Task 9。

**文件：**
- 修改：`src/components/AppShell.tsx`、`src/routes/AppRouter.tsx`、`src/styles/global.css`
- 修改：`src/pages/LoginPage.tsx`、`src/pages/RegisterPage.tsx`
- 新建：`src/components/account/AccountIndexTab.tsx`、`AccountMenuSheet.tsx`、对应测试
- 新建：`src/pages/auth/CheckEmailPage.tsx`、`VerifyEmailPage.tsx`
- 新建：`src/pages/auth/ForgotPasswordPage.tsx`、`ResetPasswordPage.tsx`、对应测试

**产出页面：** 注册、查收邮件、验证结果、登录、忘记密码、重置密码；账户索引签菜单。

- [ ] **Step 1：写页面状态红灯测试**

  每页覆盖 idle、200ms pending、success、validation、通用失败、10 秒超时和重复提交保护；注册/找回不暴露邮箱存在性。

- [ ] **Step 2：写账户入口与焦点红灯测试**

  游客显示“登录/注册”，已登录显示“私人笔记本/退出”；索引签使用 button、`aria-expanded`，菜单打开移入焦点、Escape 关闭并归还焦点。

- [ ] **Step 3：实现页面与原任务回跳**

  注册成功去查收邮件；验证成功去登录；登录成功按“导入选择 -> PendingAction”顺序恢复；重置成功清 Session 并要求重新登录。

- [ ] **Step 4：实现沉浸式样式**

  复用纸张、墨色、索引签和既有控件；手机端不增加顶栏/底栏，不嵌套卡片，不让账户入口覆盖正文。最长中文/邮箱错误在 320px 至桌面宽度不溢出。

- [ ] **Step 5：验证并提交**

  运行页面/布局测试、typecheck、Pages build；用 Playwright 截图 394x932、698x706 和桌面宽度检查无重叠；提交 `feat: add notebook account and auth chapters`。

**回滚：** 云端开关关闭时隐藏账户索引签，保留原公开书页。

### Task 11：云端私人笔记本状态与跨设备读取

**依赖：** Task 8、Task 9、Task 10。

**文件：**
- 修改：`src/pages/NotebookPage.tsx`、`src/pages/RecipeDetailPage.tsx`、对应测试
- 修改：`src/styles/global.css`
- 新建：`src/components/notebook/NotebookLoadingPage.tsx`、`NotebookEmptyPage.tsx`、`NotebookErrorPage.tsx`

**产出：** 云端列表/详情、加载/空/失败/超时/会话失效状态、前台刷新和跨设备读取。

- [ ] **Step 1：写状态语义红灯测试**

  认证恢复未完成不显示空页；真实空才显示空；网络失败可重试；超时保留页面；会话失效去登录并保存 `openNotebook/openRecipe`；无权和不存在统一安全页。

- [ ] **Step 2：写跨设备与排序红灯测试**

  设备 A 保存后设备 B 重新进入/回前台可见；列表按 `createdAt desc, id desc`；详情为只读且无编辑/删除入口。

- [ ] **Step 3：实现查询驱动页面**

  页面只读 TanStack Query；窗口从 hidden 转 visible 时失效 notebook list。导入完成只失效列表，不复制云端数据到 store。

- [ ] **Step 4：验证视觉与可访问性**

  保持“整屏即书页”，状态文案使用 live region，重试按钮可键盘操作；窄屏、200% 缩放和减少动态效果无内容遮挡。

- [ ] **Step 5：验证并提交**

  运行前端全量测试、typecheck、Pages build 和关键截图；提交 `feat: connect cloud notebook states`。

**回滚：** 关闭云端入口后回到 v0.1.0 本地体验，不删除本地或云端数据。

### Task 12：端到端、安全、可访问性与范围回归

**依赖：** Task 2 至 Task 11。

**文件：**
- 新建：`playwright.config.ts`
- 新建：`e2e/auth.spec.ts`、`e2e/password-reset.spec.ts`、`e2e/save-and-notebook.spec.ts`
- 新建：`e2e/import.spec.ts`、`e2e/security.spec.ts`、`e2e/accessibility.spec.ts`、`e2e/scope-regression.spec.ts`
- 修改：`docs/development-process/06_implementation_log.md`

**产出：** 可重复的真实浏览器验收套件与脱敏证据。

- [ ] **Step 1：建立隔离 E2E fixture**

  每次运行生成两个随机测试账户，通过 MailPort 测试收件箱读取验证/恢复链接；cleanup 只删除带本次 run ID 的测试数据。失败附件过滤 URL fragment、Cookie、Authorization 和表单密码。

- [ ] **Step 2：实现核心 E2E**

  覆盖注册验证、登录恢复、游客保存回跳、双设备跨读、当前设备退出、密码重置全旧会话失效、丢响应终态查询、本地主动导入和失败项重试。

- [ ] **Step 3：实现安全回归**

  覆盖跨账户已知 ID、伪造 owner、缺失数据库上下文、非法 JWT、Refresh 重放、CSRF/CORS、fragment 清除、日志/trace 无秘密和精确限流。

- [ ] **Step 4：实现可访问性与性能门禁**

  键盘完整操作、焦点归还、live region、200% 缩放、394x932/698x706/桌面、reduced motion；健康网络下认证后笔记本首屏 P95 目标 3 秒，并记录环境。

- [ ] **Step 5：实现范围回归**

  断言没有社区、摇一摇、发布、收藏、编辑/删除、搜索/筛选、经典鸡尾酒库、传统手机顶栏/底栏；游客原核心链路继续通过。

- [ ] **Step 6：验证并提交**

  执行前后端全量测试、数据库测试、`npx playwright test`、typecheck 和 builds；提交 `test: cover v0.2.0 account and notebook flows`。

**回滚：** 测试只操作隔离环境，禁止对 production 执行清理 fixture。

### Task 13：CI、部署门禁、观测与发布准备

**依赖：** Task 12 全绿。

**文件：**
- 修改：`.github/workflows/deploy-pages.yml`
- 新建：`.github/workflows/verify-api.yml`
- 新建：`scripts/deployment/check-v020-config.mjs`、对应测试
- 新建：`scripts/deployment/smoke-v020.mjs`
- 修改：`render.yaml`、`README.md`
- 修改：`docs/development-process/06_implementation_log.md`

**产出：** 前后端 CI、staging/production 发布门禁、健康检查、冒烟与回滚说明；不在本任务直接发布 v0.2.0。

- [ ] **Step 1：写部署配置红灯测试**

  校验 Pages custom domain、API base URL、同站子域、HTTPS、允许 Origin、Cookie 配置、数据库/JWT/Resend Secrets 名称、健康检查、云端开关默认关闭；禁止通配 CORS、`VITE_*` 服务密钥和 Supabase Auth URL。

- [ ] **Step 2：拆分 CI**

  Pages job 执行前端 test/typecheck/build；API job 执行 `npm ci --prefix server`、test/typecheck/build 和迁移静态检查。需要真实 Secrets 的 staging 集成测试只在受保护环境运行。

- [ ] **Step 3：配置部署顺序与功能开关**

  固定 `staging DB -> staging API -> staging web -> production DB -> production API -> production web -> smoke -> enable flag`。任何一步失败停止，不把浏览器切到直连数据库。

- [ ] **Step 4：配置最小观测与脱敏**

  指标包含认证成功/失败/限流、Refresh 重放、密码重置终态、保存/导入延迟、RLS 拒绝、DB pool 与 API 5xx；日志抽样测试拒绝邮箱全文、token、Cookie、密码和配方正文。

- [ ] **Step 5：执行 staging 与 production-ready 冒烟**

  staging 真实运行注册到跨设备笔记本全链路。production 只在自定义域、数据库备份和回滚演练完成后运行只读健康/公开链路检查；账户功能仍保持关闭，等待发布任务。

- [ ] **Step 6：验证并提交**

  执行所有 test/typecheck/build、部署检查和 staging E2E；提交 `chore: prepare v0.2.0 deployment gates`。

**回滚：** API 回滚上一镜像，Pages 回滚上一 artifact，数据库仅向前修复；功能开关关闭时保留 v0.1.0。

## 需求追踪

| 需求 | 实施任务 | 验证证据 |
| --- | --- | --- |
| AUTH-01 | Task 3、7、10、12 | 注册 API/页面、通用反馈、重复提交和真实邮件 E2E |
| AUTH-02 | Task 3、7、10、12 | 一次性验证 token、未验证拒绝、重发限流与 fragment 清除 |
| AUTH-03 | Task 4、5、7、10、12 | Session 轮换、多设备、当前设备退出、恢复与重放检测 |
| AUTH-04 | Task 4、5、7、10、12 | 单事务重置、operation 终态、旧 Access/Refresh 立即失效 |
| FLOW-01 | Task 2、7、8、10、12 | 游客链路、草稿、24 小时 PendingAction 和认证回跳 |
| RECIPE-01 | Task 6、8、12 | 所有权、唯一约束、并发/丢响应幂等与超时恢复 |
| RECIPE-02 | Task 6、8、11、12 | 倒序列表、跨设备读取、状态区分和只读详情 |
| IMPORT-01 | Task 2、9、10、11、12 | 明确同意前零正文上传、稍后处理和本地保留 |
| IMPORT-02 | Task 6、9、12 | 账户 + 本地记录 ID、逐项计数、部分失败和仅失败重试 |
| ERROR-01 | Task 1、3 至 13 | 200ms 反馈、3 秒目标、10 秒超时、稳定错误码与恢复 |

## 总体验证矩阵

| 领域 | 自动化 | 人工/环境证据 |
| --- | --- | --- |
| 注册与验证 | Nest API + 页面 + Playwright | Resend staging 投递和真实回调 |
| 会话与退出 | 双 Session API/E2E | 前后台切换与 Cookie 检查 |
| 密码重置 | 事务/故障注入 + 双设备 E2E | Task 5 `GO` 报告 |
| 私人数据隔离 | SQL RLS + API 越权测试 | 连接池隔离探针 |
| 保存幂等 | 并发/丢响应测试 | 网络中断恢复 |
| 本地导入 | fixture + API + E2E | 用户明确确认与本地保留 |
| 响应式/可访问性 | 页面测试 + Playwright | 394x932、698x706、桌面截图 |
| 部署 | CI + config check + smoke | 自定义域、备份、回滚演练 |

## 每任务通用完成规则

每个 Task 均须：

1. 先写可观察失败的测试并记录红灯原因。
2. 只实现通过该任务验收所需的最小代码。
3. 运行任务局部测试及受影响的全量 test/typecheck/build。
4. 检查 `git diff --check`、秘密、日志字段、RLS/所有权、范围和无关文件。
5. 更新 `docs/development-process/06_implementation_log.md`，记录命令、结果、偏离与回滚点。
6. 独立提交；不得把多个任务压成一个不可审查提交。

## 停止条件

立即停止并返回技术设计或计划阶段：

- Task 5 任一硬能力不是 `PASS`。
- 密码重置无法在单事务内完成或旧 Access/Refresh Token 不能立即失效。
- 数据库用户上下文在连接池请求间可能泄漏。
- Render/Supabase PostgreSQL 组合无法满足事务、健康检查或可靠连接要求。
- production 无法配置前端/API 同一可注册域，且账户入口会依赖第三方 Cookie。
- 实现要求加入 Redis、对象存储、管理后台、社区或其他未签收范围。
- 需要静默上传本地配方、删除本地记录或暴露账户存在性才能继续。

## 计划级回滚

- 所有云端入口默认关闭；任何阶段可关闭开关回到 v0.1.0 公开链路。
- 数据库只做扩展式迁移，不在 v0.2.0 发布窗口破坏性删除。
- 保留 `wishtoday-flow-state-v1-backup`，不自动清理本地或云端成功记录。
- API/邮件故障时暂停相应入口，不允许浏览器绕过网关直连数据库。
- Task 5 `NO-GO` 时保留探针证据，停止后续实现并返回 Task 20。

## 交付物

- 修订后的 `docs/development-process/05_implementation_plan.md`
- 更新后的 `docs/development-process/00_process_index.md`

## 完成标准

- [x] 原 Supabase Auth `NO-GO` 与废止前提已记录。
- [x] NestJS/PostgreSQL 文件结构、模块、接口与固定依赖已定义。
- [x] 13 个任务的依赖、测试、提交和回滚边界已定义。
- [x] 新架构认证安全 Go/No-Go 门禁已置于私人数据实现之前。
- [x] AUTH-01 至 ERROR-01 均可追踪到任务和证据。
- [x] 部署、自定义域、邮件、限流、RLS、观测和回滚已纳入计划。
- [x] v0.2.0 非目标未回流。
- [x] 用户已于 2026-08-13 书面签收本次 Task 21 修订。

## 开放问题

计划不存在产品范围阻塞项。以下是执行阶段必须由证据关闭的环境项：

- Render、Supabase PostgreSQL staging/production、Resend 和 production 自定义域尚未创建或配置。
- Task 1 必须验证 Render 到 Supabase PostgreSQL 的 SSL、事务级 `set_config`、延迟和健康检查。
- Task 1 的 Argon2id 基准必须在目标 Render 实例上固定参数，兼顾安全与登录延迟。
- Task 5 必须取得新架构七项硬能力 `GO`，否则后续私人数据实现继续阻塞。

## 给下一角色的交接

本修订计划已由用户于 2026-08-13 书面签收。下一角色为实现工程师，继续阶段 06，并在现有隔离分支按 Task 1 至 Task 13 顺序执行。首个实现任务是 **Task 1：NestJS、PostgreSQL 与部署工程基线**，不是继续原 Supabase Auth 探针。

执行者每完成一个 Task 即更新实施日志、验证证据和偏离说明。Task 5 报告为 `GO` 前，不得开始 Task 6 或任何私人配方/导入实现。
