import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, CheckCircle2, XCircle, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { CardListSkeleton } from "@/components/skeletons";
import { qk } from "@/lib/query/keys";

export const Route = createFileRoute("/_authenticated/feedback/")({
  component: FeedbackIndexPage,
  head: () => ({
    meta: [
      { title: "Vlerësimi i praktikës | Zemër & Praktikë" },
      { name: "description", content: "Plotëso vlerësimin përfundimtar të nxënësve në përfundim të afatit të praktikës." },
      { property: "og:title", content: "Vlerësimi i praktikës" },
      { property: "og:description", content: "Vlerësimi 10-pikësh i nxënësve në përfundim të praktikës profesionale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FeedbackIndexPage() {
  const { data, isLoading } = useQuery({
    queryKey: qk.feedbackContracts(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { contracts: [], feedback: [], profiles: new Map<string, any>() };
      const { data: contracts } = await supabase
        .from("contracts")
        .select("*")
        .eq("business_id", user.id)
        .in("status", ["active", "completed"])
        .order("end_date", { ascending: true });
      const list = contracts ?? [];
      const { data: fb } = await supabase
        .from("practice_feedback")
        .select("id, contract_id, score, passed, submitted_at")
        .in("contract_id", list.length ? list.map((c) => c.id) : ["00000000-0000-0000-0000-000000000000"]);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", list.length ? list.map((c) => c.student_id) : ["00000000-0000-0000-0000-000000000000"]);
      return {
        contracts: list,
        feedback: fb ?? [],
        profiles: new Map((profs ?? []).map((p) => [p.id, p])),
      };
    },
  });

  const fbByContract = new Map((data?.feedback ?? []).map((f: any) => [f.contract_id, f]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vlerësimi i praktikës</h1>
        <p className="text-sm text-muted-foreground">
          Në përfundim të afatit, plotëso vlerësimin me 10 kategori. Me 7 ose më shumë pikë, nxënësi merr certifikatën e pjesëmarrjes.
        </p>
      </div>

      {isLoading ? (
        <CardListSkeleton />
      ) : !data?.contracts.length ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Asnjë praktikë për vlerësim"
          description="Kur një kontratë të bëhet aktive, do të shfaqet këtu për vlerësim."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.contracts.map((c: any) => {
            const fb: any = fbByContract.get(c.id);
            const student = data.profiles.get(c.student_id);
            const ended = c.end_date ? new Date(c.end_date) < new Date() : false;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <CardDescription>{student?.full_name || student?.email || "Nxënës"}</CardDescription>
                    </div>
                    {fb ? (
                      <Badge variant={fb.passed ? "default" : "destructive"} className="gap-1">
                        {fb.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {fb.score}/10
                      </Badge>
                    ) : (
                      <Badge variant={ended ? "secondary" : "outline"} className="gap-1">
                        <CalendarClock className="h-3 w-3" /> {ended ? "Afati mbaroi" : "Në vazhdim"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString("sq-AL") : "—"} →{" "}
                    {c.end_date ? new Date(c.end_date).toLocaleDateString("sq-AL") : "—"}
                  </div>
                  <Button asChild variant={fb ? "outline" : "default"} size="sm">
                    <Link to="/feedback/$contractId" params={{ contractId: c.id }}>
                      <ClipboardCheck className="h-4 w-4" /> {fb ? "Shiko vlerësimin" : "Plotëso vlerësimin"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
