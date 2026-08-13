# 05 WishToday v0.2.0 实施计划

> **给执行代理：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行；使用复选框逐步记录进度。除 Task 1 明确得到 `GO` 外，不得开始 Task 4 及之后的云端实现。

状态：已由用户书面签收，可交接到阶段 06 实现
负责角色：工程计划员
日期：2026-08-13

**目标：** 在不破坏 v0.1.0 核心链路与沉浸式笔记本视觉的前提下，实现真实邮箱账户、云端私人笔记本、幂等保存、跨设备读取和本地配方主动导入。

**架构：** 保留 React 19、TypeScript、Vite、React Router、Zustand 和 GitHub Pages；新增 Supabase Auth、PostgreSQL、RLS、Edge Functions 与 TanStack Query。Zustand 仅管理本地草稿、旧配方和待恢复动作，服务端状态全部由 Service/Repository 合约与 TanStack Query 管理。

**技术栈：** React 19、TypeScript 5.8、Vite 7、React Router 7、Zustand 5、Vitest 3、Supabase、TanStack Query、Playwright、GitHub Actions/Pages。

## 输入

- `docs/development-process/00_process_index.md`
- `docs/development-process/01_project_brief.md`
- `docs/development-process/02_requirements_spec.md`
- `docs/development-process/03_design_spec.md`
- `docs/development-process/04_technical_design.md`
- 当前 React/Vite 仓库、测试、GitHub Pages 与 Actions 配置

## 范围

本阶段只把已签收设计拆成有序、可测试、可回滚的实施任务，定义文件职责、跨任务接口、验证命令、停止条件和提交边界。本阶段不编写业务代码，不创建 Supabase 项目，不部署环境。

## 全局约束

- v0.2.0 唯一目标是“真实账户与云端私人笔记本”。
- 游客必须继续完成“今日推荐 -> 详情 -> 实验台 -> 预览”，仅保存和私人数据访问要求登录。
- 手机端保持“整屏即书页”，账户入口使用右侧书页索引签；不得添加传统顶栏或底部导航。
- 本地配方只有用户点击“立即导入”后才能上传；稍后处理、成功或失败均不得删除本地记录。
- 私人配方只能创建和只读；不得增加编辑、删除、分享、发布、收藏、搜索或筛选。
- 不加入社区、摇一摇、个人资料、账户中心、手机号/第三方登录、经典鸡尾酒配方库。
- 不引入 Flutter、NestJS、Redis、对象存储或管理后台。
- 所有写入必须幂等；私人请求必须由服务端所有权校验和 RLS 保护。
- 密码、验证/重置令牌、Refresh Token、`service_role` 和私人配方正文不得进入业务日志或 Zustand 持久化。
- 网络操作 200ms 后显示处理中，10 秒后进入可恢复超时；写请求不得无幂等键盲重试。
- 每个实现任务采用测试先行，相关测试、类型检查与构建通过后独立提交。

## Go/No-Go 门禁

Task 1 是硬性前置门禁。执行者必须同时取得官方契约证据和故障注入结果，证明选定认证实现能够满足：

1. 服务端可信识别 recovery 会话并换取短期、一次性续执行能力。
2. Custom Access Token Hook 可写入邮箱验证、`session_version` 和账户安全状态。
3. 旧 Access Token 可由 RLS 的数据库版本比较立即拒绝。
4. 密码更新后可全局撤销既有 Refresh Token。
5. 密码更新外部调用支持服务端幂等键，或提供可契约性查询的终局状态；不得用超时、租约过期或实测行为猜测结果。

五项全部满足才记录 `GO`。任一项不满足即记录 `NO-GO`，停止 Task 4 及之后工作，回到技术设计阶段选择具备该保证的认证边界。不得降低“密码重置后全部旧会话立即失效”的验收标准。

## 文件与模块规划

```text
src/
├─ app/AppProviders.tsx                  # QueryClient、认证会话启动
├─ lib/config/env.ts                     # 浏览器环境变量校验
├─ lib/supabase/client.ts                # 唯一浏览器 Supabase 客户端
├─ services/api/types.ts                 # ApiResult 与稳定错误码
├─ services/auth/                        # Auth SDK 封装与重置流程
├─ services/recipes/                     # 配方 Repository 合约及 Supabase 实现
├─ services/imports/                     # 导入批次合约及 Supabase 实现
├─ queries/                              # Query keys、查询和 mutation hooks
├─ store/persistence/                    # v0.1 -> v0.2 迁移与存储探测
├─ routes/                               # PendingAction、保护路由与回调入口
├─ components/account/                   # 账户索引签与菜单
├─ components/imports/                   # 主动导入便笺流程
└─ pages/auth/                           # 注册、验证、登录和重置章节

supabase/
├─ config.toml
├─ migrations/                           # 表、约束、RLS、Hook 与数据库函数
├─ functions/_shared/                    # 鉴权、CORS、错误和日志工具
├─ functions/save-recipe/
├─ functions/import-recipes/
├─ functions/get-import-batch/
├─ functions/retry-recipe-import/
├─ functions/complete-password-reset/
└─ tests/                                # pgTAP/RLS/幂等集成测试

e2e/                                     # Playwright 双账户、多上下文与 Pages 回调
scripts/supabase/                        # 能力门禁和 staging 冒烟探针
docs/technical-spikes/                   # Task 1 的可审计 Go/No-Go 证据
```

