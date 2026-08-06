import { LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useWishTodayStore } from "../store/useWishTodayStore";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectAction = searchParams.get("redirectAction");
  const redirectTo = searchParams.get("redirectTo");
  const [account, setAccount] = useState("guest@wishtoday.local");
  const [password, setPassword] = useState("wishtoday");
  const [error, setError] = useState("");
  const { continueAfterAuth, setSession } = useWishTodayStore();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!account.trim() || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }

    setSession({
      isAuthenticated: true,
      userId: "mock-user-1",
      nickname: "调酒新手",
    });

    if (redirectAction === "saveRecipe") {
      const result = await continueAfterAuth();
      if (result.status === "saved") {
        navigate(`/recipes/${result.recipe.id}?saved=1`);
        return;
      }
      if (result.status === "invalid") {
        setError(result.errors[0]);
        navigate("/diy/preview");
        return;
      }
      navigate("/diy/preview");
      return;
    }

    navigate(redirectTo || "/notebook");
  }

  return (
    <AppShell eyebrow="登录" title="登录后保存你的私人配方">
      <section className="panel auth-panel">
        <p className="body-copy">
          WishToday 第一版只在保存配方或访问私人笔记本时请求登录。
        </p>
        <form className="form-panel" onSubmit={submit}>
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
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            <LogIn size={18} />
            登录并继续
          </button>
        </form>
        <Link
          className="text-link"
          to={`/register${
            redirectAction ? `?redirectAction=${redirectAction}` : redirectTo ? `?redirectTo=${redirectTo}` : ""
          }`}
        >
          还没有账号? 去注册
        </Link>
      </section>
    </AppShell>
  );
}
