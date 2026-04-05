"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 7,
        padding: "0 14px",
        height: 32,
        color: "rgba(255,255,255,0.6)",
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.14s",
      }}
      onMouseEnter={e => {
        (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
        (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={e => {
        (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
        (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
      }}
    >
      Abmelden
    </button>
  );
}
