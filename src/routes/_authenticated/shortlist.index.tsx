import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, Star, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CardListSkeleton } from "@/components/skeletons";
import { qk } from "@/lib/query/keys";

export const Route = createFileRoute("/_authenticated/shortlist/")({
  head: () => ({
    meta: [
      { title: "Përzgjedhja e kandidatëve | Zemër & Praktike" },
      { name: "description", content: "Mësuesi i praktikës shqyrton aplikimet e nxënësve për çdo shpallje dhe përzgjedh kandidatët më të mirë." },
      { property: "og:title", content: "Përzgjedhja e kandidatëve" },
      { property: "og:description", content: "Shqyrto aplikimet dhe përzgjidh nxënësit më të mirë për çdo shpallje pune." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShortlistIndexPage,
});

function ShortlistIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: qk.shortlistJobs(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, job_id, status, job:jobs(id, title, city, deadline, status, business_id)")
        .order("created_at", { ascending: false });
      const { data: shortlisted } = await supabase.from("application_shortlists").select("id, job_id");
      const shortCount = new Map<string, number>();
      for (const s of shortlisted ?? []) shortCount.set(s.job_id, (shortCount.get(s.job_id) ?? 0) + 1);

      const byJob = new Map<string, { job: any; total: number; shortlisted: number }>();
      for (const a of (apps ?? []) as any[]) {
        if (!a.job) continue;
        const entry = byJob.get(a.job_id) ?? { job: a.job, total: 0, shortlisted: shortCount.get(a.job_id) ?? 0 };
        entry.total += 1;
        byJob.set(a.job_id, entry);
      }
      return Array.from(byJob.values());
    },
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Përzgjedhja e kandidatëve</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shqyrto aplikimet për çdo shpallje dhe përzgjidh nxënësit më të mirë. Biznesi konfirmon më pas fituesin.
        </p>
      </header>

      {isLoading ? (
        <CardListSkeleton count={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Ende s'ka aplikime"
          description="Sapo nxënësit të aplikojnë për shpalljet e publikuara, ato do të shfaqen këtu."
        />
      ) : (
        <div className="space-y-3">
          {data.map(({ job, total, shortlisted }) => (
            <Card key={job.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>
                      {job.city ? `${job.city} • ` : ""}
                      {job.deadline ? `Afati: ${new Date(job.deadline).toLocaleDateString("sq-AL")}` : "Pa afat"}
                    </CardDescription>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/shortlist/$jobId" params={{ jobId: job.id }}>
                      Shqyrto <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3.5 w-3.5" /> {total} aplikime
                </Badge>
                <Badge variant={shortlisted > 0 ? "default" : "outline"} className="gap-1">
                  <Star className="h-3.5 w-3.5" /> {shortlisted} të përzgjedhur
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}