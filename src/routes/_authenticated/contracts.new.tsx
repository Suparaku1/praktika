import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createCalendarEvent } from "@/lib/calendar/events.functions";

type Search = { application?: string };

export const Route = createFileRoute("/_authenticated/contracts/new")({
  head: () => ({
    meta: [
      { title: "Kontratë e re · Zemër & Praktikë" },
      { name: "description", content: "Krijo një kontratë dixhitale praktike me nxënësin." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Kontratë e re · Zemër & Praktikë" },
      { property: "og:description", content: "Krijo një kontratë dixhitale praktike me nxënësin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    application: typeof s.application === "string" ? s.application : undefined,
  }),
  component: NewContractPage,
});

const schema = z.object({
  student_id: z.string().uuid({ message: "Zgjidh nxënësin" }),
  job_id: z.string().uuid().optional().nullable(),
  application_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3, "Titulli shumë i shkurtër").max(200),
  content: z.string().trim().min(50, "Përmbajtja duhet të ketë të paktën 50 karaktere").max(20000),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  hours_per_week: z.coerce.number().int().min(0).max(80).optional(),
  compensation: z.coerce.number().min(0).optional(),
  compensation_currency: z.string().default("ALL"),
  location: z.string().trim().max(200).optional(),
});

const DEFAULT_TEMPLATE = `KONTRATË PRAKTIKE PROFESIONALE

Palët bien dakord për kryerjen e praktikës profesionale sipas kushteve të mëposhtme:

1. OBJEKTI
Nxënësi do të kryejë praktikën pranë biznesit në rolin dhe periudhën e specifikuar.

2. KOHËZGJATJA & ORARI
Periudha dhe orët javore janë të përcaktuara në fushat përkatëse.

3. DETYRIMET E PALËVE
Biznesi: ofron mentorim, mjedis të sigurt pune dhe vlerësim përfundimtar.
Nxënësi: respekton orarin, ruan konfidencialitetin dhe ndjek udhëzimet.

4. KOMPENSIMI
Nëse parashikohet, kompensimi është i përcaktuar në fushat përkatëse.

5. PËRFUNDIMI
Kontrata mund të anulohet me marrëveshje të dyanshme ose në rast shkeljeje të kushteve.
`;

function NewContractPage() {
  const { application } = useSearch({ from: "/_authenticated/contracts/new" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({
    student_id: "",
    job_id: "" as string | "",
    application_id: "" as string | "",
    title: "Kontratë praktike profesionale",
    content: DEFAULT_TEMPLATE,
    start_date: "",
    end_date: "",
    hours_per_week: "",
    compensation: "",
    compensation_currency: "ALL",
    location: "",
  });

  // Load applicants of this business
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: jobs } = await supabase.from("jobs").select("id, title").eq("business_id", user.id);
      const jobIds = (jobs ?? []).map((j) => j.id);
      if (jobIds.length === 0) { setStudents([]); return; }
      const { data: apps } = await supabase
        .from("applications")
        .select("id, student_id, job_id, status")
        .in("job_id", jobIds);
      const studentIds = Array.from(new Set((apps ?? []).map((a) => a.student_id)));
      if (studentIds.length === 0) { setStudents([]); return; }
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", studentIds);
      const jobMap = new Map((jobs ?? []).map((j: any) => [j.id, j]));
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const rows = (apps ?? []).map((a: any) => ({
        application_id: a.id,
        student_id: a.student_id,
        job_id: a.job_id,
        job_title: jobMap.get(a.job_id)?.title ?? "—",
        student_name: profMap.get(a.student_id)?.full_name || profMap.get(a.student_id)?.email || "Nxënës",
        status: a.status,
      }));
      setStudents(rows);

      if (application) {
        const m = rows.find((r) => r.application_id === application);
        if (m) {
          setForm((f) => ({
            ...f,
            student_id: m.student_id,
            job_id: m.job_id,
            application_id: m.application_id,
            title: `Kontratë praktike — ${m.job_title}`,
          }));
        }
      }
    })();
  }, [application]);

  const onPickApplicant = (appId: string) => {
    const m = students.find((s) => s.application_id === appId);
    if (!m) return;
    setForm((f) => ({
      ...f,
      student_id: m.student_id,
      job_id: m.job_id,
      application_id: m.application_id,
      title: f.title === "Kontratë praktike profesionale" ? `Kontratë praktike — ${m.job_title}` : f.title,
    }));
  };

  const submit = async (status: "draft" | "sent") => {
    const parsed = schema.safeParse({
      ...form,
      job_id: form.job_id || null,
      application_id: form.application_id || null,
      hours_per_week: form.hours_per_week === "" ? undefined : form.hours_per_week,
      compensation: form.compensation === "" ? undefined : form.compensation,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme");
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const payload = {
      business_id: user.id,
      student_id: parsed.data.student_id,
      job_id: parsed.data.job_id ?? null,
      application_id: parsed.data.application_id ?? null,
      title: parsed.data.title,
      content: parsed.data.content,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      hours_per_week: parsed.data.hours_per_week ?? null,
      compensation: parsed.data.compensation ?? null,
      compensation_currency: parsed.data.compensation_currency,
      location: parsed.data.location || null,
      status,
    };
    const { data, error } = await supabase.from("contracts").insert(payload).select("id").single();
    if (error) { setLoading(false); return toast.error(error.message); }
    await supabase.from("contract_events").insert({
      contract_id: data.id, actor_id: user.id, action: status === "sent" ? "created_and_sent" : "created_draft",
    });

    // When sending the contract, create a Google Calendar event for the work plan
    if (status === "sent" && parsed.data.start_date) {
      try {
        const { data: studentProfile } = await supabase
          .from("profiles").select("email").eq("id", parsed.data.student_id).maybeSingle();
        const attendees = studentProfile?.email ? [studentProfile.email] : [];
        const res = await createCalendarEvent({
          data: {
            title: `Praktikë: ${parsed.data.title}`,
            description: parsed.data.content?.slice(0, 500),
            location: parsed.data.location || undefined,
            startDate: parsed.data.start_date,
            endDate: parsed.data.end_date || parsed.data.start_date,
            attendees,
            timezone: "Europe/Tirane",
          },
        });
        if (res.ok) toast.success("Ngjarja u shtua në Google Calendar");
      } catch (e) {
        console.error("[contracts] calendar failed", e);
      }
    }

    toast.success(status === "sent" ? "Kontrata u dërgua" : "Drafti u ruajt");
    navigate({ to: "/contracts/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/contracts" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kontratat
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Kontratë e re praktike</CardTitle>
            <CardDescription>Hartoje, ruaje si draft ose dërgoje për nënshkrim.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Nxënësi (nga aplikuesit)</Label>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nuk ka aplikues. <Link to="/jobs/new" className="text-primary underline">Krijo një shpallje</Link> që të marrësh aplikime.
                </p>
              ) : (
                <Select value={form.application_id} onValueChange={onPickApplicant}>
                  <SelectTrigger><SelectValue placeholder="Zgjidh një aplikues" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.application_id} value={s.application_id}>
                        {s.student_name} — {s.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titulli</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Data e fillimit</Label>
                <Input id="start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Data e mbarimit</Label>
                <Input id="end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hpw">Orë në javë</Label>
                <Input id="hpw" type="number" min={0} max={80} value={form.hours_per_week} onChange={(e) => setForm({ ...form, hours_per_week: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc">Vendi</Label>
                <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Tiranë" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp">Kompensimi</Label>
                <Input id="comp" type="number" min={0} value={form.compensation} onChange={(e) => setForm({ ...form, compensation: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Monedha</Label>
                <Select value={form.compensation_currency} onValueChange={(v) => setForm({ ...form, compensation_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Lekë (ALL)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="USD">Dollar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Përmbajtja e kontratës</Label>
              <Textarea id="content" rows={14} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button variant="outline" disabled={loading} onClick={() => submit("draft")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Ruaj draft
              </Button>
              <Button disabled={loading} onClick={() => submit("sent")}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Dërgo për nënshkrim
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}