import { UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useWishTodayStore } from "../store/useWishTodayStore";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectAction = searchParams.get("redirectAction");
  const redirectTo = searchParams.get("redirectTo");
  const [nickname, setNickname] = useState("调酒新手");
  const [account, setAccount] = useState("guest@wishtoday.local");
  const [password, setPassword] = useState("wishtoday");
  const [confirmPassword, setConfirmPassword] = useState("wishtoday");
  const [error, setError] = useState("");
  const { continueAfterAuth, setSession } = useWishTodayStore();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!nickname.trim() || !account.trim() || !password.trim()) {
      setError("请填写昵称、账号和密码");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setSession({
      isAuthenticated: true,
      userId: "mock-user-1",
      nickname,
    });

    if (redirectAction === "saveRecipe") {
      const result = await continueAfterAuth();
      if (result.status === "saved") {
        navigate(`/recipes/${result.recipe.id}?saved=1`);
        return;
      }
      navigate("/diy/preview");
      return;
    }

    navigate(redirectTo || "/notebook");
  }

  const query = redirectAction
    ? `?redirectAction=${redirectAction}`
    : redirectTo
      ? `?redirectTo=${redirectTo}`
      : "";

  return (
    <AppShell eyebrow="注册" title="创建 WishToday 账号">
      <section className="panel auth-panel">
        <p className="body-copy">注册成功后会继续刚才的保存动作，不会跳回首页。</p>
        <form className="form-panel" onSubmit={submit}>
          <label>
            <span>昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} />
          </label>
          <label>
            <span>账号</span>
            <input value={account} onChange={(event) => setAccount(event.target.value)} />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            <span>确认密码</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            <UserPlus size={18} />
            注册并继续
          </button>
        </form>
        <Link className="text-link" to={`/login${query}`}>
          返回登录
        </Link>
      </section>
    </AppShell>
  );
}
