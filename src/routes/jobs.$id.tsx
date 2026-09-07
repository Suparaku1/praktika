import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Building2, Clock, Loader2, Briefcase, Send, CheckCircle2, Wallet, Bookmark, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { sendEmail } from "@/lib/email/send.functions";

const jobTypeLabel: Record<string, string> = {
  internship: "Praktikë",
  full_time: "Kohë e plotë",
  part_time: "Kohë e pjesshme",
  apprenticeship: "Mësim në punë",
};
const workModeLabel: Record<string, string> = {
  onsite: "Në vend",
  remote: "Remote",
  hybrid: "Hibrid",
};

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetailPage,
  head: () => ({
    meta: [
      { title: "Detajet e praktikës | Zemër & Praktikë" },
      { name: "description", content: "Shiko detajet e shpalljes së praktikës profesionale, kërkesat, benefitet dhe apliko online brenda pak minutash." },
      { property: "og:title", content: "Detajet e praktikës profesionale" },
      { property: "og:description", content: "Kërkesat, benefitet dhe aplikimi online për praktikën profesionale." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function JobDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: j } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
      setJob(j);
      if (j?.business_id) {
        const { data: b } = await supabase.from("business_profiles").select("company_name, sector, city, verified, logo_url").eq("user_id", j.business_id).maybeSingle();
        setBusiness(b);
      }
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        const r = (roles ?? []).map((x) => x.role);
        setRole(r.includes("student") ? "student" : r[0] ?? null);
        const { data: app } = await supabase.from("applications").select("id").eq("job_id", id).eq("student_id", u.id).maybeSingle();
        setAlreadyApplied(Boolean(app));
        const { data: sv } = await supabase.from("saved_jobs").select("id").eq("job_id", id).eq("user_id", u.id).maybeSingle();
        setSaved(Boolean(sv));
      }
      setLoading(false);
    })();
  }, [id]);

  const onApply = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("applications").insert({
      job_id: id,
      student_id: user.id,
      cover_letter: coverLetter || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Aplikimi dështoi: " + error.message);
      return;
    }
    setAlreadyApplied(true);
    setOpen(false);
    toast.success("Aplikimi u dërgua me sukses!");
    // Notify business (in-app + email)
    try {
      if (job?.business_id) {
        const { data: biz } = await supabase.from("profiles").select("email, full_name").eq("id", job.business_id).maybeSingle();
        const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        await supabase.from("notifications").insert({
          user_id: job.business_id,
          type: "new_application",
          title: "Aplikim i ri",
          message: `${me?.full_name || "Një student"} aplikoi për "${job.title}"`,
          link: "/applications",
        });
        if (biz?.email) {
          await sendEmail({
            data: {
              to: biz.email,
              template: {
                kind: "new_application",
                jobTitle: job.title,
                studentName: me?.full_name || "Një student",
                appUrl: `${window.location.origin}/applications`,
              },
            },
          });
        }
      }
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-3xl px-4 py-20 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Shpallja nuk u gjet</h1>
          <p className="mt-2 text-muted-foreground">Mund të jetë mbyllur ose hequr.</p>
          <Button asChild className="mt-6"><Link to="/jobs">Kthehu te punët</Link></Button>
        </main>
      </div>
    );
  }

  const canApply = !user || role === "student";

  const toggleSave = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (saved) {
      await supabase.from("saved_jobs").delete().eq("job_id", id).eq("user_id", user.id);
      setSaved(false);
      toast.success("U hoq nga të ruajturat");
    } else {
      const { error } = await supabase.from("saved_jobs").insert({ job_id: id, user_id: user.id });
      if (error) return toast.error(error.message);
      setSaved(true);
      toast.success("U ruajt");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Link to="/jobs" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Të gjitha punët
        </Link>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge>{jobTypeLabel[job.job_type]}</Badge>
                  <Badge variant="secondary">{workModeLabel[job.work_mode]}</Badge>
                  {job.category && <Badge variant="outline">{job.category}</Badge>}
                </div>
                <CardTitle className="mt-3 text-3xl">{job.title}</CardTitle>
                {business && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Building2 className="h-4 w-4" /> {business.company_name}
                      {business.verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    {job.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.city}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(job.created_at).toLocaleDateString("sq-AL")}</span>
                  </div>
                )}
              </div>
              {canApply && (
                alreadyApplied ? (
                  <Button disabled variant="secondary"><CheckCircle2 className="h-4 w-4" /> Aplikuar</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={toggleSave}>
                      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      {saved ? "Ruajtur" : "Ruaj"}
                    </Button>
                    <Button onClick={() => (user ? setOpen(true) : navigate({ to: "/auth" }))}>
                      <Send className="h-4 w-4" /> Apliko tani
                    </Button>
                  </div>
                )
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section title="Përshkrimi">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{job.description}</p>
            </Section>

            {job.requirements && (
              <Section title="Kërkesat">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{job.requirements}</p>
              </Section>
            )}

            {job.benefits && (
              <Section title="Përfitimet">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{job.benefits}</p>
              </Section>
            )}

            {job.skills && job.skills.length > 0 && (
              <Section title="Aftësitë e kërkuara">
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </Section>
            )}

            <div className="grid gap-4 sm:grid-cols-3 rounded-lg bg-secondary/40 p-4">
              <Info label="Pozicione" value={String(job.positions)} />
              {(job.salary_min || job.salary_max) && (
                <Info
                  label="Paga"
                  icon={Wallet}
                  value={`${job.salary_min ?? "?"} - ${job.salary_max ?? "?"} ${job.salary_currency ?? ""}`}
                />
              )}
              {job.deadline && <Info label="Afati" value={new Date(job.deadline).toLocaleDateString("sq-AL")} />}
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apliko për: {job.title}</DialogTitle>
            <DialogDescription>Shto një motivim të shkurtër (opsionale). Biznesi do të shohë profilin tënd dhe CV-në.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Pse je kandidati i duhur? Çfarë të motivon për këtë rol?"
            rows={6}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Anulo</Button>
            <Button onClick={onApply} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Dërgo aplikimin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value, icon: I }: { label: string; value: string; icon?: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {I && <I className="h-3.5 w-3.5" />} {value}
      </div>
    </div>
  );
}