现有 `src/pages/*`、`src/store/useWishTodayStore.ts`、`src/styles/global.css` 只做计划内接线。不得先行重构 5,000 行样式表或重写 v0.1.0 页面。

## 共享接口

以下名称在所有任务中保持一致：

```ts
export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "EMAIL_UNVERIFIED"
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

export type PendingAction =
  | {
      kind: "saveRecipe";
      draftId: string;
      saveIntentId: string;
      expiresAt: string;
    }
  | { kind: "openNotebook"; expiresAt: string }
  | { kind: "openRecipe"; recipeId: string; expiresAt: string };

export type ImportItemStatus =
  | "pending"
  | "processing"
  | "imported"
  | "skipped"
  | "failed";
```

稳定标识统一使用 `draftId`、`saveIntentId`、`localRecordId`、`clientBatchId`；数据库列使用对应 snake_case。`PendingAction` 只允许上面三种白名单，不接受任意 URL；创建时默认 24 小时后过期，保存动作必须同时匹配仍存在的 `draftId` 与原 `saveIntentId`。

## 依赖顺序

```text
Task 1 GO
  -> Task 2 工程基线
  -> Task 3 本地迁移
  -> Task 4 数据库与 RLS
  -> Task 5 认证与会话
  -> Task 6 密码重置全局失效
  -> Task 7 云端保存与只读查询
  -> Task 8 本地主动导入
  -> Task 9 账户与认证界面
  -> Task 10 私人笔记本界面
  -> Task 11 E2E、可访问性与范围回归
  -> Task 12 CI、部署门禁与发布准备
```

Task 3 可在 Task 1 证据收集期间独立开发，但不得合并到发布分支绕过 `NO-GO`；其余任务按上图顺序执行。

---

### Task 1：Supabase 认证能力硬门禁

**需求覆盖：** AUTH-02、AUTH-03、AUTH-04、安全与会话全局失效。

**文件：**
- 新建：`scripts/supabase/auth-capability-probe.mjs`
- 新建：`scripts/supabase/auth-capability-probe.test.mjs`
- 新建：`docs/technical-spikes/2026-08-13-supabase-auth-capability-gate.md`
- 修改：`package.json`

**产出接口：** `npm run probe:supabase-auth`；报告结论必须是 `GO` 或 `NO-GO`，并记录 Supabase 产品版本、官方文档 URL、原文摘录、探针环境、故障注入结果和证据时间。报告还必须记录 Auth 限流与 CAPTCHA 的可配置能力；若无法满足已签收阈值，Task 5 在受控认证入口或独立认证网关方案通过审阅前不得开始。

- [x] **Step 1：先写探针契约测试**

  测试 `evaluateCapabilityGate(evidence)` 仅在五项证据均为 `contractual-and-observed` 时返回 `GO`；任何 `observed-only`、`unsupported` 或 `unknown` 均返回 `NO-GO`。

- [x] **Step 2：运行红灯测试**

  执行 `node --test scripts/supabase/auth-capability-probe.test.mjs`，预期因探针模块尚不存在而失败。

- [ ] **Step 3：实现最小探针并执行 staging 故障注入**

  使用隔离测试账户验证 recovery、Hook claim、旧 Access Token 的 RLS 拒绝、Refresh Token 全局撤销和密码更新未知结果。探针只输出脱敏用户哈希、能力名和状态，不打印邮箱、密码或令牌。

  阻塞记录（2026-08-13）：最小探针已实现；当前没有 Supabase staging 项目、凭据、CLI 或可用本地容器，因此故障注入未执行，所有需观测项保持 `unknown`。

- [x] **Step 4：完成契约证据审阅**

  行为测试通过但官方契约未承诺幂等键或可查询终态时仍必须写 `NO-GO`。同时验证密码登录/令牌端点每 IP 每 5 分钟最多 30 次、注册/验证/重置邮件每目标地址每小时最多 3 封及 CAPTCHA 能力；平台不支持时记录受控认证入口的阻塞决策。报告须明确“可继续 Task 4”或“返回 Task 20 改选认证实现”。

