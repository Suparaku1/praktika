import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, FileSignature, Send, XCircle, CheckCircle2, Clock, FileText, Building2, GraduationCap, Award, FolderCheck, UserCog, ClipboardCheck, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyAndEmail } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ContractReviews } from "@/components/contract-reviews";
import { ContractAttachments } from "@/components/contract-attachments";

export const Route = createFileRoute("/_authenticated/contracts/$id")({
  head: () => ({
    meta: [
      { title: "Kontrata · Zemër & Praktikë" },
      { name: "description", content: "Detajet, nënshkrimi dhe dokumentet e kontratës së praktikës." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Kontrata · Zemër & Praktikë" },
      { property: "og:description", content: "Detajet, nënshkrimi dhe dokumentet e kontratës së praktikës." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContractDetailPage,
});

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  sent: { label: "Dërguar", variant: "secondary", icon: Send },
  signed_student: { label: "Nënshkruar nga nxënësi", variant: "secondary", icon: FileSignature },
  signed_business: { label: "Nënshkruar nga biznesi", variant: "secondary", icon: FileSignature },
  active: { label: "Aktive", variant: "default", icon: CheckCircle2 },
  completed: { label: "Përfunduar", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Anuluar", variant: "destructive", icon: XCircle },
};

function ContractDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [counterparties, setCounterparties] = useState<{ business?: any; student?: any; teacher?: any }>({});

  // Sign dialog state
  const [signName, setSignName] = useState("");
  const [signAgree, setSignAgree] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data, error } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
    if (error || !data) { toast.error(error?.message ?? "Kontrata nuk u gjet"); navigate({ to: "/contracts" }); return; }
    setContract(data);
    const ids = [data.business_id, data.student_id, ...(data.teacher_id ? [data.teacher_id] : [])];
    const { data: profs } = await supabase.from("profiles").select("id, full_name, email, organization").in("id", ids);
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setCounterparties({ business: map.get(data.business_id), student: map.get(data.student_id), teacher: data.teacher_id ? map.get(data.teacher_id) : undefined });
    const { data: evs } = await supabase.from("contract_events").select("id, action, actor_id, metadata, created_at").eq("contract_id", id).order("created_at", { ascending: false });
    setEvents(evs ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading || !contract || !userId) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const isBusiness = userId === contract.business_id;
  const isStudent = userId === contract.student_id;
  const isTeacher = userId === contract.teacher_id;
  const M = statusMeta[contract.status] ?? statusMeta.draft;
  const StatusIcon = M.icon;

  const send = async () => {
    setActing(true);
    const { error } = await supabase.from("contracts").update({ status: "sent" }).eq("id", id);
    if (error) { setActing(false); return toast.error(error.message); }
    await supabase.from("contract_events").insert({ contract_id: id, actor_id: userId, action: "sent" });
    toast.success("Kontrata u dërgua për nënshkrim");
    setActing(false); load();
  };

  const cancel = async () => {
    if (!confirm("Konfirmo anulimin e kontratës?")) return;
    setActing(true);
    const { error } = await supabase.from("contracts").update({ status: "cancelled" }).eq("id", id);
    if (error) { setActing(false); return toast.error(error.message); }
    await supabase.from("contract_events").insert({ contract_id: id, actor_id: userId, action: "cancelled" });
    toast.success("Kontrata u anulua");
    setActing(false); load();
  };

  const sign = async () => {
    if (!signAgree) return toast.error("Duhet të konfirmosh dakordësinë");
    if (signName.trim().length < 3) return toast.error("Shkruaj emrin e plotë");
    setActing(true);
    const now = new Date().toISOString();
    const update: any = {};
    if (isStudent) {
      update.student_signed_at = now;
      update.student_signature_name = signName.trim();
    } else if (isBusiness) {
      update.business_signed_at = now;
      update.business_signature_name = signName.trim();
    }
    // Compute new status
    const studentSigned = isStudent ? true : Boolean(contract.student_signed_at);
    const businessSigned = isBusiness ? true : Boolean(contract.business_signed_at);
    if (studentSigned && businessSigned) update.status = "active";
    else if (studentSigned) update.status = "signed_student";
    else if (businessSigned) update.status = "signed_business";

    const { error } = await supabase.from("contracts").update(update).eq("id", id);
    if (error) { setActing(false); return toast.error(error.message); }
    await supabase.from("contract_events").insert({
      contract_id: id, actor_id: userId, action: isStudent ? "signed_student" : "signed_business",
      metadata: { name: signName.trim() } as any,
    });
    toast.success("Kontrata u nënshkrua");
    setActing(false); setSignOpen(false); load();
  };

  const complete = async () => {
    setActing(true);
    const { error } = await supabase.from("contracts").update({ status: "completed" }).eq("id", id);
    if (error) { setActing(false); return toast.error(error.message); }
    await supabase.from("contract_events").insert({ contract_id: id, actor_id: userId, action: "completed" });
    toast.success("Kontrata u shënua si e përfunduar");
    setActing(false); load();
  };

  const toggleDocsReady = async () => {
    setActing(true);
    const next = !contract.documents_ready;
    const { error } = await supabase.from("contracts").update({ documents_ready: next }).eq("id", id);
    if (error) { setActing(false); return toast.error(error.message); }
    await supabase.from("contract_events").insert({ contract_id: id, actor_id: userId, action: next ? "documents_ready" : "documents_pending" });
    if (next) {
      await notifyAndEmail([
        { user_id: contract.student_id, type: "contract", title: "Dokumentet janë gati", message: `Mësuesi përfundoi dokumentacionin për "${contract.title}".`, link: `/contracts/${id}` },
        { user_id: contract.business_id, type: "contract", title: "Dokumentet janë gati", message: `Mësuesi përfundoi dokumentacionin për "${contract.title}".`, link: `/contracts/${id}` },
      ]);
    }
    toast.success(next ? "Dokumentet u shënuan si gati" : "U hoq shenja e gatishmërisë");
    setActing(false); load();
  };

  const canSign =
    (isStudent && !contract.student_signed_at && ["sent", "signed_business"].includes(contract.status)) ||
    (isBusiness && !contract.business_signed_at && ["sent", "signed_student", "draft"].includes(contract.status));

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/contracts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Kontratat
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Printo / PDF
          </Button>
        </div>

        <Card className="print-area">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{contract.title}</CardTitle>
                <CardDescription className="mt-1">
                  Krijuar më {new Date(contract.created_at).toLocaleDateString("sq-AL")}
                </CardDescription>
              </div>
              <Badge variant={M.variant} className="gap-1"><StatusIcon className="h-3 w-3" /> {M.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" /> Biznesi</div>
                <div className="mt-1 text-sm">{counterparties.business?.organization || counterparties.business?.full_name || counterparties.business?.email}</div>
                {contract.business_signed_at ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Nënshkruar nga <span className="font-medium text-foreground">{contract.business_signature_name}</span> më {new Date(contract.business_signed_at).toLocaleString("sq-AL")}
                  </div>
                ) : <div className="mt-2 text-xs text-muted-foreground">I panënshkruar</div>}
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-primary" /> Nxënësi</div>
                <div className="mt-1 text-sm">{counterparties.student?.full_name || counterparties.student?.email}</div>
                {contract.student_signed_at ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Nënshkruar nga <span className="font-medium text-foreground">{contract.student_signature_name}</span> më {new Date(contract.student_signed_at).toLocaleString("sq-AL")}
                  </div>
                ) : <div className="mt-2 text-xs text-muted-foreground">I panënshkruar</div>}
              </div>
            </div>

            {(contract.teacher_id || isTeacher) && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold"><UserCog className="h-4 w-4 text-primary" /> Mësuesi i praktikës</div>
                    <div className="mt-1 text-sm">{counterparties.teacher?.full_name || counterparties.teacher?.email || "—"}</div>
                  </div>
                  <Badge variant={contract.documents_ready ? "default" : "outline"} className="gap-1">
                    <FolderCheck className="h-3 w-3" /> {contract.documents_ready ? "Dokumentet gati" : "Dokumentet në pritje"}
                  </Badge>
                </div>
                {isTeacher && (
                  <Button className="mt-3" variant={contract.documents_ready ? "outline" : "default"} onClick={toggleDocsReady} disabled={acting}>
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderCheck className="h-4 w-4" />}
                    {contract.documents_ready ? "Hiq shenjën 'gati'" : "Shëno dokumentet si gati"}
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-sm">
              <Field label="Fillimi" value={contract.start_date ? new Date(contract.start_date).toLocaleDateString("sq-AL") : "—"} />
              <Field label="Mbarimi" value={contract.end_date ? new Date(contract.end_date).toLocaleDateString("sq-AL") : "—"} />
              <Field label="Orë / javë" value={contract.hours_per_week ?? "—"} />
              <Field label="Kompensim" value={contract.compensation ? `${contract.compensation} ${contract.compensation_currency}` : "—"} />
              <Field label="Vendi" value={contract.location ?? "—"} />
            </div>

            <Separator />

            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Përmbajtja</Label>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground/90">
{contract.content}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {isBusiness && contract.status === "draft" && (
                <Button onClick={send} disabled={acting}><Send className="h-4 w-4" /> Dërgo për nënshkrim</Button>
              )}
              {canSign && (
                <Dialog open={signOpen} onOpenChange={setSignOpen}>
                  <DialogTrigger asChild>
                    <Button><FileSignature className="h-4 w-4" /> Nënshkruaj</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nënshkrim elektronik</DialogTitle>
                      <DialogDescription>
                        Duke vendosur emrin e plotë dhe duke konfirmuar, ti pranon kushtet e kësaj kontrate. Veprimi do të regjistrohet me datë dhe orë.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="signname">Emri i plotë</Label>
                        <Input id="signname" value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Shkruaj emrin e plotë" />
                      </div>
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox checked={signAgree} onCheckedChange={(v) => setSignAgree(Boolean(v))} />
                        <span>Konfirmoj se kam lexuar dhe pranoj kushtet e kësaj kontrate.</span>
                      </label>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSignOpen(false)}>Anulo</Button>
                      <Button onClick={sign} disabled={acting}>
                        {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />} Nënshkruaj
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {isBusiness && contract.status === "active" && (
                <Button variant="outline" onClick={complete} disabled={acting}><CheckCircle2 className="h-4 w-4" /> Shëno si e përfunduar</Button>
              )}
              {(isBusiness || isTeacher) && ["active", "completed"].includes(contract.status) && (
                <Button asChild variant="outline">
                  <Link to="/feedback/$contractId" params={{ contractId: contract.id }}>
                    <ClipboardCheck className="h-4 w-4" /> Vlerësimi i praktikës
                  </Link>
                </Button>
              )}
              {isBusiness && contract.status === "completed" && (
                <Button asChild>
                  <Link to="/certificates/new" search={{ contract: contract.id }}><Award className="h-4 w-4" /> Lësho certifikatë</Link>
                </Button>
              )}
              {(isBusiness || isStudent) && !["cancelled", "completed", "active"].includes(contract.status) && (
                <Button variant="ghost" className="text-destructive" onClick={cancel} disabled={acting}>
                  <XCircle className="h-4 w-4" /> Anulo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {events.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Historiku</CardTitle>
              <CardDescription>Çdo veprim i regjistruar mbi këtë kontratë.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                    <span className="font-medium">{e.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("sq-AL")}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {userId && <ContractReviews contract={contract} userId={userId} />}
        <div className="mt-6">
          <ContractAttachments contractId={contract.id} canEdit={isBusiness || isStudent || isTeacher} />
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}