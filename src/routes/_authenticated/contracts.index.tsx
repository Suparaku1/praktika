import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Plus, Clock, CheckCircle2, XCircle, Send, FileSignature, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CardListSkeleton } from "@/components/skeletons";
import { qk } from "@/lib/query/keys";

const STATUS_OPTIONS = ["all", "draft", "sent", "signed_student", "signed_business", "active", "completed", "cancelled"] as const;
type StatusFilter = typeof STATUS_OPTIONS[number];

export const Route = createFileRoute("/_authenticated/contracts/")({
  head: () => ({
    meta: [
      { title: "Kontratat · Zemër & Praktikë" },
      { name: "description", content: "Menaxho kontratat dixhitale të praktikës profesionale." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Kontratat · Zemër & Praktikë" },
      { property: "og:description", content: "Menaxho kontratat dixhitale të praktikës profesionale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown> | undefined = {}): { q?: string; status?: StatusFilter } => ({
    q: typeof s.q === "string" ? s.q : "",
    status: (typeof s.status === "string" && (STATUS_OPTIONS as readonly string[]).includes(s.status) ? s.status : "all") as StatusFilter,
  }),
  component: ContractsPage,
});

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  sent: { label: "Dërguar", variant: "secondary", icon: Send },
  signed_student: { label: "Nënshkruar nga nxënësi", variant: "secondary", icon: FileSignature },
  signed_business: { label: "Nënshkruar nga biznesi", variant: "secondary", icon: FileSignature },
  active: { label: "Aktive", variant: "default", icon: CheckCircle2 },
  completed: { label: "Përfunduar", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Anuluar", variant: "destructive", icon: XCircle },
};

function ContractsPage() {
  const { q, status } = Route.useSearch();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: qk.contractsList(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { role: null as string | null, items: [] as any[] };
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const r = (roles ?? []).map((x) => x.role);
      const resolved = r.includes("business") ? "business" : r.includes("student") ? "student" : r.includes("teacher") ? "teacher" : r[0] ?? null;
      const { data: rows } = await supabase
        .from("contracts")
        .select("id, title, status, start_date, end_date, business_id, student_id, created_at")
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set([
        ...(rows ?? []).map((c: any) => c.business_id),
        ...(rows ?? []).map((c: any) => c.student_id),
      ]));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email, organization").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return {
        role: resolved,
        items: (rows ?? []).map((c: any) => ({ ...c, business: map.get(c.business_id), student: map.get(c.student_id) })),
      };
    },
    staleTime: 30_000,
  });
  const role = data?.role ?? null;
  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    const needle = (q ?? "").trim().toLowerCase();
    return items.filter((c: any) => {
      if (status !== "all" && c.status !== status) return false;
      if (!needle) return true;
      const cp = role === "business" ? c.student : c.business;
      return [c.title, cp?.full_name, cp?.organization, cp?.email]
        .filter(Boolean).some((s: string) => s.toLowerCase().includes(needle));
    });
  }, [items, q, status, role]);
  const setSearch = (patch: { q?: string; status?: StatusFilter }) =>
    navigate({ to: "/contracts", search: { q, status, ...patch }, replace: true });

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Kontratat</h1>
          {role === "business" && (
            <Button asChild><Link to="/contracts/new"><Plus className="h-4 w-4" /> Kontratë e re</Link></Button>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kërko titull ose palë..."
              className="pl-9"
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setSearch({ status: s })}>
                {s === "all" ? "Të gjitha" : statusMeta[s]?.label ?? s}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <CardListSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">
                {q || status !== "all" ? "Asnjë kontratë nuk përputhet" : "Ende nuk ka kontrata"}
              </CardTitle>
              <CardDescription>
                {q || status !== "all"
                  ? "Provo të pastrosh filtrat."
                  : role === "business"
                    ? "Krijo një kontratë praktike për një nxënës të pranuar."
                    : "Kontratat e dërguara nga bizneset do të shfaqen këtu."}
              </CardDescription>
              {role === "business" && (
                <Button asChild><Link to="/contracts/new"><Plus className="h-4 w-4" /> Krijo kontratë</Link></Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((c: any) => {
              const M = statusMeta[c.status] ?? statusMeta.draft;
              const I = M.icon;
              const counterparty = role === "business" ? c.student : c.business;
              return (
                <Link key={c.id} to="/contracts/$id" params={{ id: c.id }} className="block">
                  <Card className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{c.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {counterparty?.full_name || counterparty?.organization || counterparty?.email || "—"}
                            {c.start_date && ` · ${new Date(c.start_date).toLocaleDateString("sq-AL")}`}
                            {c.end_date && ` → ${new Date(c.end_date).toLocaleDateString("sq-AL")}`}
                          </CardDescription>
                        </div>
                        <Badge variant={M.variant} className="gap-1"><I className="h-3 w-3" /> {M.label}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}