- [x] **Step 5：验证并提交**

  执行 `npm run probe:supabase-auth` 和 `node --test scripts/supabase/auth-capability-probe.test.mjs`；提交 `test: verify Supabase auth capability gate`。结论为 `NO-GO` 时在此停止，不创建后续云端功能提交。

**回滚：** 探针只使用隔离账户；执行后删除隔离账户与测试数据，不改生产配置。

### Task 2：工程依赖、环境与 Provider 基线

**依赖：** Task 1 = `GO`。

**文件：**
- 修改：`package.json`、`package-lock.json`、`.gitignore`、`src/main.tsx`
- 新建：`.env.example`、`src/lib/config/env.ts`、`src/lib/config/env.test.ts`
- 新建：`src/lib/supabase/client.ts`、`src/app/AppProviders.tsx`、`src/app/AppProviders.test.tsx`

**产出接口：** `getPublicEnv(): { supabaseUrl: string; supabaseAnonKey: string; cloudFeaturesEnabled: boolean }`；`getSupabaseClient()`；`AppProviders`。

- [ ] 写失败测试，覆盖缺少 URL/匿名公钥时生产构建失败、云端开关关闭时不创建客户端、测试环境可注入配置。
- [ ] 运行 `npm test -- src/lib/config/env.test.ts src/app/AppProviders.test.tsx`，确认红灯。
- [ ] 安装固定版本的 `@supabase/supabase-js`、`@tanstack/react-query`，开发依赖加入 `@playwright/test` 与 Supabase CLI；不得加入后置技术栈。
- [ ] 实现环境校验、单例 Supabase 客户端、QueryClient 默认 GET 最多重试两次/写请求不自动重试，并在 `main.tsx` 包裹 `AppProviders`。
- [ ] 更新 `.env.example`，只列 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_CLOUD_FEATURES_ENABLED=false`；服务端密钥不得使用 `VITE_` 前缀。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build:pages`；提交 `chore: add Supabase and query foundation`。

**回滚：** 功能开关默认关闭；回滚 Provider 后 v0.1.0 mock 链路仍可运行。

### Task 3：版本化本地持久化与损坏隔离

**依赖：** 可与 Task 1 并行准备；进入云端集成前必须完成。

**文件：**
- 修改：`src/types/domain.ts`、`src/store/useWishTodayStore.ts`、`src/store/useWishTodayStore.test.ts`
- 新建：`src/store/persistence/schema.ts`、`src/store/persistence/migrateV1ToV2.ts`
- 新建：`src/store/persistence/migrateV1ToV2.test.ts`、`src/store/persistence/storage.ts`、`src/store/persistence/storage.test.ts`
- 修改：`src/pages/previewRecipeSteps.ts`

**产出接口：** `PERSISTENCE_VERSION = 2`；`migrateV1ToV2(raw): V2PersistedState`；`createResilientStorage()`；`DiyDraft.draftId`、`DiyDraft.saveIntentId`；`localLegacyRecipes`；`pendingAction?: PendingAction`；`persistenceAvailable`。

- [ ] 先写 fixture 测试：完整 v0.1 状态、缺步骤配方、来源不可解析、单条损坏、重复迁移、无 localStorage 六类场景。
- [ ] 运行 `npm test -- src/store/persistence src/store/useWishTodayStore.test.ts`，确认新断言失败。
- [ ] 首次迁移先复制原值到 `wishtoday-flow-state-v1-backup`；将 `savedRecipes` 逐条转换为带 `localRecordId` 的只读记录，并使用 `resolvePreviewSteps` 或明确的 `v0.1-fallback` 步骤。
- [ ] 从持久化白名单移除模拟 `session`、`saveStatus`、`saveError` 和云端列表；仅在草稿及其 `saveIntentId` 可验证时，把旧 `redirectAction` 转成默认 24 小时有效的 `PendingAction`，否则安全丢弃。
- [ ] localStorage 不可用时切换内存存储并暴露 `persistenceAvailable=false`，不得抛出导致应用白屏。
- [ ] 运行相关测试、`npm run typecheck`、`npm run build`；提交 `feat: migrate local flow state to v2`。

**回滚：** 永不自动删除 `wishtoday-flow-state-v1-backup`；回滚前端不得覆盖该备份。

### Task 4：PostgreSQL schema、数据库函数与 RLS

**依赖：** Task 1 = `GO`，Task 2 完成。

**文件：**
- 新建：`supabase/config.toml`
- 新建：`supabase/migrations/202608130001_account_security.sql`
- 新建：`supabase/migrations/202608130002_private_recipes.sql`
- 新建：`supabase/migrations/202608130003_recipe_imports.sql`
- 新建：`supabase/migrations/202608130004_rls_and_auth_hook.sql`
- 新建：`supabase/tests/account_security.test.sql`、`supabase/tests/private_recipes_rls.test.sql`、`supabase/tests/import_idempotency.test.sql`

