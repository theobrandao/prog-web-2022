"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="small ghost" onClick={logout} disabled={loading}
      style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
