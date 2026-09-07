import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Briefcase, MapPin, Search, Building2, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18n, type TranslationKey } from "@/lib/i18n";

type Job = {
  id: string;
  title: string;
  description: string;
  job_type: string;
  work_mode: string;
  city: string | null;
  category: string | null;
  skills: string[] | null;
  created_at: string;
  business_id: string;
};

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Praktika & Punë — Zemër & Praktike" },
      { name: "description", content: "Shfleto qindra mundësi praktikash dhe punësimi nga bizneset partnere në të gjithë Shqipërinë." },
      { property: "og:title", content: "Praktika & Punë — Zemër & Praktike" },
      { property: "og:description", content: "Lidh nxënësit me bizneset. Aplikoni në minuta." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/jobs" },
    ],
    links: [{ rel: "canonical", href: "/jobs" }],
  }),
  validateSearch: (search: Record<string, unknown> | undefined = {}): { q?: string; type?: string; mode?: string } => ({
    q: typeof search.q === "string" ? search.q : "",
    type: typeof search.type === "string" ? search.type : "all",
    mode: typeof search.mode === "string" ? search.mode : "all",
  }),
  component: JobsPage,
});

function JobsPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const tk = (k: string) => t(k as TranslationKey);
  const { q, type, mode } = Route.useSearch();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocal, setSearchLocal] = useState(q);

  // Sync local input with URL
  useEffect(() => { setSearchLocal(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchLocal !== q) {
        navigate({ to: "/jobs", search: { q: searchLocal, type, mode }, replace: true });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchLocal, q, type, mode, navigate]);

  const setType = (v: string) =>
    navigate({ to: "/jobs", search: { q, type: v, mode }, replace: true });
  const setMode = (v: string) =>
    navigate({ to: "/jobs", search: { q, type, mode: v }, replace: true });
  const clear = () => navigate({ to: "/jobs", search: { q: "", type: "all", mode: "all" }, replace: true });
  const hasFilters = q !== "" || type !== "all" || mode !== "all";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, description, job_type, work_mode, city, category, skills, created_at, business_id")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setJobs((data as Job[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = jobs.filter((j) => {
    if (type !== "all" && j.job_type !== type) return false;
    if (mode !== "all" && j.work_mode !== mode) return false;
    if (q) {
      const query = q.toLowerCase();
      return (
        j.title.toLowerCase().includes(query) ||
        (j.city ?? "").toLowerCase().includes(query) ||
        (j.category ?? "").toLowerCase().includes(query) ||
        (j.skills ?? []).some((s) => s.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">{t("jobs.title")}</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? t("jobs.loading") : `${filtered.length} ${t("jobs.countSuffix")}`}
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("jobs.searchPlaceholder")}
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder={t("jobs.filter.type")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.type.all")}</SelectItem>
              <SelectItem value="internship">{t("jobs.type.internship")}</SelectItem>
              <SelectItem value="apprenticeship">{t("jobs.type.apprenticeship")}</SelectItem>
              <SelectItem value="full_time">{t("jobs.type.full_time")}</SelectItem>
              <SelectItem value="part_time">{t("jobs.type.part_time")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder={t("jobs.filter.mode")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.mode.all")}</SelectItem>
              <SelectItem value="onsite">{t("jobs.mode.onsite")}</SelectItem>
              <SelectItem value="hybrid">{t("jobs.mode.hybrid")}</SelectItem>
              <SelectItem value="remote">{t("jobs.mode.remote")}</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" onClick={clear}>{t("jobs.clear")}</Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">{t("jobs.empty.title")}</CardTitle>
              <CardDescription>{t("jobs.empty.desc")}</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((job) => (
              <Link key={job.id} to="/jobs/$id" params={{ id: job.id }} className="block">
                <Card className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {job.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.city}</span>}
                          <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {tk(`jobs.mode.${job.work_mode}`)}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(job.created_at).toLocaleDateString(locale)}</span>
                        </div>
                      </div>
                      <Badge>{tk(`jobs.type.${job.job_type}`)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                    {job.skills && job.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.skills.slice(0, 6).map((s) => (
                          <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}