**产出接口：** `account_security`、`private_recipes`、`recipe_import_batches`、`recipe_import_items`；JWT Hook；只允许本人读取的 RLS；保存与导入唯一约束。

- [ ] 先写 pgTAP 红灯测试，覆盖本人、其他账户、未验证邮箱、旧 `session_version`、`revocation_pending`、匿名用户和缺失安全行。
- [ ] 执行 `supabase db reset && supabase test db`，确认表/策略未定义导致失败。
- [ ] 按技术设计建立字段、JSONB 校验、部分唯一索引、导入租约约束、触发器回填与默认拒绝 RLS；客户端不得直接更新 `account_security`。
- [ ] 添加并发测试，证明相同 `(owner_id, save_intent_id)` 和 `(owner_id, local_record_id)` 最多一条记录。
- [ ] 再次执行 `supabase db reset`、`supabase test db`；用两个测试用户手动验证其他账户已知 ID 返回零行。
- [ ] 提交 `feat: add private recipe schema and RLS`。

**回滚：** 迁移采用扩展式新增；不得在 v0.2.0 发布窗口删除旧列或成功写入的数据。

### Task 5：认证 Service、会话恢复与受保护动作

**依赖：** Task 2、Task 3、Task 4。

**文件：**
- 新建：`src/services/api/types.ts`、`src/services/api/errorMapping.ts`、`src/services/api/errorMapping.test.ts`
- 新建：`src/services/auth/authService.ts`、`src/services/auth/authService.test.ts`
- 新建：`src/services/auth/sessionService.ts`、`src/services/auth/sessionService.test.ts`
- 新建：`src/routes/pendingAction.ts`、`src/routes/pendingAction.test.ts`、`src/routes/RequireVerifiedSession.tsx`
- 修改：`src/app/AppProviders.tsx`、`src/routes/paths.ts`、`src/routes/AppRouter.tsx`

**产出接口：** `signUp`、`signIn`、`signOutCurrentDevice`、`resendVerification`、`requestPasswordReset`、`verifyEmailToken`、`restoreSession`；`setPendingAction`、`consumePendingAction`。

- [ ] 写失败测试，覆盖邮箱规范化、通用登录/找回反馈、未验证邮箱、当前设备退出、会话恢复、24 小时过期/非法 PendingAction、保存动作的草稿与 `saveIntentId` 匹配，以及公开页面不中断。
- [ ] 运行上述 Vitest 文件，确认红灯。
- [ ] 封装 Supabase Auth SDK，统一返回 `ApiResult`；Zustand 不保存 Access/Refresh Token，页面不得直接调用 Supabase。
- [ ] 实现认证状态监听和保护路由：私人操作失效时记录白名单动作并去登录，主动退出时清除待自动执行动作。
- [ ] 验证同一账户两个浏览器上下文可并行登录，单设备退出不影响另一个上下文。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build:pages`；提交 `feat: add verified auth session services`。

**回滚：** 关闭云端开关后不挂载保护逻辑，保留公开 v0.1.0 链路。

### Task 6：密码重置失败关闭状态机

**依赖：** Task 1 对密码终态与全局撤销明确 `GO`，Task 4、Task 5。

**文件：**
- 新建：`supabase/functions/complete-password-reset/index.ts`
- 新建：`supabase/functions/_shared/authGuard.ts`、`supabase/functions/_shared/apiResponse.ts`、`supabase/functions/_shared/safeLog.ts`
- 新建：`supabase/tests/password_reset_state_machine.test.sql`
- 新建：`src/services/auth/passwordResetService.ts`、`src/services/auth/passwordResetService.test.ts`
- 新建：`src/routes/authFragment.ts`、`src/routes/authFragment.test.ts`

**产出接口：** `consumeAuthFragment()`；`exchangeRecoveryForContinuation()`；`completePasswordReset(newPassword)`；服务端 operation ID + lease + expected stage CAS/fencing。

- [ ] 写失败测试覆盖 `locked -> password_updated -> tokens_revoked -> completed`、重复请求、worker lease 竞争、每阶段中断、外部结果未知、迟到 worker 和 continuation 过期。
- [ ] 写 fragment 测试，证明初始化首个同步步骤读取后立即 `history.replaceState`，且不写日志、分析、剪贴板或持久化。
- [ ] 运行单元与数据库测试，确认红灯。
- [ ] 实现一次性 continuation、排他 Auth 调用、CAS/fencing 和失败关闭；`external_result_unknown` 只能依据 Task 1 已验证的契约终态恢复。
- [ ] 用两个设备会话执行 staging 测试：重置后旧 Access Token 被 RLS 立即拒绝，旧 Refresh Token 无法刷新，新密码可重新登录。
- [ ] 运行 `npm test`、`supabase test db` 和 Edge Function 集成测试；提交 `feat: add fail-closed password reset`。

**回滚：** 故障时关闭重置入口并保持账户失败关闭；不得把 `security_status` 人工改回 `active` 以绕过未知结果。

### Task 7：幂等云端保存与只读配方查询

**依赖：** Task 4、Task 5。

**文件：**
- 新建：`supabase/functions/save-recipe/index.ts`
- 新建：`src/services/recipes/types.ts`、`src/services/recipes/recipeRepository.ts`
- 新建：`src/services/recipes/supabaseRecipeRepository.ts`、`src/services/recipes/supabaseRecipeRepository.test.ts`
- 新建：`src/queries/recipeKeys.ts`、`src/queries/useRecipes.ts`、`src/queries/useSaveRecipe.ts`
- 修改：`src/pages/PreviewRecipePage.tsx`、`src/pages/RecipeDetailPage.tsx`
- 新建/修改：对应页面测试

**产出接口：** `saveRecipe({ draft, saveIntentId })`、`listRecipes(cursor?)`、`getRecipe(id)`；query keys `recipeKeys.all/list/detail`。

- [ ] 写失败测试覆盖重复点击、响应丢失后原键重试、同键并发、内容编辑生成新键、其他账户已知 ID、超时保留草稿。
- [ ] 运行 Service、Query 和页面测试，确认红灯。
- [ ] Edge Function 从 JWT 获取 owner，校验字段并以唯一约束原子插入或返回既有记录；实施每用户每分钟 20 次的服务端限流，返回通用 `RATE_LIMITED` 与 `retryAfter`；错误响应不得带 SQL、堆栈或正文。
- [ ] 用 TanStack Query 接线列表、详情和保存；保存成功更新列表顶部，失败/超时保留 `draftId` 与 `saveIntentId`。
- [ ] 私人详情保持只读，不添加编辑、删除、收藏、分享或发布。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build:pages` 和保存/RLS 集成测试；提交 `feat: save and read private recipes`。

