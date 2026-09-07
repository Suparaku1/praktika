import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Trash2, Plus, CheckCircle2, Circle, StickyNote, ListTodo, Mail, Phone, Building, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { qk } from "@/lib/query/keys";

type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Të reja", contacted: "Të kontaktuar", qualified: "Të kualifikuar",
  proposal: "Ofertë", won: "Fituar", lost: "Humbur",
};

export const Route = createFileRoute("/_authenticated/crm/$id")({
  head: () => ({
    meta: [
      { title: "CRM · Lead · Zemër & Praktikë" },
      { name: "description", content: "Detajet, shënimet dhe detyrat për këtë lead." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CRM · Lead · Zemër & Praktikë" },
      { property: "og:description", content: "Detajet, shënimet dhe detyrat për këtë lead." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [posting, setPosting] = useState(false);

  const leadQ = useQuery({
    queryKey: qk.crmLead(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const notesQ = useQuery({
    queryKey: qk.crmNotes(id),
    queryFn: async () => {
      const { data } = await supabase.from("crm_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const tasksQ = useQuery({
    queryKey: qk.crmTasks(id),
    queryFn: async () => {
      const { data } = await supabase.from("crm_tasks").select("*").eq("lead_id", id).order("done", { ascending: true }).order("due_at", { ascending: true });
      return data ?? [];
    },
  });

  const lead = leadQ.data;

  if (leadQ.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!lead) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <main className="container mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Lead-i nuk u gjet</h1>
          <Link to="/crm" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Kthehu te CRM</Link>
        </main>
      </div>
    );
  }

  const setStatus = async (status: LeadStatus) => {
    const { error } = await supabase.from("crm_leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: qk.crmLead(id) });
    qc.invalidateQueries({ queryKey: qk.crmLeads() });
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setPosting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("crm_notes").insert({ lead_id: id, author_id: user.id, body: note.trim() });
    setPosting(false);
    if (error) return toast.error(error.message);
    setNote("");
    qc.invalidateQueries({ queryKey: qk.crmNotes(id) });
  };

  const removeNote = async (nid: string) => {
    const { error } = await supabase.from("crm_notes").delete().eq("id", nid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: qk.crmNotes(id) });
  };

  const addTask = async () => {
    if (!taskTitle.trim()) return;
    const { error } = await supabase.from("crm_tasks").insert({
      lead_id: id, title: taskTitle.trim(),
      due_at: taskDue ? new Date(taskDue).toISOString() : null,
    });
    if (error) return toast.error(error.message);
    setTaskTitle(""); setTaskDue("");
    qc.invalidateQueries({ queryKey: qk.crmTasks(id) });
  };

  const toggleTask = async (tid: string, done: boolean) => {
    const { error } = await supabase.from("crm_tasks").update({ done: !done }).eq("id", tid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: qk.crmTasks(id) });
  };

  const removeTask = async (tid: string) => {
    const { error } = await supabase.from("crm_tasks").delete().eq("id", tid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: qk.crmTasks(id) });
  };

  const removeLead = async () => {
    if (!confirm("Fshi këtë lead përfundimisht?")) return;
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("U fshi");
    qc.invalidateQueries({ queryKey: qk.crmLeads() });
    navigate({ to: "/crm" });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/crm" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> CRM
        </Link>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{lead.name}</CardTitle>
                <CardDescription className="mt-1">Krijuar më {new Date(lead.created_at).toLocaleDateString("sq-AL")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={lead.status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={removeLead}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {lead.company && <InfoRow icon={Building} label="Kompania" value={lead.company} />}
              {lead.email && <InfoRow icon={Mail} label="Email" value={lead.email} />}
              {lead.phone && <InfoRow icon={Phone} label="Telefon" value={lead.phone} />}
              {lead.source && <InfoRow icon={ListTodo} label="Burimi" value={lead.source} />}
              {lead.value != null && <InfoRow icon={CheckCircle2} label="Vlera" value={`${Number(lead.value).toLocaleString("sq-AL")} ALL`} />}
              {lead.next_action_at && <InfoRow icon={Calendar} label="Veprimi tjetër" value={new Date(lead.next_action_at).toLocaleString("sq-AL")} />}
            </div>
            {lead.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Përshkrim</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{lead.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ListTodo className="h-4 w-4 text-primary" /> Detyra</CardTitle>
              <CardDescription>Hapa konkretë për këtë lead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input placeholder="p.sh. Dërgo ofertë" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                <Input type="datetime-local" className="sm:w-52" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                <Button onClick={addTask}><Plus className="h-4 w-4" /></Button>
              </div>
              {tasksQ.isLoading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
              ) : (tasksQ.data ?? []).length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">Ende pa detyra.</p>
              ) : (
                <ul className="space-y-1.5">
                  {(tasksQ.data ?? []).map((t: any) => (
                    <li key={t.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm">
                      <button onClick={() => toggleTask(t.id, t.done)}>
                        {t.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                        {t.due_at && <div className="text-xs text-muted-foreground">Afati: {new Date(t.due_at).toLocaleString("sq-AL")}</div>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeTask(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><StickyNote className="h-4 w-4 text-primary" /> Shënime</CardTitle>
              <CardDescription>Historik komunikimi dhe detajesh.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Textarea rows={3} placeholder="Shto një shënim..." value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addNote} disabled={posting || !note.trim()}>
                    {posting && <Loader2 className="h-4 w-4 animate-spin" />} Shto
                  </Button>
                </div>
              </div>
              {notesQ.isLoading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
              ) : (notesQ.data ?? []).length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">Ende pa shënime.</p>
              ) : (
                <ul className="space-y-2">
                  {(notesQ.data ?? []).map((n: any) => (
                    <li key={n.id} className="rounded-md border border-border/60 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="whitespace-pre-wrap">{n.body}</p>
                        <Button size="sm" variant="ghost" onClick={() => removeNote(n.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("sq-AL")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background p-3">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}