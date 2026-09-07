import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { AiChat } from "@/components/ai-chat";

type AppRole = "super_admin" | "teacher" | "student" | "business";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const [role, setRole] = useState<AppRole | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data ?? []).map((r: any) => r.role as AppRole);
      const pref: AppRole[] = ["super_admin", "teacher", "business", "student"];
      const picked = pref.find((p) => roles.includes(p)) ?? null;
      setRole(picked);
    })();
  }, []);
  return (
    <AppShell role={role}>
      <Outlet />
      <AiChat />
    </AppShell>
  );
}