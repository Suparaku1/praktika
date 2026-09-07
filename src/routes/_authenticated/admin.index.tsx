import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2, Users, Building2, Briefcase, CheckCircle2, XCircle, ArrowLeft, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Paneli i Super Adminit · Zemër & Praktikë" },
      { name: "description", content: "Statistika dhe kontrolle të platformës Zemër & Praktikë." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Paneli i Super Adminit · Zemër & Praktikë" },
      { property: "og:description", content: "Statistika dhe kontrolle të platformës Zemër & Praktikë." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHome,
});

type Stats = {
  total_users: number;
  total_students: number;
  total_businesses: number;
  total_teachers: number;
  total_jobs: number;
  published_jobs: number;
  total_applications: number;
  total_contracts: number;
  total_certificates: number;
  unverified_businesses: number;
};

function AdminHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "super_admin");
      if (!isAdmin) {
        toast.error("Nuk ke akses në panelin e administratorit");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      const { data, error } = await supabase.rpc("admin_platform_stats");
      if (error) toast.error(error.message);
      else if (data && data.length) setStats(data[0] as Stats);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-secondary/30"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Dashboard</Link></Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">Panel Super Admin</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pasqyra e platformës</h1>
          <p className="mt-1 text-muted-foreground">Statistika dhe veprime për të menaxhuar platformën.</p>
        </div>

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Përdorues" value={stats.total_users} icon={Users} />
            <StatCard label="Nxënës" value={stats.total_students} icon={Users} />
            <StatCard label="Biznese" value={stats.total_businesses} icon={Building2} />
            <StatCard label="Mësues" value={stats.total_teachers} icon={Users} />
            <StatCard label="Shpallje totale" value={stats.total_jobs} icon={Briefcase} />
            <StatCard label="Të publikuara" value={stats.published_jobs} icon={CheckCircle2} />
            <StatCard label="Aplikime" value={stats.total_applications} icon={BarChart3} />
            <StatCard label="Kontrata" value={stats.total_contracts} icon={BarChart3} />
            <StatCard label="Certifikata" value={stats.total_certificates} icon={BarChart3} />
            <StatCard label="Biznese pa verifikuar" value={stats.unverified_businesses} icon={XCircle} highlight />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminLink to="/admin/users" icon={Users} title="Përdoruesit" desc="Menaxho rolet e të gjithë përdoruesve." />
          <AdminLink to="/admin/businesses" icon={Building2} title="Bizneset" desc="Verifiko ose anulo verifikimin e bizneseve." />
          <AdminLink to="/admin/jobs" icon={Briefcase} title="Shpalljet" desc="Modero shpalljet aktive në platformë." />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon: I, highlight }: { label: string; value: number; icon: typeof Shield; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <I className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function AdminLink({ to, icon: I, title, desc }: { to: string; icon: typeof Shield; title: string; desc: string }) {
  return (
    <Card className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><I className="h-5 w-5" /></div>
        <CardTitle className="mt-3 text-base">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant="outline"><Link to={to as any}>Hap</Link></Button>
      </CardContent>
    </Card>
  );
}