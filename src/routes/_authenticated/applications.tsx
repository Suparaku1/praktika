import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, FileText, ExternalLink, CheckCircle2, XCircle, Clock, Eye, MessageCircle, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email/send.functions";

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  pending: { label: "Në pritje", variant: "secondary", icon: Clock },
  reviewing: { label: "Në shqyrtim", variant: "default", icon: Eye },
  accepted: { label: "Pranuar", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Refuzuar", variant: "destructive", icon: XCircle },
  withdrawn: { label: "Tërhequr", variant: "outline", icon: XCircle },
};

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "Aplikimet · Zemër & Praktikë" },
      { name: "description", content: "Ndiq dhe menaxho aplikimet për praktikë dhe punë." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Aplikimet · Zemër & Praktikë" },
      { property: "og:description", content: "Ndiq dhe menaxho aplikimet për praktikë dhe punë." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    view: (typeof s.view === "string" && (s.view === "list" || s.view === "board") ? s.view : "list") as "list" | "board",
    tab: (typeof s.tab === "string" && ["all", "pending", "accepted"].includes(s.tab) ? s.tab : "all") as "all" | "pending" | "accepted",
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const navigate = useNavigate();
  const { view, tab } = Route.useSearch();
  const setView = (v: "list" | "board") => navigate({ to: "/applications", search: { view: v, tab }, replace: true });
  const setTab = (t: "all" | "pending" | "accepted") => navigate({ to: "/applications", search: { view, tab: t }, replace: true });
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const r = (roles ?? []).map((x) => x.role);
    const resolved = r.includes("business") ? "business" : r.includes("student") ? "student" : r[0] ?? null;
    setRole(resolved);

    if (resolved === "student") {
      const { data } = await supabase
        .from("applications")
        .select("id, status, cover_letter, created_at, job:jobs(id, title, city, business_id)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      setMine((data as any) ?? []);
    } else if (resolved === "business") {
      const { data: jobIdsData } = await supabase.from("jobs").select("id").eq("business_id", user.id);
      const jobIds = (jobIdsData ?? []).map((j) => j.id);
      if (jobIds.length === 0) {
        setReceived([]);
      } else {
        const { data: apps } = await supabase
          .from("applications")
          .select("id, status, cover_letter, created_at, student_id, job:jobs(id, title, business_id)")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false });
        const studentIds = Array.from(new Set((apps ?? []).map((a: any) => a.student_id)));
        const { data: studentsData } = await supabase.from("profiles").select("id, full_name, email").in("id", studentIds);
        const studentsMap = new Map((studentsData ?? []).map((s: any) => [s.id, s]));
        setReceived((apps ?? []).map((a: any) => ({ ...a, student: studentsMap.get(a.student_id) })));
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("applications").update({ status: status as any, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statusi u përditësua");
    const app = received.find((a) => a.id === id);
    // In-app notification to the student
    if (app?.student_id && app?.job?.title) {
      const statusLabel = statusMeta[status]?.label ?? status;
      await supabase.from("notifications").insert({
        user_id: app.student_id,
        type: "application_status",
        title: `Aplikimi: ${statusLabel}`,
        message: app.job.title,
        link: "/applications",
      });
    }
    // Fire-and-forget email to the student
    try {
      if (app?.student?.email && app?.job?.title) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        await sendEmail({
          data: {
            to: app.student.email,
            template: {
              kind: "application_status",
              jobTitle: app.job.title,
              status,
              appUrl: `${origin}/applications`,
            },
          },
        });
      }
    } catch { /* ignore */ }
    load();
  };

  const startChat = async (otherUserId: string, jobId?: string) => {
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      _other_user: otherUserId,
      ...(jobId ? { _job_id: jobId } : {}),
    });
    if (error || !data) return toast.error(error?.message ?? "Nuk u krijua biseda");
    navigate({ to: "/messages/$id", params: { id: data as string } });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mb-6 text-3xl font-bold tracking-tight">
          {role === "business" ? "Aplikimet e marra" : "Aplikimet e mia"}
        </h1>

        {role === "student" && <StudentList apps={mine} />}

        {role === "business" && (
          <>
            <div className="mb-4 flex items-center justify-end gap-1">
              <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
                <List className="h-4 w-4" /> Listë
              </Button>
              <Button size="sm" variant={view === "board" ? "default" : "outline"} onClick={() => setView("board")}>
                <LayoutGrid className="h-4 w-4" /> Kanban
              </Button>
            </div>
            {view === "list" ? (
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">Të gjitha ({received.length})</TabsTrigger>
                  <TabsTrigger value="pending">Në pritje ({received.filter((a) => a.status === "pending").length})</TabsTrigger>
                  <TabsTrigger value="accepted">Pranuar ({received.filter((a) => a.status === "accepted").length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4"><BusinessList apps={received} onUpdate={updateStatus} onChat={startChat} /></TabsContent>
                <TabsContent value="pending" className="mt-4"><BusinessList apps={received.filter((a) => a.status === "pending")} onUpdate={updateStatus} onChat={startChat} /></TabsContent>
                <TabsContent value="accepted" className="mt-4"><BusinessList apps={received.filter((a) => a.status === "accepted")} onUpdate={updateStatus} onChat={startChat} /></TabsContent>
              </Tabs>
            ) : (
              <KanbanBoard apps={received} onUpdate={updateStatus} onChat={startChat} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

const KANBAN_COLS: { key: string; title: string }[] = [
  { key: "pending", title: "Në pritje" },
  { key: "reviewing", title: "Në shqyrtim" },
  { key: "accepted", title: "Pranuar" },
  { key: "rejected", title: "Refuzuar" },
];

function KanbanBoard({
  apps,
  onUpdate,
  onChat,
}: {
  apps: any[];
  onUpdate: (id: string, status: string) => void;
  onChat: (userId: string, jobId?: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLS.map((col) => {
        const items = apps.filter((a) => a.status === col.key);
        return (
          <div key={col.key} className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{col.title}</div>
              <Badge variant="outline" className="font-mono text-[10px]">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="rounded-md border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                  Bosh
                </div>
              )}
              {items.map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-background p-3 shadow-sm">
                  <div className="text-sm font-medium truncate">
                    {a.student?.full_name || a.student?.email || "Nxënës"}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.job?.title}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <Select value={a.status} onValueChange={(v) => onUpdate(a.id, v)}>
                      <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Në pritje</SelectItem>
                        <SelectItem value="reviewing">Në shqyrtim</SelectItem>
                        <SelectItem value="accepted">Prano</SelectItem>
                        <SelectItem value="rejected">Refuzo</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onChat(a.student_id, a.job?.id)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StudentList({ apps }: { apps: any[] }) {
  if (apps.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <CardTitle className="text-lg">Ende nuk ke aplikime</CardTitle>
          <CardDescription>Shfleto mundësitë dhe apliko në praktikën që të intereson.</CardDescription>
          <Button asChild><Link to="/jobs">Shfleto punët</Link></Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3">
      {apps.map((a) => {
        const M = statusMeta[a.status] ?? statusMeta.pending;
        const I = M.icon;
        return (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{a.job?.title ?? "Shpallje"}</CardTitle>
                  <CardDescription className="mt-1">
                    {a.job?.city ?? "—"} · Aplikuar më {new Date(a.created_at).toLocaleDateString("sq-AL")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={M.variant} className="gap-1"><I className="h-3 w-3" /> {M.label}</Badge>
                  {a.job?.id && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/jobs/$id" params={{ id: a.job.id }}><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

function BusinessList({ apps, onUpdate, onChat }: { apps: any[]; onUpdate: (id: string, status: string) => void; onChat: (userId: string, jobId?: string) => void }) {
  if (apps.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">Asnjë aplikim në këtë kategori.</p>;
  }
  return (
    <div className="grid gap-3">
      {apps.map((a) => {
        const M = statusMeta[a.status] ?? statusMeta.pending;
        const I = M.icon;
        return (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-base">{a.student?.full_name || a.student?.email || "Nxënës"}</CardTitle>
                  <CardDescription className="mt-1">
                    për <span className="font-medium text-foreground">{a.job?.title}</span> · {new Date(a.created_at).toLocaleDateString("sq-AL")}
                  </CardDescription>
                </div>
                <Badge variant={M.variant} className="gap-1"><I className="h-3 w-3" /> {M.label}</Badge>
              </div>
            </CardHeader>
            {a.cover_letter && (
              <CardContent>
                <p className="rounded-md bg-secondary/50 p-3 text-sm text-foreground/80">{a.cover_letter}</p>
              </CardContent>
            )}
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0">
              <Select value={a.status} onValueChange={(v) => onUpdate(a.id, v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Në pritje</SelectItem>
                  <SelectItem value="reviewing">Në shqyrtim</SelectItem>
                  <SelectItem value="accepted">Prano</SelectItem>
                  <SelectItem value="rejected">Refuzo</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onChat(a.student_id, a.job?.id)}>
                  <MessageCircle className="h-4 w-4" /> Bisedo
                </Button>
                {a.status === "accepted" && (
                  <Button asChild size="sm">
                    <Link to="/contracts/new" search={{ application: a.id }}>Krijo kontratë</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}