**回滚：** 关闭保存入口并保留本地草稿与幂等键；不得删除已成功保存的云端记录。

### Task 8：本地配方主动导入、判重与恢复

**依赖：** Task 3、Task 4、Task 5、Task 7。

**文件：**
- 新建：`supabase/functions/import-recipes/index.ts`
- 新建：`supabase/functions/get-import-batch/index.ts`
- 新建：`supabase/functions/retry-recipe-import/index.ts`
- 新建：`src/services/imports/types.ts`、`src/services/imports/importRepository.ts`
- 新建：`src/services/imports/supabaseImportRepository.ts`、`src/services/imports/supabaseImportRepository.test.ts`
- 新建：`src/queries/importKeys.ts`、`src/queries/useRecipeImport.ts`
- 新建：`src/components/imports/LocalRecipeImportDialog.tsx`、`src/components/imports/LocalRecipeImportDialog.test.tsx`

**产出接口：** `startOrResumeImport(clientBatchId, items)`、`getImportBatch(clientBatchId)`、`retryFailedItems(clientBatchId, localRecordIds)`。

- [ ] 写失败测试覆盖确认前零网络正文、稍后处理、同账户跳过、不同账户分别导入、部分失败、只重试失败项、响应丢失、pending/processing 租约过期和页面刷新恢复。
- [ ] 运行导入 Service、组件和数据库测试，确认红灯。
- [ ] 服务端同一事务建立批次与项目；每用户同时一批、每批最多 100 条；原子领取租约，完成写入必须匹配租约令牌。
- [ ] 查询恢复流程把超宽限 pending 和过期 processing 原子改为 `failed/INTERRUPTED`；成功/跳过后清空 payload，失败项保留至恢复期。
- [ ] 对话框显示总数、默认私有、确认后上传、本地仍保留；结果始终分别显示成功/跳过/失败数。
- [ ] 运行全量测试、类型检查、构建和导入集成测试；提交 `feat: add consent-based local recipe import`。

**回滚：** 暂停导入写入口，保留批次、成功记录、本地记录和失败项；恢复后沿用原 `clientBatchId`。

### Task 9：账户索引签与完整认证页面

**依赖：** Task 5、Task 6、Task 8。

**文件：**
- 新建：`src/components/account/AccountIndexTab.tsx`、`src/components/account/AccountIndexTab.test.tsx`
- 新建：`src/pages/auth/CheckEmailPage.tsx`、`VerifyEmailPage.tsx`、`ForgotPasswordPage.tsx`
- 新建：`src/pages/auth/CheckResetEmailPage.tsx`、`ResetPasswordPage.tsx`、`PasswordResetResultPage.tsx`
- 修改：`src/pages/LoginPage.tsx`、`src/pages/RegisterPage.tsx`
- 修改：`src/components/AppShell.tsx`、`src/routes/paths.ts`、`src/routes/AppRouter.tsx`、`src/styles/global.css`
- 新建/修改：每个认证页面及路由测试

