import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { issueCertificate } from "@/lib/workflow/practice.functions";

type Search = { contract?: string };

export const Route = createFileRoute("/_authenticated/certificates/new")({
  head: () => ({
    meta: [
      { title: "Lësho certifikatë · Zemër & Praktikë" },
      { name: "description", content: "Krijo një certifikatë të re për një praktikë të përfunduar." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Lësho certifikatë · Zemër & Praktikë" },
      { property: "og:description", content: "Krijo një certifikatë të re për një praktikë të përfunduar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({ contract: typeof s.contract === "string" ? s.contract : undefined }),
  component: NewCertificatePage,
});

function NewCertificatePage() {
  const navigate = useNavigate();
  const { contract: contractId } = useSearch({ from: "/_authenticated/certificates/new" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const issueCertificateRpc = useServerFn(issueCertificate);
  const [contract, setContract] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    hours_completed: "",
    final_grade: "",
    skills: "",
  });

  useEffect(() => {
    (async () => {
      if (!contractId) { setLoading(false); return; }
      const { data } = await supabase.from("contracts").select("*").eq("id", contractId).maybeSingle();
      if (!data) { toast.error("Kontrata nuk u gjet"); navigate({ to: "/contracts" }); return; }
      setContract(data);
      setForm((f) => ({ ...f, title: `Certifikatë praktike — ${data.title}` }));
      const { data: prof } = await supabase.from("profiles").select("id, full_name, email").eq("id", data.student_id).maybeSingle();
      setStudent(prof);
      setLoading(false);
    })();
  }, [contractId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return toast.error("Mungon kontrata burim.");
    if (!form.title.trim()) return toast.error("Shkruaj titullin");
    setSaving(true);
    try {
      const { certificateId } = await issueCertificateRpc({
        data: {
          contractId: contract.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          hoursCompleted: form.hours_completed ? parseInt(form.hours_completed, 10) : null,
          finalGrade: form.final_grade ? parseFloat(form.final_grade) : null,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      toast.success("Certifikata u lëshua");
      navigate({ to: "/certificates/$id", params: { id: certificateId } });
    } catch (err: any) {
      toast.error(err?.message ?? "Gabim");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/contracts" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kontratat
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Award className="h-5 w-5" /></div>
              <div>
                <CardTitle>Lësho certifikatë</CardTitle>
                <CardDescription>
                  {student ? <>Për <strong>{student.full_name || student.email}</strong></> : "Plotëso të dhënat e mëposhtme."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="title">Titulli i certifikatës *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Përshkrim (opsional)</Label>
                <Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hours">Orë të përfunduara</Label>
                  <Input id="hours" type="number" min="0" value={form.hours_completed} onChange={(e) => setForm({ ...form, hours_completed: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Notë përfundimtare (1–10)</Label>
                  <Input id="grade" type="number" step="0.1" min="1" max="10" value={form.final_grade} onChange={(e) => setForm({ ...form, final_grade: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Aftësitë (të ndara me presje)</Label>
                <Input id="skills" placeholder="p.sh. React, kontabilitet, marketing dixhital" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => navigate({ to: "/contracts" })}>Anulo</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />} Lësho
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}