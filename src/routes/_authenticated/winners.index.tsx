import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Star, Loader2, CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { confirmWinner as confirmWinnerFn } from "@/lib/workflow/practice.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CardListSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { qk } from "@/lib/query/keys";

export const Route = createFileRoute("/_authenticated/winners/")({
  head: () => ({
    meta: [
      { title: "Konfirmo fituesin | Zemër & Praktike" },
      { name: "description", content: "Biznesi konfirmon nxënësin fitues nga lista e kandidatëve të përzgjedhur nga mësuesi i praktikës." },
      { property: "og:title", content: "Konfirmo fituesin e shpalljes" },
      { property: "og:description", content: "Shiko kandidatët e përzgjedhur nga mësuesi dhe konfirmo nxënësin fitues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WinnersPage,
});

function WinnersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const confirmWinnerRpc = useServerFn(confirmWinnerFn);

  const { data, isLoading } = useQuery({
    queryKey: qk.winnerJobs(),
    staleTime: 15_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { jobs: [] as any[] };
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, city, deadline, positions, status")
        .eq("business_id", user.id)
        .order("created_at", { ascending: false });
      const jobIds = (jobs ?? []).map((j) => j.id);
      if (!jobIds.length) return { jobs: [] as any[] };

      const [{ data: shorts }, { data: apps }, { data: contracts }] = await Promise.all([
        supabase.from("application_shortlists").select("*").in("job_id", jobIds).order("rank", { ascending: true }),
        supabase.from("applications").select("id, job_id, student_id, status, cover_letter").in("job_id", jobIds),
        supabase.from("contracts").select("id, job_id, student_id, winner_confirmed_at").in("job_id", jobIds),
      ]);

      const studentIds = Array.from(new Set((apps ?? []).map((a) => a.student_id)));
      const [{ data: profs }, { data: sprofs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("student_profiles").select("user_id, school_name, professional_program, study_year, skills").in("user_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const sMap = new Map((sprofs ?? []).map((p: any) => [p.user_id, p]));
      const aMap = new Map((apps ?? []).map((a: any) => [a.id, a]));

      const rows = (jobs ?? []).map((j: any) => {
        const jobShorts = (shorts ?? []).filter((s: any) => s.job_id === j.id);
        return {
          ...j,
          contract: (contracts ?? []).find((c: any) => c.job_id === j.id && c.winner_confirmed_at) ?? null,
          candidates: jobShorts.map((s: any) => {
            const app = aMap.get(s.application_id);
            return {
              shortlist: s,
              application: app,
              profile: app ? pMap.get(app.student_id) : null,
              student: app ? sMap.get(app.student_id) : null,
            };
          }).filter((c: any) => c.application),
        };
      }).filter((j: any) => j.candidates.length > 0);

      return { jobs: rows };
    },
  });

  const confirmWinner = async (job: any, cand: any) => {
    setBusy(cand.application.id);
    try {
      const { contractId } = await confirmWinnerRpc({
        data: { jobId: job.id, applicationId: cand.application.id },
      });
      toast.success("Fituesi u konfirmua dhe kontrata u krijua");
      await qc.invalidateQueries({ queryKey: qk.winnerJobs() });
      navigate({ to: "/contracts/$id", params: { id: contractId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Diçka shkoi keq");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Konfirmo fituesin</h1>
        <p className="text-muted-foreground text-sm">
          Kandidatët e përzgjedhur nga mësuesi i praktikës për shpalljet e tua.
        </p>
      </div>

      {isLoading ? (
        <CardListSkeleton />
      ) : !data?.jobs.length ? (
        <EmptyState
          icon={Trophy}
          title="Asnjë kandidat i përzgjedhur"
          description="Sapo mësuesi i praktikës të përzgjedhë kandidatët për shpalljet e tua, ata shfaqen këtu për konfirmim."
          action={{ label: "Shpalljet e mia", to: "/jobs/manage" }}
        />
      ) : (
        <div className="space-y-6">
          {data.jobs.map((job: any) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>
                      {job.city ?? "—"} · {job.candidates.length} kandidatë të përzgjedhur
                      {job.deadline ? ` · afati ${new Date(job.deadline).toLocaleDateString("sq-AL")}` : ""}
                    </CardDescription>
                  </div>
                  {job.contract ? (
                    <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Fituesi u konfirmua</Badge>
                  ) : (
                    <Badge variant="secondary">Në pritje të konfirmimit</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.candidates.map((c: any) => {
                  const isWinner = job.contract?.student_id === c.application.student_id;
                  return (
                    <div key={c.application.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" />
                            <span className="font-medium">{c.profile?.full_name || c.profile?.email || "Nxënës"}</span>
                            {c.shortlist.rank ? <Badge variant="outline">#{c.shortlist.rank}</Badge> : null}
                            {isWinner ? <Badge className="gap-1"><Trophy className="h-3 w-3" /> Fitues</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {[c.student?.school_name, c.student?.professional_program, c.student?.study_year ? `Viti ${c.student.study_year}` : null]
                              .filter(Boolean)
                              .join(" · ") || "Profil pa detaje"}
                          </p>
                          {c.shortlist.note ? (
                            <p className="text-sm"><span className="text-muted-foreground">Shënim i mësuesit:</span> {c.shortlist.note}</p>
                          ) : null}
                          {c.student?.skills?.length ? (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {c.student.skills.slice(0, 6).map((s: string) => (
                                <Badge key={s} variant="secondary">{s}</Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          {job.contract ? (
                            isWinner ? (
                              <Button asChild variant="outline" size="sm">
                                <Link to="/contracts/$id" params={{ id: job.contract.id }}>Shiko kontratën</Link>
                              </Button>
                            ) : null
                          ) : (
                            <Button size="sm" disabled={busy === c.application.id} onClick={() => confirmWinner(job, c)}>
                              {busy === c.application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                              Konfirmo fituesin
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!job.candidates.length ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Pa kandidatë</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