**产出行为：** 注册后进入查收邮件；验证/重置 fragment 回调；登录后先处理主动导入，再恢复原任务；账户菜单仅含邮箱、私人笔记本、退出。

- [ ] 写失败测试覆盖全部页面状态、原任务文案、通用账户反馈、链接过期/重复使用、重发限流和键盘菜单焦点恢复。
- [ ] 运行页面与组件测试，确认红灯。
- [ ] 实现右侧书页索引签，触控区域至少 `44 x 44px`；点击外部、Escape 和菜单选择均关闭，关闭后焦点回触发控件。
- [ ] 实现注册/验证/登录/找回/重置章节；密码至少 8 字符，允许粘贴和密码管理器填充，不添加无依据复杂度规则；回调入口不得加载第三方脚本；隐私说明如实限定邮箱用途并说明 v0.2.0 暂不提供账户注销或数据导出。
- [ ] 登录后编排顺序固定为“会话验证 -> 主动导入/稍后 -> consume PendingAction”；主动退出清除待恢复动作。
- [ ] 当业务 localStorage 或 Supabase 会话存储不可用时，仍允许当前页面内登录、保存与读取，并在用户制作或保存前提示草稿和会话无法跨刷新恢复，不得声称已持久化。
- [ ] 在 320px、375px、430px、桌面和 200% 缩放检查无水平溢出、菜单不遮挡标题/主操作、键盘弹出后错误可见。
- [ ] 运行全量测试、类型检查、Pages 构建；提交 `feat: add notebook-style account flows`。

**回滚：** 云端开关关闭时隐藏账户签和认证路由入口，公开链路不受影响。

### Task 10：云端私人笔记本状态与跨设备读取

**依赖：** Task 7、Task 8、Task 9。

**文件：**
- 修改：`src/pages/NotebookPage.tsx`、`src/pages/RecipeDetailPage.tsx`
- 新建：`src/pages/NotebookPage.test.tsx` 或扩展现有同名测试
- 修改：`src/pages/RecipeDetailPage.test.tsx`、`src/styles/global.css`
- 新建：`src/components/imports/DeferredImportNote.tsx`、`src/components/imports/DeferredImportNote.test.tsx`

**产出行为：** 云端倒序列表、加载骨架、真实空、失败、超时、会话失效、前台刷新、稍后导入入口和只读详情。

- [ ] 写失败测试，证明加载时不闪空状态，失败不显示“没有配方”，超时有继续等待/重新加载，会话失效可登录回原位置。
- [ ] 写双客户端测试，设备 A 保存后设备 B 刷新可在列表顶部读取并打开详情。
- [ ] 用 TanStack Query 替换 `savedRecipes` 页面读取；进入页面和 `visibilitychange` 回到前台时刷新。
- [ ] 添加低干扰“导入本地配方”便笺，不遮挡条目，不演变为管理工具栏；本地记录始终保留。
- [ ] 保持现有整屏书页、索引纸条和只读详情视觉，不添加搜索、筛选、编辑或删除。
- [ ] 运行全量测试、类型检查、Pages 构建；提交 `feat: connect cloud private notebook`。

**回滚：** 关闭云端列表入口并保留本地数据；不得把云端失败误降级成空笔记本。

### Task 11：端到端、安全、可访问性与范围回归

**依赖：** Task 3 至 Task 10。

**文件：**
- 新建：`playwright.config.ts`
- 新建：`e2e/auth.spec.ts`、`e2e/password-reset.spec.ts`、`e2e/save-and-sync.spec.ts`
- 新建：`e2e/local-import.spec.ts`、`e2e/accessibility.spec.ts`、`e2e/v01-regression.spec.ts`
- 新建：`e2e/helpers/testUsers.ts`、`e2e/helpers/mailbox.ts`、`e2e/helpers/storage.ts`
- 修改：`package.json`

**产出命令：** `npm run test:e2e`、`npm run test:e2e:staging`。

