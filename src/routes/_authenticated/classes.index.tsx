import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Users, GraduationCap, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GridSkeleton } from "@/components/skeletons";
import { qk } from "@/lib/query/keys";

export const Route = createFileRoute("/_authenticated/classes/")({
  head: () => ({
    meta: [
      { title: "Klasat · Zemër & Praktikë" },
      { name: "description", content: "Menaxho klasat dhe nxënësit e programit profesional." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Klasat · Zemër & Praktikë" },
      { property: "og:description", content: "Menaxho klasat dhe nxënësit e programit profesional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown> | undefined = {}): { q?: string } => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: qk.classesList(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { role: null as string | null, items: [] as any[] };
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const r = (roles ?? []).map((x) => x.role);
      const resolved = r.includes("teacher") ? "teacher" : r.includes("student") ? "student" : r[0] ?? null;
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name, professional_program, academic_year, school_name, created_at")
        .order("created_at", { ascending: false });
      const ids = (classes ?? []).map((c) => c.id);
      const counts = new Map<string, number>();
      if (ids.length > 0) {
        const { data: mems } = await supabase.from("class_students").select("class_id").in("class_id", ids);
        (mems ?? []).forEach((m: any) => counts.set(m.class_id, (counts.get(m.class_id) ?? 0) + 1));
      }
      return {
        role: resolved,
        items: (classes ?? []).map((c: any) => ({ ...c, members: counts.get(c.id) ?? 0 })),
      };
    },
    staleTime: 30_000,
  });
  const role = data?.role ?? null;
  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    const needle = (q ?? "").trim().toLowerCase();
    if (!needle) return items;
    return items.filter((c: any) =>
      [c.name, c.professional_program, c.academic_year, c.school_name]
        .filter(Boolean).some((s: string) => s.toLowerCase().includes(needle)),
    );
  }, [items, q]);

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Klasat</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "teacher" ? "Klasat që ti drejton dhe nxënësit në to." : "Klasat ku ti je pjesë."}
            </p>
          </div>
          {role === "teacher" && (
            <Button asChild><Link to="/classes/new"><Plus className="h-4 w-4" /> Klasë e re</Link></Button>
          )}
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kërko klasë, program, vit..."
            className="pl-9"
            value={q}
            onChange={(e) => navigate({ to: "/classes", search: { q: e.target.value }, replace: true })}
          />
        </div>

        {isLoading ? (
          <GridSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">{q ? "Asnjë klasë nuk përputhet" : "Ende nuk ka klasa"}</CardTitle>
              <CardDescription>
                {q ? "Provo një fjalë tjetër ose pastro kërkimin." : role === "teacher" ? "Krijo klasën tënde të parë dhe shto nxënësit." : "Mësuesi yt do të të shtojë në klasë."}
              </CardDescription>
              {role === "teacher" && (
                <Button asChild><Link to="/classes/new"><Plus className="h-4 w-4" /> Krijo klasë</Link></Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((c: any) => (
              <Link key={c.id} to="/classes/$id" params={{ id: c.id }} className="block">
                <Card className="transition-shadow hover:shadow-[var(--shadow-elegant)]">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {c.professional_program ?? "—"}{c.academic_year ? ` · ${c.academic_year}` : ""}
                          {c.school_name ? ` · ${c.school_name}` : ""}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {c.members}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}