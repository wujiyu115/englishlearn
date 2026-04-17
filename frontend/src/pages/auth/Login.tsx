// frontend/src/pages/auth/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";
import { queryClient } from "../../lib/queryClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/login", { email, password });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 360, padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.96px", marginBottom: 24 }}>
          登录 WordFlow
        </h1>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="邮箱" required
            style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--bg-surface)",
              boxShadow: "var(--border-shadow)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="密码" required
            style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "var(--bg-surface)",
              boxShadow: "var(--border-shadow)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}
          />
          {error && <p style={{ color: "var(--accent-review)", fontSize: 13 }}>{error}</p>}
          <button type="submit" className="btn-primary">登录</button>
          <Link to="/register" style={{ color: "var(--accent-xp)", fontSize: 13, textAlign: "center" }}>
            还没有账号？注册
          </Link>
        </form>
      </div>
    </div>
  );
}
