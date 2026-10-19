import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const APP: Record<string, string> = { pending: "Në pritje", reviewing: "Në shqyrtim", accepted: "Pranuar", rejected: "Refuzuar", withdrawn: "Tërhequr" };
const CON: Record<string, string> = { draft: "Draft", sent: "Dërguar", signed_student: "Nënshkruar (nxënës)", signed_business: "Nënshkruar (biznes)", active: "Aktive", completed: "Përfunduar", cancelled: "Anuluar" };
const fmt = (d: string) => new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" });

type Row = { id: string; title: string; meta: string; badge: string; to: string };
type Notif = { id: string; title: string; message: string; link: string | null; created_at: string; read: boolean };

async function load(userId: string) {
  const { data: jobs } = await supabase.from("jobs").select("id, title").eq("business_id", userId);
  const jobMap = new Map((jobs ?? []).map((j) => [j.id, j.title]));
  const [apps, cons, fbs, notes, crts] = await Promise.all([
    jobMap.size
      ? supabase.from("applications").select("id, status, created_at, job_id, student_id").in("job_id", [...jobMap.keys()]).order("created_at", { ascending: false }).limit(25)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("contracts").select("id, title, status, created_at, student_id").eq("business_id", userId).order("created_at", { ascending: false }).limit(25),
    supabase.from("practice_feedback").select("id, score, passed, created_at, student_id, contract_id").eq("business_id", userId).order("created_at", { ascending: false }).limit(25),
    supabase.from("notifications").select("id, title, message, link, created_at, read").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("certificates").select("id, certificate_number, issued_at, revoked_at, student_id").eq("business_id", userId).order("issued_at", { ascending: false }).limit(25),
  ]);
  const ids = new Set<string>();
  for (const r of [...(apps.data ?? []), ...(cons.data ?? []), ...(fbs.data ?? []), ...(crts.data ?? [])]) ids.add(r.student_id);
  const { data: profs } = ids.size ? await supabase.from("profiles").select("id, full_name").in("id", [...ids]) : { data: [] };
  const nm = new Map((profs ?? []).map((p) => [p.id, p.full_name || "Nxënës"]));
  const applications: Row[] = (apps.data ?? []).map((a: any) => ({ id: a.id, title: nm.get(a.student_id) ?? "Nxënës", meta: `${jobMap.get(a.job_id) ?? ""} · ${fmt(a.created_at)}`, badge: APP[a.status] ?? a.status, to: "/applications" }));
  const contracts: Row[] = (cons.data ?? []).map((c) => ({ id: c.id, title: c.title, meta: `${nm.get(c.student_id) ?? ""} · ${fmt(c.created_at)}`, badge: CON[c.status] ?? c.status, to: `/contracts/${c.id}` }));
  const evaluations: Row[] = (fbs.data ?? []).map((f) => ({ id: f.id, title: nm.get(f.student_id) ?? "Nxënës", meta: `Nota ${f.score}/10 · ${fmt(f.created_at)}`, badge: f.passed ? "Kaloi" : "Nuk kaloi", to: `/contracts/${f.contract_id}` }));
  const certificates: Row[] = (crts.data ?? []).map((c) => ({ id: c.id, title: nm.get(c.student_id) ?? "Nxënës", meta: `${c.certificate_number} · ${fmt(c.issued_at)}`, badge: c.revoked_at ? "Anuluar" : "E vlefshme", to: `/certificates/${c.id}` }));
  return { applications, contracts, evaluations, certificates, notes: (notes.data ?? []) as Notif[] };
}

export function BusinessActivity({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["business-activity", userId];
  const q = useQuery({ queryKey: key, queryFn: () => load(userId) });
  const [live, setLive] = useState(0);

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: key });
    const ch = supabase
      .channel(`biz-activity-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => { setLive((n) => n + 1); refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts", filter: `business_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "practice_feedback", filter: `business_id=eq.${userId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "certificates", filter: `business_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const list = (rows: Row[] | undefined, empty: string) =>
    q.isLoading ? (
      <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
    ) : !rows?.length ? (
      <p className="p-4 text-sm text-muted-foreground">{empty}</p>
    ) : (
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to={r.to as any} className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-secondary">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.meta}</span>
              </span>
              <Badge variant="secondary" className="shrink-0 text-[10px]">{r.badge}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader className="p-4 sm:p-6"><CardTitle className="text-base">Historiku i biznesit</CardTitle></CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <Tabs defaultValue="apps">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="apps" className="px-1 text-xs sm:text-sm">Aplikime ({q.data?.applications.length ?? 0})</TabsTrigger>
              <TabsTrigger value="cons" className="px-1 text-xs sm:text-sm">Kontrata ({q.data?.contracts.length ?? 0})</TabsTrigger>
              <TabsTrigger value="evals" className="px-1 text-xs sm:text-sm">Vlerësime ({q.data?.evaluations.length ?? 0})</TabsTrigger>
              <TabsTrigger value="certs" className="px-1 text-xs sm:text-sm">Certifikata ({q.data?.certificates.length ?? 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="apps">{list(q.data?.applications, "Ende pa aplikime.")}</TabsContent>
            <TabsContent value="cons">{list(q.data?.contracts, "Ende pa kontrata.")}</TabsContent>
            <TabsContent value="evals">{list(q.data?.evaluations, "Ende pa vlerësime.")}</TabsContent>
            <TabsContent value="certs">{list(q.data?.certificates, "Ende pa certifikata.")}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="min-w-0 flex-row items-center justify-between space-y-0 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
            Njoftime live
          </CardTitle>
          {live > 0 && <Badge>{live} të reja</Badge>}
        </CardHeader>
        <CardContent className="p-2">
          {!q.data?.notes.length ? (
            <p className="p-4 text-sm text-muted-foreground">Asnjë njoftim.</p>
          ) : (
            <ul className="divide-y divide-border">
              {q.data.notes.map((n) => (
                <li key={n.id}>
                  <Link to={(n.link ?? "/notifications") as any} className="flex gap-3 rounded-lg px-3 py-3 hover:bg-secondary">
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      <span className="block line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
