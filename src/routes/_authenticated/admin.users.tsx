import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Shield, CheckCircle2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Administrim · Përdoruesit · Zemër & Praktikë" },
      { name: "description", content: "Menaxho përdoruesit dhe rolet e tyre në platformë." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administrim · Përdoruesit · Zemër & Praktikë" },
      { property: "og:description", content: "Menaxho përdoruesit dhe rolet e tyre në platformë." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsersPage,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  organization: string | null;
  created_at: string;
  role: "super_admin" | "teacher" | "student" | "business" | null;
  business_verified: boolean | null;
};

const ROLES = ["student", "business", "teacher", "super_admin"] as const;

function AdminUsersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) {
      toast.error(error.message);
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRoleChange = async (userId: string, role: typeof ROLES[number]) => {
    const { error } = await supabase.rpc("admin_set_user_role", { _user_id: userId, _role: role });
    if (error) return toast.error(error.message);
    toast.success("Roli u përditësua");
    load();
  };

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.email ?? "").toLowerCase().includes(q) || (r.full_name ?? "").toLowerCase().includes(q) || (r.organization ?? "").toLowerCase().includes(q);
  });

  const exportCSV = () => {
    const headers = ["email","full_name","organization","role","business_verified","created_at"];
    const escape = (v: any) => `"${String(v ?? "").replaceAll('"','""')}"`;
    const lines = [headers.join(","), ...filtered.map((r) => headers.map((h) => escape((r as any)[h])).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `perdoruesit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4" /> Mbrapa</Link></Button>
            <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /><span className="font-semibold">Përdoruesit</span></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Kërko sipas emrit, email-it ose organizatës..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
          <Button variant="outline" onClick={exportCSV} disabled={loading || filtered.length === 0}>
            <Download className="h-4 w-4" /> Eksporto CSV
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filtered.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.full_name || "(pa emër)"}</span>
                        {r.business_verified === true && <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Verifikuar</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{r.email}</div>
                      {r.organization && <div className="text-xs text-muted-foreground">{r.organization}</div>}
                    </div>
                    <div className="w-44">
                      <Select value={r.role ?? "student"} onValueChange={(v) => onRoleChange(r.id, v as typeof ROLES[number])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <div className="px-5 py-10 text-center text-muted-foreground">Asnjë përdorues</div>}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}