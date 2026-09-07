import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/classes/new")({
  head: () => ({
    meta: [
      { title: "Klasë e re · Zemër & Praktikë" },
      { name: "description", content: "Krijo një klasë të re për programin tënd profesional." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Klasë e re · Zemër & Praktikë" },
      { property: "og:description", content: "Krijo një klasë të re për programin tënd profesional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewClassPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Emri shumë i shkurtër").max(120),
  professional_program: z.string().trim().max(120).optional(),
  academic_year: z.string().trim().max(20).optional(),
  school_name: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
});

function NewClassPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    professional_program: "",
    academic_year: "",
    school_name: "",
    description: "",
  });

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("classes")
      .insert({ ...parsed.data, teacher_id: user.id })
      .select("id").single();
    if (error) { setLoading(false); return toast.error(error.message); }
    toast.success("Klasa u krijua");
    navigate({ to: "/classes/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-2xl px-4 py-10">
        <Link to="/classes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Klasat
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Klasë e re</CardTitle>
            <CardDescription>Cakto emrin dhe profilin profesional. Pas krijimit shton nxënësit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Emri i klasës</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="P.sh. IV-B Teknologji Informacioni" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prog">Profili profesional</Label>
                <Input id="prog" value={form.professional_program} onChange={(e) => setForm({ ...form, professional_program: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Viti shkollor</Label>
                <Input id="year" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2026–2027" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">Shkolla</Label>
              <Input id="school" value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Përshkrim</Label>
              <Textarea id="desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submit} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Krijo
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}