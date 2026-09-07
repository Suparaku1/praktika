import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Loader2, MapPin, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Punët e ruajtura · Zemër & Praktikë" },
      { name: "description", content: "Shpalljet që ke ruajtur për t'i shqyrtuar më vonë." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Punët e ruajtura · Zemër & Praktikë" },
      { property: "og:description", content: "Shpalljet që ke ruajtur për t'i shqyrtuar më vonë." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavedJobsPage,
});

function SavedJobsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("saved_jobs")
        .select("id, created_at, job:jobs(id, title, city, job_type, work_mode, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []).filter((r: any) => r.job));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold tracking-tight">
        <Bookmark className="h-7 w-7 text-primary" /> Të ruajtura
      </h1>
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            Ende s'ke ruajtur asnjë shpallje. Kliko ikonën "Ruaj" te çdo shpallje për t'i gjetur këtu.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <Link key={r.id} to="/jobs/$id" params={{ id: r.job.id }}>
              <Card className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{r.job.title}</CardTitle>
                      <CardDescription className="mt-1 flex flex-wrap gap-3 text-xs">
                        {r.job.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.job.city}</span>}
                        <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{r.job.work_mode}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={r.job.status === "published" ? "default" : "outline"}>{r.job.status}</Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}