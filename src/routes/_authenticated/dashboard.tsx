import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Heart, GraduationCap, Building2, Users, Shield, FileText, Briefcase, CheckCircle2,
  AlertCircle, BarChart3, Plus, FileSignature, MessageCircle, Award, Bookmark, ClipboardCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GridSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { BusinessActivity } from "@/components/business-activity";

type AppRole = "super_admin" | "teacher" | "student" | "business";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Paneli im | Zemër & Praktikë" },
      { name: "description", content: "Pasqyra jote personale: aplikime, kontrata, vlerësime dhe certifikata në një vend." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const roleMeta: Record<AppRole, { icon: typeof Heart; tone: string }> = {
  super_admin: { icon: Shield, tone: "bg-primary/10 text-primary" },
  teacher: { icon: Users, tone: "bg-primary/10 text-primary" },
  student: { icon: GraduationCap, tone: "bg-accent/20 text-foreground" },
  business: { icon: Building2, tone: "bg-primary/10 text-primary" },
};

type Stat = { key: TranslationKey; value: number; icon: typeof Heart; to: string };

async function loadIdentity() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("no-session");
  const [{ data: prof }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const priority: AppRole[] = ["super_admin", "teacher", "business", "student"];
  const userRoles = (roles ?? []).map((r) => r.role as AppRole);
  const role = priority.find((p) => userRoles.includes(p)) ?? "student";

  let profileComplete = true;
  let businessVerified: boolean | null = null;
  if (role === "student") {
    const { data } = await supabase.from("student_profiles").select("school_name, professional_program").eq("user_id", user.id).maybeSingle();
    profileComplete = Boolean(data?.school_name && data?.professional_program);
  } else if (role === "business") {
    const { data } = await supabase.from("business_profiles").select("nipt, sector, verified").eq("user_id", user.id).maybeSingle();
    profileComplete = Boolean(data?.nipt && data?.sector);
    businessVerified = data?.verified ?? false;
  } else if (role === "teacher") {
    const { data } = await supabase.from("teacher_profiles").select("school_name, subject").eq("user_id", user.id).maybeSingle();
    profileComplete = Boolean(data?.school_name && data?.subject);
  }

  return {
    userId: user.id,
    profile: prof ?? { full_name: null, email: user.email ?? null },
    role,
    profileComplete,
    businessVerified,
  };
}

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

async function loadStats(userId: string, role: AppRole): Promise<Stat[]> {
  if (role === "student") {
    const [applications, contracts, certificates, saved, unread] = await Promise.all([
      count(supabase.from("applications").select("id", { count: "exact", head: true }).eq("student_id", userId)),
      count(supabase.from("contracts").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("status", "active")),
      count(supabase.from("certificates").select("id", { count: "exact", head: true }).eq("student_id", userId)),
      count(supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", userId)),
      count(supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false)),
    ]);
    return [
      { key: "dash.stat.applications", value: applications, icon: FileText, to: "/applications" },
      { key: "dash.stat.contracts", value: contracts, icon: FileSignature, to: "/contracts" },
      { key: "dash.stat.certificates", value: certificates, icon: Award, to: "/certificates" },
      { key: "dash.stat.saved", value: saved, icon: Bookmark, to: "/saved" },
      { key: "dash.stat.unread", value: unread, icon: MessageCircle, to: "/notifications" },
    ];
  }

  if (role === "business") {
    const { data: jobRows } = await supabase.from("jobs").select("id, status").eq("business_id", userId);
    const jobIds = (jobRows ?? []).map((j) => j.id);
    const activeJobs = (jobRows ?? []).filter((j) => j.status === "published").length;
    const [candidates, contracts, certificates] = await Promise.all([
      jobIds.length
        ? count(supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id", jobIds))
        : Promise.resolve(0),
      count(supabase.from("contracts").select("id", { count: "exact", head: true }).eq("business_id", userId).eq("status", "active")),
      count(supabase.from("certificates").select("id", { count: "exact", head: true }).eq("business_id", userId)),
    ]);
    return [
      { key: "dash.stat.jobs", value: activeJobs, icon: Briefcase, to: "/jobs/manage" },
      { key: "dash.stat.candidates", value: candidates, icon: Users, to: "/applications" },
      { key: "dash.stat.contracts", value: contracts, icon: FileSignature, to: "/contracts" },
      { key: "dash.stat.certificates", value: certificates, icon: Award, to: "/certificates" },
    ];
  }

  if (role === "teacher") {
    const { data: classRows } = await supabase.from("classes").select("id").eq("teacher_id", userId);
    const classIds = (classRows ?? []).map((c) => c.id);
    const [students, contracts, pending] = await Promise.all([
      classIds.length
        ? count(supabase.from("class_students").select("id", { count: "exact", head: true }).in("class_id", classIds))
        : Promise.resolve(0),
      count(supabase.from("contracts").select("id", { count: "exact", head: true }).eq("teacher_id", userId).eq("status", "active")),
      count(supabase.from("contracts").select("id", { count: "exact", head: true }).eq("teacher_id", userId).eq("status", "completed")),
    ]);
    return [
      { key: "dash.stat.classes", value: classIds.length, icon: Users, to: "/classes" },
      { key: "dash.stat.students", value: students, icon: GraduationCap, to: "/classes" },
      { key: "dash.stat.contracts", value: contracts, icon: FileSignature, to: "/contracts" },
      { key: "dash.stat.pendingFeedback", value: pending, icon: ClipboardCheck, to: "/feedback" },
    ];
  }

  const [users, businesses, pendingVerify, jobs] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true })),
    count(supabase.from("business_profiles").select("user_id", { count: "exact", head: true })),
    count(supabase.from("business_profiles").select("user_id", { count: "exact", head: true }).eq("verified", false)),
    count(supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published")),
  ]);
  return [
    { key: "dash.stat.users", value: users, icon: Users, to: "/admin/users" },
    { key: "dash.stat.businesses", value: businesses, icon: Building2, to: "/admin/businesses" },
    { key: "dash.stat.pendingVerify", value: pendingVerify, icon: AlertCircle, to: "/admin/businesses" },
    { key: "dash.stat.jobs", value: jobs, icon: Briefcase, to: "/admin/jobs" },
  ];
}

