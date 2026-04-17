// frontend/src/pages/auth/Register.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../lib/api";

export default function Register() {
  const [form, setForm] = useState({ email: "", nickname: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", form);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败");
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 6, border: "none",
    background: "var(--bg-surface)", boxShadow: "var(--border-shadow)",
    color: "var(--text-primary)", fontSize: 14, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 360, padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.96px", marginBottom: 24 }}>注册</h1>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="email" placeholder="邮箱" value={form.email} onChange={set("email")} required style={inputStyle} />
          <input type="text" placeholder="昵称" value={form.nickname} onChange={set("nickname")} required style={inputStyle} />
          <input type="password" placeholder="密码" value={form.password} onChange={set("password")} required style={inputStyle} />
          {error && <p style={{ color: "var(--accent-review)", fontSize: 13 }}>{error}</p>}
          <button type="submit" className="btn-primary">注册</button>
          <Link to="/login" style={{ color: "var(--accent-xp)", fontSize: 13, textAlign: "center" }}>已有账号？登录</Link>
        </form>
      </div>
    </div>
  );
}
