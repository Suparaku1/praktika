import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2, Printer, Users, Award, ClipboardCheck, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PASS_THRESHOLD } from "@/lib/practice/questions";
import { qk } from "@/lib/query/keys";
import { downloadCsv, downloadTablePdf } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Raporte për shkollën | Zemër & Praktikë" },
      { name: "description", content: "Raporte të praktikave profesionale: kalueshmëria, notat mesatare, certifikatat dhe ecuria sipas klasave." },
      { property: "og:title", content: "Raporte për shkollën" },
      { property: "og:description", content: "Statistika të praktikave, kalueshmëria dhe certifikatat sipas klasave." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  className: string;
  students: number;
  contracts: number;
  evaluated: number;
  passed: number;
  avgScore: number | null;
  certificates: number;
};

async function loadReports(): Promise<{ rows: Row[]; totals: Row }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rows: [], totals: emptyRow("Total") };

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, class_students(student_id)")
    .order("created_at", { ascending: false });

  const allStudentIds = Array.from(
    new Set((classes ?? []).flatMap((c: any) => (c.class_students ?? []).map((s: any) => s.student_id))),
  );

  const [{ data: contracts }, { data: feedback }, { data: certs }] = await Promise.all([
    allStudentIds.length
      ? supabase.from("contracts").select("id, student_id, status").in("student_id", allStudentIds)
      : Promise.resolve({ data: [] as any[] } as any),
    allStudentIds.length
      ? supabase.from("practice_feedback").select("id, student_id, score, passed").in("student_id", allStudentIds)
      : Promise.resolve({ data: [] as any[] } as any),
    allStudentIds.length
      ? supabase.from("certificates").select("id, student_id, revoked_at").in("student_id", allStudentIds)
      : Promise.resolve({ data: [] as any[] } as any),
  ]);

  const rows: Row[] = (classes ?? []).map((c: any) => {
    const ids = new Set<string>((c.class_students ?? []).map((s: any) => s.student_id));
    const fb = (feedback ?? []).filter((f: any) => ids.has(f.student_id));
    const scores: number[] = fb.map((f: any) => Number(f.score));
    return {
      className: c.name,
      students: ids.size,
      contracts: (contracts ?? []).filter((x: any) => ids.has(x.student_id)).length,
      evaluated: fb.length,
      passed: fb.filter((f: any) => f.passed).length,
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      certificates: (certs ?? []).filter((x: any) => ids.has(x.student_id) && !x.revoked_at).length,
    };
  });

  const totals = rows.reduce<Row>((acc, r) => ({
    className: "Total",
    students: acc.students + r.students,
    contracts: acc.contracts + r.contracts,
    evaluated: acc.evaluated + r.evaluated,
    passed: acc.passed + r.passed,
    avgScore: null,
    certificates: acc.certificates + r.certificates,
  }), emptyRow("Total"));

  const allScores = (feedback ?? []).map((f: any) => f.score as number);
  totals.avgScore = allScores.length
    ? Math.round((allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) * 10) / 10
    : null;

  return { rows, totals };
}

function emptyRow(name: string): Row {
  return { className: name, students: 0, contracts: 0, evaluated: 0, passed: 0, avgScore: null, certificates: 0 };
}

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: qk.schoolReports(), queryFn: loadReports, staleTime: 30_000 });

  if (isLoading || !data) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const { rows, totals } = data;
  const passRate = totals.evaluated ? Math.round((totals.passed / totals.evaluated) * 100) : 0;

  const headers = ["Klasa", "Nxënës", "Kontrata", "Vlerësime", "Kaluan", "Mesatare", "Certifikata"];
  const tableRows = [...rows, totals].map((r) => [
    r.className, r.students, r.contracts, r.evaluated, r.passed, r.avgScore != null ? `${r.avgScore}/10` : "—", r.certificates,
  ]);
  const exportCsv = () => downloadCsv(`raport-shkolle-${new Date().toISOString().slice(0, 10)}.csv`, headers, tableRows);
  const exportPdf = () =>
    downloadTablePdf({
      title: "Raport për shkollën",
      subtitle: `Kalueshmëria ${passRate}% · Pragu ${PASS_THRESHOLD}/10`,
      headers,
      rows: tableRows,
      filename: `raport-shkolle-${new Date().toISOString().slice(0, 10)}.pdf`,
      orientation: "landscape",
      summary: [
        { label: "Nxënës", value: String(totals.students) },
        { label: "Vlerësime", value: String(totals.evaluated) },
        { label: "Nota mesatare", value: totals.avgScore != null ? `${totals.avgScore}/10` : "—" },
        { label: "Certifikata", value: String(totals.certificates) },
      ],
    });

  return (
    <div className="space-y-6 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Raporte për shkollën</h1>
          <p className="text-sm text-muted-foreground">Ecuria e praktikave sipas klasave — kalueshmëria, notat dhe certifikatat.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Printo
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" onClick={exportPdf}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Nxënës në klasa" value={String(totals.students)} />
        <Kpi icon={ClipboardCheck} label="Vlerësime" value={`${totals.evaluated}`} />
        <Kpi icon={BarChart3} label="Nota mesatare" value={totals.avgScore != null ? `${totals.avgScore}/10` : "—"} />
        <Kpi icon={Award} label="Certifikata aktive" value={String(totals.certificates)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kalueshmëria e përgjithshme</CardTitle>
          <CardDescription>Pragu i kalimit: {PASS_THRESHOLD}/10</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={passRate} />
          <div className="text-sm text-muted-foreground">{totals.passed} nga {totals.evaluated} vlerësime kaluan ({passRate}%).</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sipas klasave</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ende nuk ka klasa me të dhëna.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Klasa</th>
                  <th className="py-2 pr-3">Nxënës</th>
                  <th className="py-2 pr-3">Kontrata</th>
                  <th className="py-2 pr-3">Vlerësime</th>
                  <th className="py-2 pr-3">Kaluan</th>
                  <th className="py-2 pr-3">Mesatare</th>
                  <th className="py-2">Certifikata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.className} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{r.className}</td>
                    <td className="py-2 pr-3">{r.students}</td>
                    <td className="py-2 pr-3">{r.contracts}</td>
                    <td className="py-2 pr-3">{r.evaluated}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={r.evaluated && r.passed === r.evaluated ? "default" : "secondary"}>{r.passed}</Badge>
                    </td>
                    <td className="py-2 pr-3">{r.avgScore != null ? `${r.avgScore}/10` : "—"}</td>
                    <td className="py-2">{r.certificates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}