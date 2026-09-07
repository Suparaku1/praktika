import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, FileSignature, Loader2, Award, FileText, Wallet, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadCsv, downloadTablePdf } from "@/lib/export";

type AppRole = "super_admin" | "teacher" | "student" | "business";
type Period = "30d" | "90d" | "12m";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analitika · Zemër & Praktikë" },
      { name: "description", content: "Grafikë për aplikime, kontrata, pagesa dhe verifikime sipas rolit dhe periudhës." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Analitika · Zemër & Praktikë" },
      { property: "og:description", content: "Grafikë për aplikime, kontrata, pagesa dhe verifikime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown> | undefined = {}): { period: Period } => ({
    period: (typeof s.period === "string" && ["30d", "90d", "12m"].includes(s.period) ? s.period : "90d") as Period,
  }),
  component: AnalyticsPage,
});

const PERIODS: { key: Period; label: string; days: number; bucket: "day" | "month" }[] = [
  { key: "30d", label: "30 ditë", days: 30, bucket: "day" },
  { key: "90d", label: "90 ditë", days: 90, bucket: "day" },
  { key: "12m", label: "12 muaj", days: 365, bucket: "month" },
];

type Point = { label: string; applications: number; contracts: number; payments: number; verifications: number };

function buildBuckets(days: number, bucket: "day" | "month") {
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  if (bucket === "month") {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      out.push({ key: `${start.getFullYear()}-${start.getMonth()}`, label: start.toLocaleDateString("sq-AL", { month: "short" }), start, end });
    }
  } else {
    const step = days > 45 ? 7 : 1;
    for (let i = days - 1; i >= 0; i -= step) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + step);
      out.push({ key: start.toISOString(), label: start.toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit" }), start, end });
    }
  }
  return out;
}

