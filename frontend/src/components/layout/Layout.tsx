// frontend/src/components/layout/Layout.tsx
import { Outlet, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "./Navbar";
import { api } from "../../lib/api";
import { useUserStore } from "../../stores/userStore";
import type { User } from "../../types";

export default function Layout() {
  const { user, setUser } = useUserStore();
  const { data, isError } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get<User>("/user/me"),
    retry: false,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  if (isError) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <Outlet />
      </main>
    </div>
  );
}
