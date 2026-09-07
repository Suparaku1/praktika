import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2, Users, Mail, Phone, Building, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { qk } from "@/lib/query/keys";

type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type Lead = {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; source: string | null; status: LeadStatus;
  value: number | null; next_action_at: string | null; created_at: string;
};

const STATUSES: { key: LeadStatus; label: string; tone: string }[] = [
  { key: "new", label: "Të reja", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  { key: "contacted", label: "Të kontaktuar", tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20" },
  { key: "qualified", label: "Të kualifikuar", tone: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" },
  { key: "proposal", label: "Ofertë", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" },
  { key: "won", label: "Fituar", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" },
  { key: "lost", label: "Humbur", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20" },
];

export const Route = createFileRoute("/_authenticated/crm/")({
  component: CrmPage,
  head: () => ({
    meta: [
      { title: "CRM · Klientët" },
      { name: "description", content: "Menaxho lead-et, kontaktet dhe pipeline-in e klientëve." },
    ],
  }),
});

function CrmPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "", value: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: qk.crmLeads(),
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_leads")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
    staleTime: 15_000,
  });

  const filtered = q
    ? leads.filter((l) => [l.name, l.email, l.company].some((f) => f?.toLowerCase().includes(q.toLowerCase())))
    : leads;

  const create = async () => {
    if (!form.name.trim()) return toast.error("Emri është i detyrueshëm");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data, error } = await supabase.from("crm_leads").insert({
      owner_id: user.id,
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      company: form.company || null,
      source: form.source || null,
      value: form.value ? Number(form.value) : null,
      notes: form.notes || null,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lead-i u krijua");
    setOpen(false);
    setForm({ name: "", email: "", phone: "", company: "", source: "", value: "", notes: "" });
    qc.invalidateQueries({ queryKey: qk.crmLeads() });
    if (data) navigate({ to: "/crm/$id", params: { id: data.id } });
  };

  const setStatus = async (id: string, status: LeadStatus) => {
    const { error } = await supabase.from("crm_leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: qk.crmLeads() });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-7xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM — Klientët</h1>
            <p className="mt-1 text-muted-foreground">Pipeline lead-esh, kontakte dhe hapa të ardhshëm.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="w-56 pl-8" placeholder="Kërko emër, email, kompani..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Lead i ri</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Lead i ri</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5"><Label>Emri *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                    <div className="grid gap-1.5"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5"><Label>Kompania</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                    <div className="grid gap-1.5"><Label>Burimi</Label><Input placeholder="LinkedIn, rekomandim..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
                  </div>
                  <div className="grid gap-1.5"><Label>Vlera potenciale (ALL)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                  <div className="grid gap-1.5"><Label>Shënime</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Anulo</Button>
                  <Button onClick={create} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Krijo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : leads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">Ende pa lead-e</CardTitle>
              <CardDescription>Fillo duke shtuar kontaktin e parë të interesuar.</CardDescription>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Lead i ri</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {STATUSES.map((s) => {
              const col = filtered.filter((l) => l.status === s.key);
              return (
                <div key={s.key} className="flex flex-col gap-2">
                  <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${s.tone}`}>
                    {s.label} <span className="ml-1 opacity-70">({col.length})</span>
                  </div>
                  <div className="flex min-h-[40px] flex-col gap-2">
                    {col.map((l) => (
                      <Card key={l.id} className="transition hover:shadow-md">
                        <CardHeader className="p-3">
                          <Link to="/crm/$id" params={{ id: l.id }} className="text-sm font-semibold hover:underline">{l.name}</Link>
                          {l.company && <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Building className="h-3 w-3" /> {l.company}</div>}
                          {l.email && <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate"><Mail className="h-3 w-3" /> {l.email}</div>}
                          {l.phone && <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {l.phone}</div>}
                          {l.value != null && <Badge variant="secondary" className="mt-2 w-fit">{Number(l.value).toLocaleString("sq-AL")} ALL</Badge>}
                          <Select value={l.status} onValueChange={(v) => setStatus(l.id, v as LeadStatus)}>
                            <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}