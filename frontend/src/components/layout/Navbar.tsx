// frontend/src/components/layout/Navbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/userStore";
import ThemeToggle from "../shared/ThemeToggle";

const NAV_LINKS = [
  { to: "/", label: "首页" },
  { to: "/words", label: "单词本" },
  { to: "/game", label: "对对碰" },
  { to: "/scenes", label: "场景" },
  { to: "/reading", label: "阅读" },
  { to: "/league", label: "联赛" },
];

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  color: "var(--text-primary)",
  textDecoration: isActive ? "underline" : "none",
  fontWeight: isActive ? 600 : 500,
  fontSize: 14,
  padding: "4px 8px",
  borderRadius: 4,
});

export default function Navbar() {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();

  const logout = async () => {
    await fetch("http://localhost:8000/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
    navigate("/login");
  };

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "var(--bg)", boxShadow: "var(--border-shadow)",
      padding: "0 24px", height: 56,
      display: "flex", alignItems: "center", gap: 8,
      maxWidth: "100%",
    }}>
      <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.32px", marginRight: 16 }}>
        WordFlow
      </span>
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} style={navLinkStyle}>
            {link.label}
          </NavLink>
        ))}
      </div>
      <ThemeToggle />
      {user && (
        <button onClick={logout} className="btn-secondary" style={{ padding: "4px 12px", fontSize: 13 }}>
          退出
        </button>
      )}
    </nav>
  );
}
