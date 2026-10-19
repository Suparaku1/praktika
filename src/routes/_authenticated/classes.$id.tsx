import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, UserPlus, Trash2, ClipboardList, Star, Plus, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyEvent } from "@/lib/workflow/events.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/classes/$id")({
  head: () => ({
    meta: [
      { title: "Klasa · Zemër & Praktikë" },
      { name: "description", content: "Menaxho nxënësit dhe vlerësimet e kësaj klase." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Klasa · Zemër & Praktikë" },
      { property: "og:description", content: "Menaxho nxënësit dhe vlerësimet e kësaj klase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClassDetailPage,
});

function ClassDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [klass, setKlass] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);

  // add-student dialog
  const [addOpen, setAddOpen] = useState(false);
  const [emailQ, setEmailQ] = useState("");
  const [searching, setSearching] = useState(false);

  // evaluation dialog
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({
    student_id: "",
    contract_id: "" as string,
    period_start: "",
    period_end: "",
    attendance_percent: "",
    score: "8",
    strengths: "",
    improvements: "",
    comment: "",
  });
  const [studentContracts, setStudentContracts] = useState<any[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: c, error } = await supabase.from("classes").select("*").eq("id", id).maybeSingle();
    if (error || !c) { toast.error(error?.message ?? "Klasa nuk u gjet"); navigate({ to: "/classes" }); return; }
    setKlass(c);
    setIsTeacher(c.teacher_id === user.id);

    const { data: mems } = await supabase
      .from("class_students")
      .select("id, student_id, created_at")
      .eq("class_id", id);
    const ids = (mems ?? []).map((m: any) => m.student_id);
    let profs: any[] = [];
    if (ids.length > 0) {
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      profs = data ?? [];
    }
    const map = new Map(profs.map((p) => [p.id, p]));
    setMembers((mems ?? []).map((m: any) => ({ ...m, profile: map.get(m.student_id) })));

    // evaluations for these students by current teacher (if teacher)
    if (ids.length > 0) {
      const q = supabase
        .from("practice_evaluations")
        .select("id, student_id, score, period_start, period_end, attendance_percent, comment, created_at, contract_id")
        .in("student_id", ids)
        .order("created_at", { ascending: false });
      const { data } = await q;
      setEvals(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const addStudent = async () => {
    if (!emailQ.trim()) return toast.error("Shkruaj email-in");
    setSearching(true);
    const { data, error } = await supabase.rpc("find_student_by_email", { _email: emailQ.trim() });
    if (error) { setSearching(false); return toast.error(error.message); }
    const found = (data as any[])?.[0];
    if (!found) { setSearching(false); return toast.error("Asnjë nxënës me këtë email"); }
    const { error: insErr } = await supabase.from("class_students").insert({
      class_id: id, student_id: found.id, added_by: userId!,
    });
    setSearching(false);
    if (insErr) return toast.error(insErr.message);
    toast.success(`${found.full_name || found.email} u shtua`);
    setEmailQ(""); setAddOpen(false); load();
  };

  const removeMember = async (mid: string, name: string) => {
    if (!confirm(`Hiq ${name} nga klasa?`)) return;
    const { error } = await supabase.from("class_students").delete().eq("id", mid);
    if (error) return toast.error(error.message);
    toast.success("U hoq nga klasa");
    load();
  };

  const openEvalFor = async (studentId: string) => {
    setEvalForm((f) => ({ ...f, student_id: studentId, contract_id: "" }));
    // fetch contracts that involve this student (RLS will allow only those teacher can see; teacher sees all)
    const { data } = await supabase
      .from("contracts")
      .select("id, title, status")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setStudentContracts(data ?? []);
    setEvalOpen(true);
  };

  const saveEval = async () => {
    if (!evalForm.student_id) return;
    const score = Number(evalForm.score);
    if (!score || score < 1 || score > 10) return toast.error("Nota duhet 1–10");
    const att = evalForm.attendance_percent === "" ? null : Math.max(0, Math.min(100, Number(evalForm.attendance_percent)));
    const payload: any = {
      teacher_id: userId!,
      student_id: evalForm.student_id,
      contract_id: evalForm.contract_id || null,
      period_start: evalForm.period_start || null,
      period_end: evalForm.period_end || null,
      attendance_percent: att,
      score,
      strengths: evalForm.strengths || null,
      improvements: evalForm.improvements || null,
      comment: evalForm.comment || null,
    };
    const { data: ev, error } = await supabase.from("practice_evaluations").insert(payload).select("id").single();
    if (error) return toast.error(error.message);
    notifyEvent({ data: { kind: "evaluation_added", evaluationId: ev.id } }).catch(() => {});
    toast.success("Vlerësimi u ruajt");
    setEvalOpen(false);
    setEvalForm({ student_id: "", contract_id: "", period_start: "", period_end: "", attendance_percent: "", score: "8", strengths: "", improvements: "", comment: "" });
    load();
  };

  if (loading || !klass) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/classes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Klasat
        </Link>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{klass.name}</CardTitle>
                <CardDescription className="mt-1">
                  {klass.professional_program ?? "—"}
                  {klass.academic_year ? ` · ${klass.academic_year}` : ""}
                  {klass.school_name ? ` · ${klass.school_name}` : ""}
                </CardDescription>
              </div>
              {isTeacher && (
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button><UserPlus className="h-4 w-4" /> Shto nxënës</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Shto nxënës në klasë</DialogTitle>
                      <DialogDescription>Kërko me email-in e regjistruar të nxënësit.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="em">Email</Label>
                      <Input id="em" type="email" value={emailQ} onChange={(e) => setEmailQ(e.target.value)} placeholder="nxenes@example.com" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddOpen(false)}>Anulo</Button>
                      <Button onClick={addStudent} disabled={searching}>
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Shto
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          {klass.description && (
            <CardContent>
              <p className="text-sm text-foreground/80">{klass.description}</p>
            </CardContent>
          )}
        </Card>

        <Tabs defaultValue="members" className="mt-6">
          <TabsList>
            <TabsTrigger value="members">Nxënësit ({members.length})</TabsTrigger>
            <TabsTrigger value="evaluations">Vlerësimet ({evals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            {members.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {isTeacher ? "Shto nxënësit e parë me butonin më lart." : "Asnjë nxënës ende."}
              </p>
            ) : (
              <div className="grid gap-2">
                {members.map((m) => (
                  <Card key={m.id}>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base">{m.profile?.full_name || m.profile?.email || "Nxënës"}</CardTitle>
                        <CardDescription className="mt-1">{m.profile?.email}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {isTeacher && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEvalFor(m.student_id)}>
                              <Star className="h-4 w-4" /> Vlerëso
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMember(m.id, m.profile?.full_name || m.profile?.email || "nxënësi")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="evaluations" className="mt-4">
            {evals.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Asnjë vlerësim ende. {isTeacher && "Hap një nxënës dhe kliko “Vlerëso”."}
              </p>
            ) : (
              <div className="grid gap-2">
                {evals.map((e) => {
                  const m = members.find((x) => x.student_id === e.student_id);
                  return (
                    <Card key={e.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{m?.profile?.full_name || m?.profile?.email || "Nxënës"}</CardTitle>
                            <CardDescription className="mt-1">
                              {e.period_start ? new Date(e.period_start).toLocaleDateString("sq-AL") : "—"}
                              {e.period_end ? ` → ${new Date(e.period_end).toLocaleDateString("sq-AL")}` : ""}
                              {e.attendance_percent != null ? ` · Prezenca ${e.attendance_percent}%` : ""}
                            </CardDescription>
                          </div>
                          <Badge className="gap-1"><Star className="h-3 w-3" /> {e.score}/10</Badge>
                        </div>
                      </CardHeader>
                      {e.comment && (
                        <CardContent>
                          <p className="text-sm text-foreground/80">{e.comment}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Evaluation dialog */}
        <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Vlerësim praktike</DialogTitle>
              <DialogDescription>Regjistro një vlerësim periodik për nxënësin.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {studentContracts.length > 0 && (
                <div className="space-y-2">
                  <Label>Kontrata (opsionale)</Label>
                  <Select value={evalForm.contract_id} onValueChange={(v) => setEvalForm({ ...evalForm, contract_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Zgjidh kontratën" /></SelectTrigger>
                    <SelectContent>
                      {studentContracts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title} · {c.status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fillimi</Label>
                  <Input type="date" value={evalForm.period_start} onChange={(e) => setEvalForm({ ...evalForm, period_start: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Mbarimi</Label>
                  <Input type="date" value={evalForm.period_end} onChange={(e) => setEvalForm({ ...evalForm, period_end: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Prezenca (%)</Label>
                  <Input type="number" min={0} max={100} value={evalForm.attendance_percent} onChange={(e) => setEvalForm({ ...evalForm, attendance_percent: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nota (1–10)</Label>
                  <Input type="number" min={1} max={10} value={evalForm.score} onChange={(e) => setEvalForm({ ...evalForm, score: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pikat e forta</Label>
                <Textarea rows={2} value={evalForm.strengths} onChange={(e) => setEvalForm({ ...evalForm, strengths: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Për t'u përmirësuar</Label>
                <Textarea rows={2} value={evalForm.improvements} onChange={(e) => setEvalForm({ ...evalForm, improvements: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Koment i përgjithshëm</Label>
                <Textarea rows={3} value={evalForm.comment} onChange={(e) => setEvalForm({ ...evalForm, comment: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEvalOpen(false)}>Anulo</Button>
              <Button onClick={saveEval}><ClipboardList className="h-4 w-4" /> Ruaj</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}