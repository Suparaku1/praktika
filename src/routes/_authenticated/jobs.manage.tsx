import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Loader2, Eye, Trash2, Users, FileText, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type JobRow = {
  id: string;
  title: string;
  status: string;
  job_type: string;
  city: string | null;
  created_at: string;
  applications: { count: number }[];
};

export const Route = createFileRoute("/_authenticated/jobs/manage")({
  head: () => ({
    meta: [
      { title: "Menaxho shpalljet · Zemër & Praktikë" },
      { name: "description", content: "Publiko, ndrysho dhe mbyll shpalljet e biznesit tënd." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Menaxho shpalljet · Zemër & Praktikë" },
      { property: "og:description", content: "Publiko, ndrysho dhe mbyll shpalljet e biznesit tënd." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageJobsPage,
});

function ManageJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("jobs")
      .select("id, title, status, job_type, city, created_at, applications(count)")
      .eq("business_id", user.id)
      .order("created_at", { ascending: false });
    setJobs((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "published" ? "closed" : "published";
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "U publikua" : "U mbyll");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Konfirmoni fshirjen e shpalljes?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("U fshi");
    load();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shpalljet e mia</h1>
            <p className="mt-1 text-muted-foreground">Menaxho praktikat dhe punët e publikuara.</p>
          </div>
          <Button onClick={() => navigate({ to: "/jobs/new" })}><Plus className="h-4 w-4" /> Krijo shpallje</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : jobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">Ende nuk ke shpallje</CardTitle>
              <CardDescription>Krijo shpalljen e parë për të tërhequr nxënësit.</CardDescription>
              <Button onClick={() => navigate({ to: "/jobs/new" })}><Plus className="h-4 w-4" /> Krijo shpallje</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {jobs.map((j) => {
              const appsCount = j.applications?.[0]?.count ?? 0;
              return (
                <Card key={j.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{j.title}</CardTitle>
                          <Badge variant={j.status === "published" ? "default" : j.status === "draft" ? "secondary" : "outline"}>
                            {j.status === "published" ? "Publikuar" : j.status === "draft" ? "Draft" : "Mbyllur"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {j.city ?? "—"} · {new Date(j.created_at).toLocaleDateString("sq-AL")}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {appsCount} aplikime</Badge>
                        <Button asChild size="sm" variant="ghost"><Link to="/jobs/$id" params={{ id: j.id }}><Eye className="h-4 w-4" /></Link></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(j.id, j.status)}>
                          {j.status === "published" ? <><Lock className="h-3.5 w-3.5" /> Mbyll</> : <><Globe className="h-3.5 w-3.5" /> Publiko</>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}