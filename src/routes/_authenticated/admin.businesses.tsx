import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Building2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/businesses")({
  head: () => ({
    meta: [
      { title: "Administrim · Bizneset · Zemër & Praktikë" },
      { name: "description", content: "Verifiko dhe menaxho bizneset e regjistruara në Zemër & Praktikë." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administrim · Bizneset · Zemër & Praktikë" },
      { property: "og:description", content: "Verifiko dhe menaxho bizneset e regjistruara në Zemër & Praktikë." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminBusinessesPage,
});

type Row = {
  user_id: string;
  company_name: string;
  nipt: string | null;
  sector: string | null;
  city: string | null;
  website: string | null;
  contact_email: string | null;
  verified: boolean;
  created_at: string;
};

function AdminBusinessesPage() {
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
    const { data, error } = await supabase.from("business_profiles").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("business_profiles").update({ verified: !current }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success(!current ? "Biznesi u verifikua" : "Verifikimi u hoq");
    load();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4" /> Mbrapa</Link></Button>
            <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><span className="font-semibold">Bizneset</span></div>
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
                  <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.company_name}</span>
                        {r.verified ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Verifikuar</Badge> : <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Pa verifikuar</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {r.sector || "—"} · {r.city || "—"} · NIPT: {r.nipt || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.contact_email} {r.website && `· ${r.website}`}</div>
                    </div>
                    <Button size="sm" variant={r.verified ? "outline" : "default"} onClick={() => toggleVerified(r.user_id, r.verified)}>
                      {r.verified ? "Hiq verifikimin" : "Verifiko"}
                    </Button>
                  </div>
                ))}
                {rows.length === 0 && <div className="px-5 py-10 text-center text-muted-foreground">Asnjë biznes i regjistruar</div>}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}