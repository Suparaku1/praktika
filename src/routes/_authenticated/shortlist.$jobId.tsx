import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Star, StarOff, Users, MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyAndEmail } from "@/lib/notify";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { CardListSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { qk } from "@/lib/query/keys";

export const Route = createFileRoute("/_authenticated/shortlist/$jobId")({
  head: () => ({
    meta: [
      { title: "Kandidatët e shpalljes | Zemër & Praktike" },
      { name: "description", content: "Lista e nxënësve që kanë aplikuar për këtë shpallje dhe përzgjedhja e kandidatëve më të mirë nga mësuesi i praktikës." },
      { property: "og:title", content: "Kandidatët e shpalljes" },
      { property: "og:description", content: "Përzgjidh dhe rendit nxënësit më të mirë për këtë shpallje pune." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShortlistJobPage,
});

function ShortlistJobPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: qk.shortlistJob(jobId),
    staleTime: 15_000,
    queryFn: async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("id, title, city, deadline, positions, business_id")
        .eq("id", jobId)
        .maybeSingle();
      const { data: apps } = await supabase
        .from("applications")
        .select("id, status, cover_letter, created_at, student_id")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((apps ?? []).map((a) => a.student_id)));
      const [{ data: profs }, { data: sprofs }, { data: shorts }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("student_profiles").select("user_id, school_name, professional_program, study_year, skills").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("application_shortlists").select("*").eq("job_id", jobId),
      ]);
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const sMap = new Map((sprofs ?? []).map((p: any) => [p.user_id, p]));
      const shMap = new Map((shorts ?? []).map((s: any) => [s.application_id, s]));
      const rows = (apps ?? []).map((a: any) => ({
        ...a,
        profile: pMap.get(a.student_id),
        student: sMap.get(a.student_id),
        shortlist: shMap.get(a.id) ?? null,
      }));
      rows.sort((x: any, y: any) => {
        const rx = x.shortlist ? (x.shortlist.rank ?? 999) : 10000;
        const ry = y.shortlist ? (y.shortlist.rank ?? 999) : 10000;
        return rx - ry;
      });
      return { job, rows };
    },
  });

  const toggle = async (row: any) => {
    setBusy(row.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(null); return; }
    if (row.shortlist) {
      const { error } = await supabase.from("application_shortlists").delete().eq("id", row.shortlist.id);
      if (error) toast.error(error.message);
      else toast.success("U hoq nga të përzgjedhurit");
    } else {
      const nextRank = (data?.rows.filter((r: any) => r.shortlist).length ?? 0) + 1;
      const { error } = await supabase.from("application_shortlists").insert({
        application_id: row.id,
        job_id: jobId,
        teacher_id: user.id,
        rank: nextRank,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("U përzgjodh");
        await notifyAndEmail([
          {
            user_id: row.student_id,
            type: "shortlisted",
            title: "Je përzgjedhur nga mësuesi",
            message: `Aplikimi yt për "${data?.job?.title}" u përzgjodh.`,
            link: "/applications",
          },
          ...(data?.job?.business_id
            ? [{
                user_id: data.job.business_id,
                type: "shortlisted",
                title: "Kandidat i përzgjedhur",
                message: `Mësuesi përzgjodhi një kandidat për "${data?.job?.title}".`,
                link: "/applications",
              }]
            : []),
        ]);
      }
    }
    await qc.invalidateQueries({ queryKey: qk.shortlistJob(jobId) });
    await qc.invalidateQueries({ queryKey: qk.shortlistJobs() });
    setBusy(null);
  };

  const saveMeta = async (row: any, patch: { rank?: number | null; note?: string | null }) => {
    if (!row.shortlist) return;
    const { error } = await supabase.from("application_shortlists").update(patch).eq("id", row.shortlist.id);
    if (error) return toast.error(error.message);
    toast.success("U ruajt");
    qc.invalidateQueries({ queryKey: qk.shortlistJob(jobId) });
  };

  const startChat = async (otherUserId: string) => {
    const { data: conv, error } = await supabase.rpc("get_or_create_conversation", {
      _other_user: otherUserId,
      _job_id: jobId,
    });
    if (error || !conv) return toast.error(error?.message ?? "Nuk u krijua biseda");
    navigate({ to: "/messages/$id", params: { id: conv as string } });
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link to="/shortlist" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Të gjitha shpalljet
      </Link>

      {isLoading ? (
        <CardListSkeleton count={4} />
      ) : !data?.job ? (
        <EmptyState icon={Users} title="Shpallja nuk u gjet" description="Mund të jetë hequr ose mbyllur." />
      ) : (
        <>
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{data.job.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.job.city ? `${data.job.city} • ` : ""}
              {data.job.positions} pozicion(e)
              {data.job.deadline ? ` • Afati: ${new Date(data.job.deadline).toLocaleDateString("sq-AL")}` : ""}
            </p>
          </header>

          {data.rows.length === 0 ? (
            <EmptyState icon={Users} title="Asnjë aplikim" description="Ende asnjë nxënës nuk ka aplikuar për këtë shpallje." />
          ) : (
            <div className="space-y-3">
              {data.rows.map((row: any) => (
                <Card key={row.id} className={row.shortlist ? "border-primary/50" : undefined}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">
                          {row.profile?.full_name || "Nxënës"}
                          {row.shortlist?.rank ? <Badge className="ml-2">#{row.shortlist.rank}</Badge> : null}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {[row.student?.school_name, row.student?.professional_program, row.student?.study_year ? `Viti ${row.student.study_year}` : null]
                            .filter(Boolean)
                            .join(" • ") || row.profile?.email}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startChat(row.student_id)}>
                          <MessageCircle className="h-4 w-4" /> Bisedë
                        </Button>
                        <Button
                          size="sm"
                          variant={row.shortlist ? "secondary" : "default"}
                          disabled={busy === row.id}
                          onClick={() => toggle(row)}
                        >
                          {busy === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : row.shortlist ? (
                            <StarOff className="h-4 w-4" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                          {row.shortlist ? "Hiqe" : "Përzgjidh"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {row.student?.skills?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {row.student.skills.map((s: string) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {row.cover_letter && (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.cover_letter}</p>
                    )}
                    {row.shortlist && <ShortlistMeta row={row} onSave={saveMeta} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ShortlistMeta({ row, onSave }: { row: any; onSave: (row: any, patch: { rank?: number | null; note?: string | null }) => void }) {
  const [rank, setRank] = useState<string>(row.shortlist.rank ? String(row.shortlist.rank) : "");
  const [note, setNote] = useState<string>(row.shortlist.note ?? "");
  return (
    <div className="rounded-lg border bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Renditja</label>
        <Input
          type="number"
          min={1}
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="h-8 w-20"
        />
      </div>
      <Textarea
        rows={2}
        placeholder="Shënim për biznesin (pse e rekomandon këtë nxënës)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSave(row, { rank: rank ? Number(rank) : null, note: note || null })}
      >
        <Send className="h-4 w-4" /> Ruaj
      </Button>
    </div>
  );
}