- [ ] 先建立失败 E2E，覆盖注册/验证、登录/退出、密码重置、游客保存回跳、双账户越权、跨设备同步、主动导入、部分失败重试。
- [ ] 增加邮件链接在新标签、关闭原页面、localStorage 不可用三种场景；验证 fragment 清除且日志/请求不含 token。
- [ ] 增加键盘、程序化标签、焦点、实时区域、非颜色反馈、WCAG AA 对比度、44px 目标、200% 缩放、减少动态效果、320px/430px/桌面视口检查。
- [ ] 在当前及前一个主要版本的 Chrome、Edge、Firefox、Safari 做兼容性矩阵；以节流网络采集账户、保存、读取和导入耗时，验证 200ms 反馈、正常网络 3 秒目标与 10 秒可恢复超时。
- [ ] 增加 v0.1.0 “今日推荐 -> 详情 -> 实验台 -> 预览”回归和范围断言，确认不存在社区、发布、收藏、编辑/删除、搜索/筛选或经典配方库入口。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build:pages`、`npm run test:e2e:staging`；零失败才提交 `test: cover v0.2.0 cloud notebook journeys`。

**回滚：** E2E 账户和数据使用专用前缀并在测试后清理；禁止指向 production 执行破坏性夹具。

### Task 12：CI、部署门禁、观测与发布准备

**依赖：** Task 11 全绿。

**文件：**
- 修改：`.github/workflows/deploy-pages.yml`
- 新建：`.github/workflows/ci.yml`、`.github/workflows/supabase-staging.yml`
- 修改：`scripts/deployment-config.check.mjs`、`package.json`
- 新建：`scripts/supabase/staging-smoke.mjs`
- 新建：`docs/deployment/v0.2.0-supabase-runbook.md`
- 修改：`docs/development-process/06_implementation_log.md`（若阶段 06 尚未创建则新建）

**产出门禁：** PR 执行单元测试、类型检查、Pages 构建、环境配置检查和适合 CI 的 Supabase 集成测试；production 部署采用受保护环境人工确认，前端云端开关默认关闭。

- [ ] 写配置检查红灯测试，覆盖缺失公开变量、Pages basename/404 fallback、回调白名单和服务端密钥误入前端环境。
- [ ] 配置 staging 与 production 独立 Supabase 项目；记录 Site URL、精确回调 URL、邮件模板、CAPTCHA、限流、备份与恢复步骤，禁止域名通配。
- [ ] CI 中隔离普通 Pages 构建和受保护管理密钥；production 数据库迁移需要人工确认。
- [ ] staging 冒烟覆盖注册、验证、重置、保存、导入、跨账户 RLS、旧会话失效、日志脱敏和请求指标；验证认证限流、每用户每分钟 20 次保存限流、每用户同时 1 个/最多 100 条导入批次及 `retryAfter`。
- [ ] 建立并核验脱敏观测：认证成功/失败/限流，保存 P50/P95/超时/幂等命中，导入成功/跳过/失败/恢复，RLS 拒绝、`SESSION_REVOKED` 与 Edge Function 5xx；告警不得携带邮箱全文、令牌、本地记录 ID 原值或配方正文。
- [ ] 按“数据库扩展迁移 -> Edge Functions -> 关闭状态前端 -> production 冒烟 -> 开启功能”执行发布准备；任何门禁失败保持功能开关关闭。
- [ ] 运行 `npm test`、`npm run typecheck`、`npm run build:pages`、`npm run test:e2e:staging`、`npm run smoke:staging`；提交 `ci: add v0.2.0 release gates`。

**回滚：** 前端回退上一稳定构建并关闭云端开关；写函数故障时暂停入口；不删除已保存/导入记录；使用原幂等键恢复。

## 验证矩阵

| 需求编号 | 实施任务 | 主要验收证据 |
| --- | --- | --- |
| AUTH-01 | Task 5、Task 9、Task 11 | 注册 Service/页面测试、真实邮件 E2E、通用账户反馈与重复提交保护 |
| AUTH-02 | Task 1、Task 4、Task 5、Task 9、Task 11 | Hook/RLS 门禁、一次性验证链接、未验证账户拒绝与重发限流 |
| AUTH-03 | Task 1、Task 5、Task 9、Task 11 | 会话恢复、单设备退出、多设备并行与受保护动作回跳 |
| AUTH-04 | Task 1、Task 4、Task 6、Task 9、Task 11 | 失败关闭状态机、旧 Access/Refresh Token 失效与旧密码拒绝 |
| FLOW-01 | Task 3、Task 5、Task 7、Task 9、Task 11 | 游客链路、草稿保留、24 小时 PendingAction 与保存/笔记本回跳 |
| RECIPE-01 | Task 4、Task 7、Task 11 | 所有权、唯一约束、并发/丢响应幂等、10 秒超时恢复 |
| RECIPE-02 | Task 4、Task 7、Task 10、Task 11 | 倒序列表、跨设备读取、状态区分和只读详情 |
| IMPORT-01 | Task 3、Task 8、Task 9、Task 10、Task 11 | 待导入数量、明确同意前零正文上传、稍后入口与本地保留 |
| IMPORT-02 | Task 4、Task 8、Task 11 | 账户 + 本地记录 ID 判重、逐项计数、部分失败和仅失败项重试 |
| ERROR-01 | Task 2、Task 5、Task 7 至 Task 12 | 200ms 反馈、3 秒目标、10 秒超时、稳定错误码和恢复路径 |

| 验收领域 | 自动化证据 | 手动/环境证据 |
| --- | --- | --- |
| 注册、验证、登录 | Vitest + `e2e/auth.spec.ts` | staging 真邮件、新标签、关闭原页 |
| 密码重置与全局失效 | 状态机测试 + 双上下文 E2E | Task 1 契约证据与故障注入 |
| 权限与隐私 | pgTAP/RLS 双账户测试 | staging 日志脱敏检查 |
| 幂等保存 | 并发数据库测试 + save E2E | 丢失响应后原键重试 |
| 跨设备笔记本 | Query/页面测试 + 双上下文 E2E | 两个实际浏览器复核 |
| 主动导入 | DB、Service、组件与 E2E | 确认前网络面板无正文上传 |
| 页面状态 | 页面组件测试 | 慢网、离线、10 秒超时 |
| 可访问性 | 键盘/语义 E2E | 200% 缩放、窄屏、减少动态 |
| v0.1.0 回归 | 现有测试 + `v01-regression.spec.ts` | 手机端整屏书页视觉复核 |
| 部署 | 配置检查 + staging smoke | production 回调、Pages 深链与备份恢复 |

## 全局回滚原则

- 功能开关默认关闭，只有 production 冒烟成功后开启。
- 数据库只做先新增、后切换、延后删除；v0.2.0 不执行破坏性清理。
- 云端写入成功后不因前端或函数回滚而删除；恢复时沿用原幂等键。
- 本地迁移保留 v0.1.0 备份，任何失败只隔离损坏记录，不清空整个状态。
- 密码重置未知结果保持失败关闭，禁止人工跳过安全阶段。
- 任一安全、RLS、旧会话失效或敏感日志门禁失败，云端功能不得发布。

## 任务级审阅与提交规则

每个 Task 完成后按以下顺序执行：

1. 查看 `git diff`，确认无用户临时文件、密钥、测试账户凭据或无关视觉改动。
2. 运行该 Task 的定向测试，再运行 `npm test`、`npm run typecheck`；涉及前端构建时运行 `npm run build:pages`。
3. 涉及 Supabase 时额外运行数据库/函数集成测试；涉及用户旅程时运行对应 Playwright 场景。
4. 由独立审阅者先检查规格符合性，再检查代码质量、安全和测试缺口。
5. 只提交该 Task 的文件。若验证失败，不提交、不进入下一 Task。

## 已完成工作

- 将已签收技术设计拆为 12 个有序、可独立审阅的实施任务。
- 将 Supabase 密码终态、全局撤销、Hook 与 RLS 联动设为首个 Go/No-Go 门禁。
- 锁定跨任务接口、文件职责、TDD 步骤、验证命令、提交点和回滚边界。
- 建立需求、安全、E2E、可访问性、部署和范围回归的追踪矩阵。

## 决策

- 先验证最危险且不可通过代码猜测补齐的认证契约，再投资云端实现。
- 本地持久化迁移可独立准备，但不得绕过认证 `NO-GO` 合并发布。
- 后端按 schema/RLS、认证、重置、保存、导入的依赖顺序推进；前端随后接入已稳定合约。
- 测试沿用源码同目录 Vitest 惯例，新增 `supabase/tests` 和 `e2e` 承担跨系统验证。
- 计划采用小步独立提交，不把 v0.2.0 合并为一次难以审阅的大改动。

## 交付物

- `docs/development-process/05_implementation_plan.md`
- 更新后的 `docs/development-process/00_process_index.md`

## 完成标准

- [x] 任务顺序、依赖和硬性停止条件已定义。
- [x] 每项任务的预期文件、接口、测试、验证命令、提交点和回滚已定义。
- [x] P0 需求、非功能门槛、页面状态和范围回归均可追踪至任务。
- [x] Supabase 未验证能力未被当作既成事实。
- [x] v0.2.0 非目标和 v0.3.0 经典鸡尾酒配方库未回流。
- [x] 用户已于 2026-08-13 书面签收本文档。

## 开放问题

- Supabase staging/production 项目尚未创建；由 Task 1/12 建立或配置。
- Supabase 是否满足密码更新幂等/契约终态与全局撤销仍未验证；Task 1 是硬性阻塞门禁。
- 生产限流阈值、邮件送达和备份恢复能力需在 staging 校准，不得在计划阶段假定通过。
- 当前 `main` 尚有领先远端的本地提交；进入实施前应确认推送与分支策略。

## 给下一角色的交接

本文已由用户于 2026-08-13 书面签收。下一角色为实现工程师，进入阶段 06 并创建 `docs/development-process/06_implementation_log.md`。执行者必须先运行 Task 1；只有书面报告为 `GO` 才按顺序继续 Task 2 至 Task 12。每完成一个 Task 即更新实施日志、验证证据和偏离说明。
