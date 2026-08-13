# Supabase 认证能力 Go/No-Go 探针

状态：`NO-GO`

证据时间：2026-08-13（Asia/Shanghai）

对应版本：WishToday v0.2.0 / 实施计划 Task 1（项目任务 Task 22）

## 结论

五项硬性能力没有全部达到 `contractual-and-observed`，因此结论为 `NO-GO`。不得继续实施计划 Task 2 至 Task 12，也不得开始数据库、RLS、认证或其他云端功能。下一步必须返回 Task 20 技术设计，改选能提供密码更新幂等键或可查询契约终态的认证边界；不得降低“密码重置后全部旧会话立即失效”的验收标准。

```text
recoveryContinuation              unknown
customAccessTokenClaims           unknown
immediateRlsAccessTokenRejection  unknown
globalRefreshTokenRevocation      unknown
passwordUpdateTerminalState       unsupported
decision                          NO-GO
```

`unknown` 不表示能力一定不存在，而是当前没有同时取得官方契约与本项目 staging 故障注入证据。`unsupported` 表示本次审阅到的官方密码更新接口契约没有提供计划要求的幂等键或可查询终态，不能据超时或实测行为推断结果。

## 评价规则

探针固定检查以下五项。仅五项均为 `contractual-and-observed` 时返回 `GO`；`observed-only`、`unsupported`、`unknown`、缺失值或非法值都返回 `NO-GO`。

| 能力 | 官方契约审阅 | staging 观测 | 状态 | 判定依据 |
| --- | --- | --- | --- | --- |
| recoveryContinuation | `verifyOtp` 文档承诺用 OTP/TokenHash 登录；Hook 的 `authentication_method` 包含 `recovery`，但未承诺短期、一次性、仅续执行当前操作的服务端能力 | 未执行 | `unknown` | 缺少所需契约，也无故障注入结果 |
| customAccessTokenClaims | Custom Access Token Hook 明确在令牌签发前运行，并允许按认证方式增加 claims | 未执行 | `unknown` | 有契约方向，无本项目观测 |
| immediateRlsAccessTokenRejection | RLS 文档明确策略可读取 `auth.jwt()`；可设计 JWT claim 与数据库版本比较 | 未执行 | `unknown` | 旧 Access Token 的即时拒绝未做真实请求验证 |
| globalRefreshTokenRevocation | Signout 文档说明 `global` 终止用户全部会话，并销毁受影响会话的 Refresh Token | 未执行 | `unknown` | 有契约方向，无双设备和故障注入观测 |
| passwordUpdateTerminalState | `updateUserById(userId, { password })` 文档只描述更新调用；审阅到的官方接口资料未提供幂等键、操作 ID 或可查询的契约终态 | 未执行 | `unsupported` | 不满足失败关闭状态机的硬性前提 |

## 官方证据

本次审阅的公开 SDK 最新版本为 `@supabase/supabase-js 2.112.3` 与 `@supabase/auth-js 2.112.3`。Supabase 托管 Auth 的具体服务版本无法在没有项目的情况下取得，因此未伪造产品版本；源码参考固定在审阅时的提交：

- `supabase-js`: `311eb9605bfff8b6fd8fd0662bc0bd83d0d9a8ac`
- `auth-js`: `52ef4d7b68a32ed9713628d37a9328b56018b8d6`

| 主题 | 官方 URL | 与门禁相关的原文摘录 |
| --- | --- | --- |
| OTP/TokenHash | https://supabase.com/docs/reference/javascript/auth-verifyotp | “Log in a user given a User supplied OTP or TokenHash received through mobile or email.” |
| Access Token Hook | https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook | “The custom access token hook runs before a token is issued and allows you to add additional claims based on the authentication method used.”；认证方式列表包含 `recovery` |
| RLS JWT | https://supabase.com/docs/guides/database/postgres/row-level-security | `auth.jwt()` 返回发起请求用户的 JWT，并提示 JWT 中的部分数据可能在刷新前不新鲜 |
| 全局登出 | https://supabase.com/docs/guides/auth/signout | `global` 会终止用户全部活动会话；“all refresh tokens ... related to the affected sessions are destroyed”；旧 Access Token 在自身到期前仍有效 |
| Admin 密码更新 | https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid | 示例为 `updateUserById(userId, { password: 'new_password' })`，未描述幂等键或可查询终态 |
| Auth 限流 | https://supabase.com/docs/guides/auth/rate-limits | `/auth/v1/verify` 按 IP、不可自定义、360 次/小时并允许最多 30 次突发；`/auth/v1/token` 按 IP、不可自定义、1800 次/小时并允许最多 30 次突发 |
| CAPTCHA | https://supabase.com/docs/guides/auth/auth-captcha | 登录、注册和密码重置可启用 CAPTCHA；支持 hCaptcha 与 Cloudflare Turnstile |

源码只用于确认 SDK 表面和审阅范围，不替代官方产品契约，也不提升任何能力状态。

## 限流与 CAPTCHA 差异

已签收设计要求密码登录/令牌端点“每 IP 每 5 分钟最多 30 次”，注册、验证和重置邮件“每目标地址每小时最多 3 封”。Supabase 文档显示部分 Auth 限流可配置，但 `/verify` 和 `/token` 的 IP 限流不可自定义，且默认令牌桶允许短时最多 30 次突发；内置邮件提供方的项目级额度也不是已签收的逐目标地址阈值。

因此即使认证能力门禁将来通过，Task 5 仍必须先评审受控认证入口或独立认证网关，精确实现 IP 五分钟窗口与逐目标地址小时窗口。CAPTCHA 本身有官方支持，但尚未在项目中配置或观测。

## 探针环境与故障注入

当前环境没有 Supabase staging/production 项目、项目 URL、匿名密钥、服务端密钥、访问令牌、项目引用、数据库密码、Supabase CLI 或可用 Docker 服务。由此无法安全创建隔离账户，也无法执行 recovery 重放、Hook claim、旧 Access Token、双设备 Refresh Token、密码更新丢响应等故障注入。

本次没有生成邮箱、密码或令牌，也没有修改任何 Supabase 配置。故障注入结果均记录为“未执行”，而不是通过。CLI 只输出能力名、状态和阻塞项；测试验证环境中的 URL、邮箱、密码和密钥不会进入标准输出或错误输出。

## 可复现命令

```powershell
node --test scripts/supabase/auth-capability-probe.test.mjs
npm run probe:supabase-auth
```

第一条应通过；第二条应输出 `NO-GO` 并以退出码 `1` 结束，用于阻止 CI 或人工流程误继续。

## 解锁条件

只有在技术设计改选认证边界后，取得明确的密码更新幂等/终态契约，并在隔离 staging 对五项能力完成故障注入，才能重新运行门禁。所有证据都必须记录产品版本、配置、脱敏账户标识和时间；不得以超时、租约过期、源码实现细节或单次成功行为替代契约保证。
