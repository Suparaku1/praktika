import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, FileSignature, FileText, Printer, ClipboardCheck, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { downloadCsv, downloadTablePdf } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
  head: () => ({
    meta: [
      { title: "Historiku im · Zemër & Praktikë" },
      { name: "description", content: "Historiku i plotë i aplikimeve, kontratave, vlerësimeve dhe certifikatave të nxënësit." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Historiku im · Zemër & Praktikë" },
      { property: "og:description", content: "Aplikime, kontrata, vlerësime dhe certifikata në një vend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("sq-AL") : "—");

const APP_STATUS: Record<string, string> = {
  pending: "Në pritje",
  reviewing: "Në shqyrtim",
  accepted: "Pranuar",
  rejected: "Refuzuar",
  withdrawn: "Tërhequr",
};

const CONTRACT_STATUS: Record<string, string> = {
  draft: "Draft",
  sent: "Dërguar",
  signed_student: "Nënshkruar nga nxënësi",
  signed_business: "Nënshkruar nga biznesi",
  active: "Aktive",
  completed: "Përfunduar",
  cancelled: "Anuluar",
};

async function loadHistory() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("no-session");
  const uid = user.id;

  const [profile, applications, contracts, feedback, evaluations, certificates] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", uid).maybeSingle(),
    supabase
      .from("applications")
      .select("id, status, created_at, cover_letter, jobs(id, title, city, business_id)")
      .eq("student_id", uid)
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, title, status, start_date, end_date, hours_per_week, compensation, compensation_currency, location, created_at")
      .eq("student_id", uid)
      .order("created_at", { ascending: false }),
    supabase
      .from("practice_feedback")
      .select("id, score, passed, comment, submitted_at, created_at, contract_id, contracts(title)")
      .eq("student_id", uid)
      .order("created_at", { ascending: false }),
    supabase
      .from("practice_evaluations")
      .select("id, score, attendance_percent, period_start, period_end, strengths, improvements, comment, created_at")
      .eq("student_id", uid)
      .order("created_at", { ascending: false }),
    supabase
      .from("certificates")
      .select("id, certificate_number, title, final_grade, hours_completed, issued_at, revoked_at")
      .eq("student_id", uid)
      .order("issued_at", { ascending: false }),
  ]);

  return {
    name: profile.data?.full_name || profile.data?.email || "Nxënës",
    applications: applications.data ?? [],
    contracts: contracts.data ?? [],
    feedback: feedback.data ?? [],
    evaluations: evaluations.data ?? [],
    certificates: certificates.data ?? [],
  };
}

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["student-history"], queryFn: loadHistory });

  const subtitle = data ? `Historiku i praktikës · ${data.name}` : "Historiku i praktikës";

  const exports = {
    applications: () => ({
      headers: ["Shpallja", "Qyteti", "Statusi", "Data"],
      rows: (data?.applications ?? []).map((a) => [a.jobs?.title ?? "—", a.jobs?.city ?? "—", APP_STATUS[a.status] ?? a.status, fmt(a.created_at)]),
      title: "Historiku i aplikimeve",
      file: "aplikimet",
    }),
    contracts: () => ({
      headers: ["Kontrata", "Statusi", "Fillimi", "Mbarimi", "Orë/javë", "Vendndodhja"],
      rows: (data?.contracts ?? []).map((c) => [c.title, CONTRACT_STATUS[c.status] ?? c.status, fmt(c.start_date), fmt(c.end_date), c.hours_per_week ?? "—", c.location ?? "—"]),
      title: "Historiku i kontratave",
      file: "kontratat",
    }),
    evaluations: () => ({
      headers: ["Lloji", "Referenca", "Nota", "Rezultati", "Data"],
      rows: [
        ...(data?.feedback ?? []).map((f) => ["Vlerësim përfundimtar", f.contracts?.title ?? "—", `${f.score}/10`, f.passed ? "Kaloi" : "Nuk kaloi", fmt(f.submitted_at ?? f.created_at)]),
        ...(data?.evaluations ?? []).map((e) => ["Vlerësim periodik", `${fmt(e.period_start)} – ${fmt(e.period_end)}`, e.score != null ? `${e.score}/10` : "—", e.attendance_percent != null ? `Prezenca ${e.attendance_percent}%` : "—", fmt(e.created_at)]),
      ],
      title: "Historiku i vlerësimeve",
      file: "vleresimet",
    }),
    certificates: () => ({
      headers: ["Numri", "Titulli", "Nota", "Orë", "Lëshuar", "Statusi"],
      rows: (data?.certificates ?? []).map((c) => [c.certificate_number, c.title, c.final_grade ?? "—", c.hours_completed ?? "—", fmt(c.issued_at), c.revoked_at ? "Anuluar" : "E vlefshme"]),
      title: "Historiku i certifikatave",
      file: "certifikatat",
    }),
  };

  const doCsv = (k: keyof typeof exports) => {
    const e = exports[k]();
    downloadCsv(`${e.file}.csv`, e.headers, e.rows);
  };
  const doPdf = (k: keyof typeof exports) => {
    const e = exports[k]();
    downloadTablePdf({ title: e.title, subtitle, headers: e.headers, rows: e.rows, filename: `${e.file}.pdf`, orientation: "landscape" });
  };

  const Toolbar = ({ k }: { k: keyof typeof exports }) => (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button size="sm" variant="outline" onClick={() => doCsv(k)}><Sheet className="mr-2 h-4 w-4" />CSV</Button>
      <Button size="sm" variant="outline" onClick={() => doPdf(k)}><Download className="mr-2 h-4 w-4" />PDF</Button>
      <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Printo</Button>
    </div>
  );

  return (
    <AppShell role="student">
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historiku im</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </header>

        {isLoading || !data ? (
          <GridSkeleton count={4} />
        ) : (
          <Tabs defaultValue="applications">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 print:hidden">
              <TabsTrigger value="applications" className="gap-1.5"><FileText className="h-4 w-4" />Aplikime</TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5"><FileSignature className="h-4 w-4" />Kontrata</TabsTrigger>
              <TabsTrigger value="evaluations" className="gap-1.5"><ClipboardCheck className="h-4 w-4" />Vlerësime</TabsTrigger>
              <TabsTrigger value="certificates" className="gap-1.5"><Award className="h-4 w-4" />Certifikata</TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-4 space-y-4">
              <Toolbar k="applications" />
              {data.applications.length === 0 ? (
                <EmptyState icon={FileText} title="Ende pa aplikime" description="Shfleto praktikat e disponueshme dhe apliko për të parën." />
              ) : (
                <div className="space-y-3">
                  {data.applications.map((a) => (
                    <Card key={a.id}>
                      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base">{a.jobs?.title ?? "Shpallje e fshirë"}</CardTitle>
                          <CardDescription>{a.jobs?.city ?? "—"} · {fmt(a.created_at)}</CardDescription>
                        </div>
                        <Badge variant={a.status === "accepted" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>
                          {APP_STATUS[a.status] ?? a.status}
                        </Badge>
                      </CardHeader>
                      {a.jobs?.id && (
                        <CardContent className="print:hidden">
                          <Button asChild size="sm" variant="outline"><Link to="/jobs/$id" params={{ id: a.jobs.id }}>Shiko shpalljen</Link></Button>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="contracts" className="mt-4 space-y-4">
              <Toolbar k="contracts" />
              {data.contracts.length === 0 ? (
                <EmptyState icon={FileSignature} title="Ende pa kontrata" description="Kontratat e praktikës shfaqen këtu pasi biznesi të konfirmojë." />
              ) : (
                <div className="space-y-3">
                  {data.contracts.map((c) => (
                    <Card key={c.id}>
                      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base">{c.title}</CardTitle>
                          <CardDescription>
                            {fmt(c.start_date)} – {fmt(c.end_date)} · {c.hours_per_week ?? "—"} orë/javë · {c.location ?? "—"}
                          </CardDescription>
                        </div>
                        <Badge variant={c.status === "completed" ? "default" : "secondary"}>{CONTRACT_STATUS[c.status] ?? c.status}</Badge>
                      </CardHeader>
                      <CardContent className="print:hidden">
                        <Button asChild size="sm" variant="outline"><Link to="/contracts/$id" params={{ id: c.id }}>Hap kontratën</Link></Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="evaluations" className="mt-4 space-y-4">
              <Toolbar k="evaluations" />
              {data.feedback.length === 0 && data.evaluations.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="Ende pa vlerësime" description="Vlerësimet nga biznesi dhe mësuesi shfaqen këtu gjatë praktikës." />
              ) : (
                <div className="space-y-3">
                  {data.feedback.map((f) => (
                    <Card key={f.id}>
                      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base">Vlerësim përfundimtar · {f.contracts?.title ?? "Kontratë"}</CardTitle>
                          <CardDescription>{fmt(f.submitted_at ?? f.created_at)} · {f.comment ?? "Pa koment"}</CardDescription>
                        </div>
                        <Badge variant={f.passed ? "default" : "destructive"}>{f.score}/10</Badge>
                      </CardHeader>
                    </Card>
                  ))}
                  {data.evaluations.map((e) => (
                    <Card key={e.id}>
                      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base">Vlerësim periodik</CardTitle>
                          <CardDescription>
                            {fmt(e.period_start)} – {fmt(e.period_end)}
                            {e.attendance_percent != null ? ` · Prezenca ${e.attendance_percent}%` : ""}
                            {e.strengths ? ` · ${e.strengths}` : ""}
                          </CardDescription>
                        </div>
                        {e.score != null && <Badge variant="secondary">{e.score}/10</Badge>}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="certificates" className="mt-4 space-y-4">
              <Toolbar k="certificates" />
              {data.certificates.length === 0 ? (
                <EmptyState icon={Award} title="Ende pa certifikata" description="Certifikata lëshohet automatikisht kur vlerësimi është 7/10 ose më lart." />
              ) : (
                <div className="space-y-3">
                  {data.certificates.map((c) => (
                    <Card key={c.id}>
                      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base">{c.title}</CardTitle>
                          <CardDescription>
                            {c.certificate_number} · {fmt(c.issued_at)}
                            {c.final_grade != null ? ` · Nota ${c.final_grade}/10` : ""}
                            {c.hours_completed != null ? ` · ${c.hours_completed} orë` : ""}
                          </CardDescription>
                        </div>
                        <Badge variant={c.revoked_at ? "destructive" : "default"}>{c.revoked_at ? "Anuluar" : "E vlefshme"}</Badge>
                      </CardHeader>
                      <CardContent className="print:hidden">
                        <Button asChild size="sm" variant="outline"><Link to="/certificates/$id" params={{ id: c.id }}>Hap & shkarko PDF</Link></Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
