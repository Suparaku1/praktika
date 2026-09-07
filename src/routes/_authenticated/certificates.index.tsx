import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ShieldCheck, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GridSkeleton } from "@/components/skeletons";
import { qk } from "@/lib/query/keys";

export const Route = createFileRoute("/_authenticated/certificates/")({
  head: () => ({
    meta: [
      { title: "Certifikatat · Zemër & Praktikë" },
      { name: "description", content: "Të gjitha certifikatat e lëshuara për praktikat e përfunduara." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Certifikatat · Zemër & Praktikë" },
      { property: "og:description", content: "Të gjitha certifikatat e lëshuara për praktikat e përfunduara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown> | undefined = {}): { q?: string; status?: "all" | "valid" | "revoked" } => ({
    q: typeof s.q === "string" ? s.q : "",
    status: (typeof s.status === "string" && ["all", "valid", "revoked"].includes(s.status) ? s.status : "all") as "all" | "valid" | "revoked",
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { q, status } = Route.useSearch();
  const navigate = useNavigate();
  const { data: certs = [], isLoading } = useQuery({
    queryKey: qk.certificatesList(),
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates")
        .select("*")
        .order("issued_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const filtered = useMemo(() => {
    const needle = (q ?? "").trim().toLowerCase();
    return certs.filter((c: any) => {
      if (status === "valid" && c.revoked_at) return false;
      if (status === "revoked" && !c.revoked_at) return false;
      if (!needle) return true;
      return [c.title, c.certificate_number].filter(Boolean).some((s: string) => s.toLowerCase().includes(needle));
    });
  }, [certs, q, status]);
  const setSearch = (patch: { q?: string; status?: "all" | "valid" | "revoked" }) =>
    navigate({ to: "/certificates", search: { q, status, ...patch }, replace: true });

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Certifikatat</div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Certifikatat e praktikës</h1>
            <p className="mt-1 text-sm text-muted-foreground">Dokumenti zyrtar i përfundimit të praktikës. Çdo certifikatë mund të verifikohet publikisht.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kërko sipas titullit ose numrit..."
              className="pl-9"
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "valid", "revoked"] as const).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setSearch({ status: s })}>
                {s === "all" ? "Të gjitha" : s === "valid" ? "Të vlefshme" : "Të anuluara"}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <GridSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Award className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">
                {q || status !== "all" ? "Asnjë certifikatë nuk përputhet." : "Asnjë certifikatë ende."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Bizneset lëshojnë certifikata pasi kontrata përfundon me sukses.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((c: any) => (
              <Card key={c.id} className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <CardDescription className="font-mono text-xs">{c.certificate_number}</CardDescription>
                      </div>
                    </div>
                    {c.revoked_at ? (
                      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Anuluar</Badge>
                    ) : (
                      <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> E vlefshme</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {c.hours_completed != null && <span>{c.hours_completed} orë</span>}
                    {c.final_grade != null && <span>Notë: {c.final_grade}</span>}
                    <span>Lëshuar më {new Date(c.issued_at).toLocaleDateString("sq-AL")}</span>
                  </div>
                  <div className="flex justify-end">
                    <Button asChild size="sm" variant="outline"><Link to="/certificates/$id" params={{ id: c.id }}>Hap</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}