type RecentItem = { id: string; title: string; meta: string; to: string; badge?: string };

const dt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("sq-AL") : "—");

async function loadRecent(userId: string, role: AppRole): Promise<RecentItem[]> {
  if (role === "student") {
    const { data } = await supabase
      .from("applications")
      .select("id, status, created_at, jobs(title)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.jobs?.title ?? "Shpallje",
      meta: dt(a.created_at),
      to: "/applications",
      badge: a.status,
    }));
  }
  if (role === "business") {
    const { data: jobs } = await supabase.from("jobs").select("id, title").eq("business_id", userId);
    const ids = (jobs ?? []).map((j) => j.id);
    if (!ids.length) return [];
    const titles = new Map((jobs ?? []).map((j) => [j.id, j.title]));
    const { data } = await supabase
      .from("applications")
      .select("id, job_id, status, created_at")
      .in("job_id", ids)
      .order("created_at", { ascending: false })
      .limit(5);
    return (data ?? []).map((a) => ({
      id: a.id,
      title: titles.get(a.job_id) ?? "Shpallje",
      meta: dt(a.created_at),
      to: "/applications",
      badge: a.status,
    }));
  }
  if (role === "teacher") {
    const { data } = await supabase
      .from("contracts")
      .select("id, title, status, created_at")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    return (data ?? []).map((c) => ({ id: c.id, title: c.title, meta: dt(c.created_at), to: "/contracts", badge: c.status }));
  }
  const { data } = await supabase
    .from("jobs")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []).map((j) => ({ id: j.id, title: j.title, meta: dt(j.created_at), to: "/admin/jobs", badge: j.status }));
}