async function loadAnalytics(period: Period) {
  const cfg = PERIODS.find((p) => p.key === period)!;
  const since = new Date();
  since.setDate(since.getDate() - cfg.days);
  const sinceIso = since.toISOString();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nuk je i loguar");

  const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const priority: AppRole[] = ["super_admin", "teacher", "business", "student"];
  const userRoles = (rolesData ?? []).map((r) => r.role as AppRole);
  const role = priority.find((p) => userRoles.includes(p)) ?? "student";

  let appQ = supabase.from("applications").select("id, created_at, status, job_id").gte("created_at", sinceIso);
  let conQ = supabase.from("contracts").select("id, created_at, status, compensation").gte("created_at", sinceIso);
  let certQ = supabase.from("certificates").select("id, issued_at, revoked_at").gte("issued_at", sinceIso);

  if (role === "business") {
    const { data: jobs } = await supabase.from("jobs").select("id").eq("business_id", user.id);
    const jobIds = (jobs ?? []).map((j) => j.id);
    appQ = appQ.in("job_id", jobIds.length ? jobIds : ["00000000-0000-0000-0000-000000000000"]);
    conQ = conQ.eq("business_id", user.id);
    certQ = certQ.eq("business_id", user.id);
  } else if (role === "student") {
    appQ = appQ.eq("student_id", user.id);
    conQ = conQ.eq("student_id", user.id);
    certQ = certQ.eq("student_id", user.id);
  }

  const [{ data: apps }, { data: contracts }, { data: certs }] = await Promise.all([appQ, conQ, certQ]);

  const buckets = buildBuckets(cfg.days, cfg.bucket);
  const series: Point[] = buckets.map((b) => {
    const inRange = (iso?: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= b.start && d < b.end;
    };
    const cons = (contracts ?? []).filter((c) => inRange(c.created_at));
    return {
      label: b.label,
      applications: (apps ?? []).filter((a) => inRange(a.created_at)).length,
      contracts: cons.length,
      payments: cons.reduce((sum, c) => sum + Number(c.compensation ?? 0), 0),
      verifications: (certs ?? []).filter((c) => inRange(c.issued_at) && !c.revoked_at).length,
    };
  });

  const statusCounts = Object.entries(
    (apps ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const contractStatus = Object.entries(
    (contracts ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return {
    role,
    series,
    statusCounts,
    contractStatus,
    totals: {
      applications: (apps ?? []).length,
      contracts: (contracts ?? []).length,
      payments: (contracts ?? []).reduce((s, c) => s + Number(c.compensation ?? 0), 0),
      verifications: (certs ?? []).filter((c) => !c.revoked_at).length,
    },
  };
}

const COLORS = ["hsl(var(--primary))", "#4f8ef7", "#7bb0ff", "#a9cbff", "#c9dcff", "#e0ebff"];

function AnalyticsPage() {
  const { period } = Route.useSearch();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => loadAnalytics(period),
    staleTime: 30_000,
  });

  const periodLabel = useMemo(() => PERIODS.find((p) => p.key === period)?.label ?? "", [period]);

  if (isLoading || !data) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const { series, totals, statusCounts, contractStatus, role } = data;
  const roleLabel = { super_admin: "Super Admin", teacher: "Mësues", business: "Biznes", student: "Nxënës" }[role];

  const exportRows = series.map((p) => [p.label, p.applications, p.contracts, p.payments, p.verifications]);
  const headers = ["Periudha", "Aplikime", "Kontrata", "Pagesa", "Verifikime"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Analitika · {roleLabel}</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Ecuria sipas periudhës</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aplikime, kontrata, pagesa dhe verifikime për {periodLabel.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={p.key === period ? "default" : "outline"}
              onClick={() => navigate({ to: "/analytics", search: { period: p.key }, replace: true })}
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => downloadCsv(`analitika-${period}.csv`, headers, exportRows)}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadTablePdf({
                title: `Analitika — ${roleLabel}`,
                subtitle: `Periudha: ${periodLabel}`,
                headers,
                rows: exportRows,
                filename: `analitika-${period}.pdf`,
                summary: [
                  { label: "Aplikime", value: String(totals.applications) },
                  { label: "Kontrata", value: String(totals.contracts) },
                  { label: "Pagesa", value: `${totals.payments.toLocaleString("sq-AL")} L` },
                  { label: "Verifikime", value: String(totals.verifications) },
                ],
              })
            }
          >
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={FileText} label="Aplikime" value={totals.applications} />
        <Stat icon={FileSignature} label="Kontrata" value={totals.contracts} />
        <Stat icon={Wallet} label="Pagesa" value={totals.payments} suffix=" L" />
        <Stat icon={Award} label="Verifikime" value={totals.verifications} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Aplikime & Kontrata" description="Volumi në kohë">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area name="Aplikime" type="monotone" dataKey="applications" stroke="var(--color-primary)" fill="url(#gApps)" />
              <Line name="Kontrata" type="monotone" dataKey="contracts" stroke="#4f8ef7" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pagesa (kompensim kontratash)" description="Vlera totale për periudhë">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar name="Pagesa" dataKey="payments" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Verifikime (certifikata të vlefshme)" description="Certifikata të lëshuara e të verifikueshme">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line name="Verifikime" type="monotone" dataKey="verifications" stroke="#2f9e6e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Shpërndarja sipas statusit" description="Aplikime dhe kontrata">
          {statusCounts.length === 0 && contractStatus.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Ende nuk ka të dhëna për këtë periudhë.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40}>
                  {statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Pie data={contractStatus} dataKey="value" nameKey="name" outerRadius={110} innerRadius={82}>
                  {contractStatus.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Stat({ icon: I, label, value, suffix }: { icon: typeof BarChart3; label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-semibold uppercase tracking-widest">{label}</CardDescription>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><I className="h-4 w-4" /></div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-bold tabular-nums">
          {(value ?? 0).toLocaleString("sq-AL")}{suffix ?? ""}
        </CardTitle>
      </CardContent>
    </Card>
  );
}
