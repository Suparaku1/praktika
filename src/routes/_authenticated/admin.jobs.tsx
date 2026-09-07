import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Briefcase, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  head: () => ({
    meta: [
      { title: "Administrim · Shpalljet · Zemër & Praktikë" },
      { name: "description", content: "Mbikëqyr të gjitha shpalljet e punës dhe praktikës." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administrim · Shpalljet · Zemër & Praktikë" },
      { property: "og:description", content: "Mbikëqyr të gjitha shpalljet e punës dhe praktikës." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminJobsPage,
});

type JobStatus = "draft" | "published" | "closed";
type Row = {
  id: string;
  title: string;
  status: JobStatus;
  city: string | null;
  category: string | null;
  created_at: string;
  business_id: string;
  views_count: number;
};

function AdminJobsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r) => r.role === "super_admin")) {
      toast.error("Pa akses");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    const { data, error } = await supabase.from("jobs").select("id,title,status,city,category,created_at,business_id,views_count").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: JobStatus) => {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statusi u përditësua");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("A je i sigurt që do të fshish këtë shpallje?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Shpallja u fshi");
    load();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4" /> Mbrapa</Link></Button>
            <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /><span className="font-semibold">Shpalljet</span></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link to="/jobs/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.title}</Link>
                        <Badge variant={r.status === "published" ? "default" : "secondary"}>{r.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {r.category || "—"} · {r.city || "—"} · {r.views_count} shikime
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-36">
                        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as JobStatus)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">draft</SelectItem>
                            <SelectItem value="published">published</SelectItem>
                            <SelectItem value="closed">closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && <div className="px-5 py-10 text-center text-muted-foreground">Asnjë shpallje</div>}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}