function DashboardPage() {
  const { t } = useI18n();
  const identity = useQuery({ queryKey: ["dashboard-identity"], queryFn: loadIdentity });
  const role = identity.data?.role ?? null;

  const stats = useQuery({
    queryKey: ["dashboard-stats", identity.data?.userId, role],
    queryFn: () => loadStats(identity.data!.userId, role!),
    enabled: Boolean(identity.data),
  });

  const recent = useQuery({
    queryKey: ["dashboard-recent", identity.data?.userId, role],
    queryFn: () => loadRecent(identity.data!.userId, role!),
    enabled: Boolean(identity.data),
  });

  if (identity.isLoading || !identity.data || !role) {
    return (
      <><div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
          <PageHeaderSkeleton />
          <GridSkeleton count={6} />
        </div>
      </>
    );
  }

  const { profile, profileComplete, businessVerified } = identity.data;
  const Icon = roleMeta[role].icon;
  const name = profile?.full_name || profile?.email?.split("@")[0] || t("dash.user");

  return (
    <><div className="container mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${roleMeta[role].tone}`}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t(`dash.role.${role}` as TranslationKey)}
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("dash.welcome")}, {name}!
                </h1>
                <p className="mt-2 text-muted-foreground">{t(`dash.tagline.${role}` as TranslationKey)}</p>
              </div>
            </div>
            {role === "business" && businessVerified !== null && (
              <Badge variant={businessVerified ? "default" : "secondary"} className="gap-1">
                {businessVerified
                  ? <><CheckCircle2 className="h-3.5 w-3.5" /> {t("dash.verified")}</>
                  : <><AlertCircle className="h-3.5 w-3.5" /> {t("dash.unverified")}</>}
              </Badge>
            )}
          </div>
        </div>

        {!profileComplete && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="flex-row items-start gap-4 space-y-0">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-base">{t("dash.completeProfile")}</CardTitle>
                <CardDescription className="mt-1">
                  {t(`dash.completeProfile.${role}` as TranslationKey)}
                </CardDescription>
              </div>
              <Button asChild size="sm">
                <Link to="/profile">{t("dash.continue")}</Link>
              </Button>
            </CardHeader>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("dash.overview")}</h2>
          {stats.isLoading || !stats.data ? (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {stats.data.map((s) => (
                <StatCard key={s.key} label={t(s.key)} value={s.value} icon={s.icon} to={s.to} />
              ))}
            </div>
          )}
        </section>

        {role === "business" && <BusinessActivity userId={identity.data.userId} />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="min-w-0 space-y-3 lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t("dash.quickActions")}</h2>
            <RoleSections role={role} />
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Aktiviteti i fundit</h2>
            <Card>
              <CardContent className="p-2">
                {recent.isLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (recent.data ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Ende pa aktivitet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {(recent.data ?? []).map((r) => (
                      <li key={r.id}>
                        <Link to={r.to as any} className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-secondary">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{r.title}</span>
                            <span className="block text-xs text-muted-foreground">{r.meta}</span>
                          </span>
                          {r.badge && <Badge variant="secondary" className="shrink-0 text-[10px]">{r.badge}</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, icon: I, to }: { label: string; value: number; icon: typeof Heart; to: string }) {
  return (
    <Link to={to as any} className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-elegant)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <I className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</div>
    </Link>
  );
}

function RoleSections({ role }: { role: AppRole }) {
  const { t } = useI18n();
  const open = t("dash.open");
  const browse = t("dash.browse");

  if (role === "student") {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <ActionCard icon={Briefcase} title={t("app.jobs")} desc="Shfleto mundësitë nga bizneset partnere." to="/jobs" cta={browse} />
        <ActionCard icon={FileText} title={t("app.applications")} desc="Ndiq statusin e çdo aplikimi." to="/applications" cta={open} />
        <ActionCard icon={FileSignature} title={t("app.contracts")} desc="Shih dhe nënshkruaj kontratat e praktikës." to="/contracts" cta={open} />
        <ActionCard icon={Award} title={t("app.certificates")} desc="Certifikatat e tua të praktikës." to="/certificates" cta={open} />
        <ActionCard icon={Users} title={t("app.classes")} desc="Shih klasat ku je pjesë dhe vlerësimet." to="/classes" cta={open} />
        <ActionCard icon={MessageCircle} title={t("app.messages")} desc="Bisedo me bizneset dhe mësuesit." to="/messages" cta={open} />
        <ActionCard icon={Bookmark} title={t("app.saved")} desc="Shpalljet që ke ruajtur." to="/saved" cta={open} />
        <ActionCard icon={FileText} title={t("app.history")} desc="Aplikime, kontrata, vlerësime dhe certifikata me print/PDF." to="/history" cta={open} />
        <ActionCard icon={BarChart3} title={t("app.analytics")} desc="Statistikat e aktivitetit tënd." to="/analytics" cta={open} />
      </div>
    );
  }
  if (role === "business") {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <ActionCard icon={Plus} title={t("app.myJobs")} desc="Publiko praktikë ose punë në minuta." to="/jobs/new" cta={t("dash.create")} />
        <ActionCard icon={Briefcase} title={t("app.myJobs")} desc="Menaxho dhe shiko statusin e shpalljeve." to="/jobs/manage" cta={open} />
        <ActionCard icon={FileText} title={t("app.applications")} desc="Shqyrto kandidatët e marrë." to="/applications" cta={open} />
        <ActionCard icon={CheckCircle2} title={t("app.winners")} desc="Konfirmo fituesit e propozuar nga shkolla." to="/winners" cta={open} />
        <ActionCard icon={FileSignature} title={t("app.contracts")} desc="Krijo dhe menaxho kontratat dixhitale." to="/contracts" cta={open} />
        <ActionCard icon={Award} title={t("app.certificates")} desc="Certifikatat që ke lëshuar." to="/certificates" cta={open} />
        <ActionCard icon={MessageCircle} title={t("app.messages")} desc="Bisedo me kandidatët dhe nxënësit." to="/messages" cta={open} />
        <ActionCard icon={BarChart3} title={t("app.analytics")} desc="Performanca e shpalljeve dhe kontratave." to="/analytics" cta={open} />
      </div>
    );
  }
  if (role === "teacher") {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <ActionCard icon={Users} title={t("app.classes")} desc="Krijo klasa, shto nxënës, vlerëso praktikën." to="/classes" cta={open} />
        <ActionCard icon={ClipboardCheck} title={t("app.shortlist")} desc="Përzgjidh kandidatët për çdo shpallje." to="/shortlist" cta={open} />
        <ActionCard icon={ClipboardCheck} title={t("app.feedback")} desc="Vlerëso praktikën me 10 kategoritë." to="/feedback" cta={open} />
        <ActionCard icon={FileSignature} title={t("app.contracts")} desc="Mbikëqyr kontratat e praktikës." to="/contracts" cta={open} />
        <ActionCard icon={Award} title={t("app.certificates")} desc="Certifikatat e lëshuara në platformë." to="/certificates" cta={open} />
        <ActionCard icon={BarChart3} title={t("app.reports")} desc="Raporte të plota për shkollën." to="/reports" cta={open} />
        <ActionCard icon={Briefcase} title={t("app.jobs")} desc="Shih të gjitha praktikat aktive." to="/jobs" cta={browse} />
        <ActionCard icon={MessageCircle} title={t("app.messages")} desc="Bisedo me nxënësit dhe bizneset." to="/messages" cta={open} />
      </div>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      <ActionCard icon={Shield} title={t("app.admin")} desc="Pasqyrë, statistika dhe veprime të platformës." to="/admin" cta={open} />
      <ActionCard icon={Users} title={t("app.users")} desc="Menaxho rolet e të gjithë përdoruesve." to="/admin/users" cta={open} />
      <ActionCard icon={Building2} title={t("app.businesses")} desc="Verifiko bizneset e regjistruara." to="/admin/businesses" cta={open} />
      <ActionCard icon={Briefcase} title={t("app.jobs")} desc="Shqyrto shpalljet në platformë." to="/admin/jobs" cta={open} />
      <ActionCard icon={BarChart3} title={t("app.reports")} desc="Raporte për shkollat dhe klasat." to="/reports" cta={open} />
      <ActionCard icon={BarChart3} title={t("app.analytics")} desc="Statistika për gjithë platformën." to="/analytics" cta={open} />
      <ActionCard icon={Award} title={t("app.certificates")} desc="Të gjitha certifikatat e lëshuara." to="/certificates" cta={open} />
      <ActionCard icon={FileSignature} title={t("app.contracts")} desc="Të gjitha kontratat në platformë." to="/contracts" cta={open} />
    </div>
  );
}

function ActionCard({ icon: I, title, desc, to, cta }: { icon: typeof Heart; title: string; desc: string; to: string; cta: string }) {
  return (
    <Card className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <I className="h-5 w-5" />
        </div>
        <CardTitle className="mt-3 text-base">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant="outline"><Link to={to as any}>{cta}</Link></Button>
      </CardContent>
    </Card>
  );
}
