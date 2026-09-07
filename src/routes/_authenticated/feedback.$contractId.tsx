import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, Loader2, CheckCircle2, XCircle, Award, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitPracticeFeedback } from "@/lib/workflow/practice.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { FEEDBACK_QUESTIONS, PASS_THRESHOLD } from "@/lib/practice/questions";

export const Route = createFileRoute("/_authenticated/feedback/$contractId")({
  component: FeedbackFormPage,
  head: () => ({
    meta: [
      { title: "Formulari i vlerësimit | Zemër & Praktikë" },
      { name: "description", content: "Vlerëso nxënësin në 10 kategori dhe përcakto nëse fiton certifikatën e pjesëmarrjes." },
      { property: "og:title", content: "Formulari i vlerësimit të praktikës" },
      { property: "og:description", content: "Vlerësim 10-kategori i nxënësit në përfundim të praktikës." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FeedbackFormPage() {
  const { contractId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  const [certId, setCertId] = useState<string | null>(null);
  const submitFeedbackRpc = useServerFn(submitPracticeFeedback);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: c } = await supabase.from("contracts").select("*").eq("id", contractId).maybeSingle();
      if (!c) { toast.error("Kontrata nuk u gjet"); navigate({ to: "/feedback" }); return; }
      setContract(c);
      const ids = [c.student_id, ...(c.teacher_id ? [c.teacher_id] : [])];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setStudent(map.get(c.student_id));
      if (c.teacher_id) setTeacher(map.get(c.teacher_id));
      const { data: fb } = await supabase.from("practice_feedback").select("*").eq("contract_id", contractId).maybeSingle();
      if (fb) {
        setExisting(fb);
        setAnswers((fb.answers as Record<string, boolean>) ?? {});
        setComment(fb.comment ?? "");
      }
      const { data: cert } = await supabase.from("certificates").select("id").eq("contract_id", contractId).maybeSingle();
      if (cert) setCertId(cert.id);
      setLoading(false);
    })();
  }, [contractId, navigate]);

  if (loading || !contract) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const isBusiness = userId === contract.business_id;
  const score = FEEDBACK_QUESTIONS.filter((q) => answers[q.id]).length;
  const passed = score >= PASS_THRESHOLD;
  const readOnly = Boolean(existing) || !isBusiness;

  const submit = async () => {
    if (!isBusiness) return toast.error("Vetëm biznesi mund të plotësojë vlerësimin.");
    setSaving(true);
    try {
      const res = await submitFeedbackRpc({
        data: { contractId: contract.id, answers, comment: comment.trim() || null },
      });
      setExisting(res.feedback);
      if (res.certificateId) setCertId(res.certificateId);
      toast.success(
        res.passed
          ? res.certificateId
            ? "Vlerësimi u ruajt dhe certifikata u lëshua automatikisht."
            : "Vlerësimi u ruajt — nxënësi kualifikohet për certifikatë."
          : "Vlerësimi u ruajt.",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Gabim");
    } finally {
      setSaving(false);
    }
  };

  const finalScore = existing ? existing.score : score;
  const finalPassed = existing ? existing.passed : passed;

  return (
    <div className="mx-auto max-w-3xl space-y-6 print-area">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/feedback" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Vlerësimet
        </Link>
        {existing && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Printo raportin
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{contract.title}</CardTitle>
              <CardDescription>
                Nxënësi: {student?.full_name || student?.email || "—"}
                {teacher ? ` · Mësuesi: ${teacher.full_name || teacher.email}` : ""}
              </CardDescription>
            </div>
            <Badge variant={finalPassed ? "default" : "secondary"} className="gap-1">
              {finalPassed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {finalScore}/10
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Pragu i kalimit: {PASS_THRESHOLD}/10</span>
              <span>{finalScore} kategori të plotësuara</span>
            </div>
            <Progress value={finalScore * 10} />
          </div>

          <Separator />

          <div className="space-y-3">
            {FEEDBACK_QUESTIONS.map((q, i) => {
              const value = answers[q.id];
              return (
                <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{i + 1}. {q.label}</div>
                    {q.hint && <div className="text-xs text-muted-foreground">{q.hint}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={value === true ? "default" : "outline"}
                      disabled={readOnly}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: true }))}
                    >
                      Po
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={value === false ? "destructive" : "outline"}
                      disabled={readOnly}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: false }))}
                    >
                      Jo
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Koment përmbledhës</Label>
            <Textarea
              id="comment"
              value={comment}
              disabled={readOnly}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Përshtypjet e përgjithshme për ecurinë e nxënësit gjatë praktikës."
              rows={4}
            />
          </div>

          {!existing && isBusiness && (
            <div className="flex justify-end">
              <Button onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} Ruaj vlerësimin
              </Button>
            </div>
          )}

          {existing && (
            <div className="rounded-lg border border-border bg-background p-4 text-sm">
              {finalPassed ? (
                <div className="space-y-3">
                  <p className="text-foreground">
                    Nxënësi kaloi vlerësimin me {finalScore}/10 dhe {certId ? "certifikata u lëshua automatikisht." : "kualifikohet për certifikatën e pjesëmarrjes."}
                  </p>
                  {certId ? (
                    <Button asChild size="sm">
                      <Link to="/certificates/$id" params={{ id: certId }}>
                        <Award className="h-4 w-4" /> Shiko certifikatën
                      </Link>
                    </Button>
                  ) : isBusiness ? (
                    <Button asChild size="sm">
                      <Link to="/certificates/new" search={{ contract: contract.id }}>
                        <Award className="h-4 w-4" /> Lësho certifikatën
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Rezultati {finalScore}/10 është nën pragun {PASS_THRESHOLD}/10, prandaj certifikata nuk lëshohet.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
