import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Check, CheckCheck, Loader2, Trash2, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Njoftimet — Zemër & Praktike" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  type: string | null;
};

function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, link, read, created_at, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setItems(data ?? []);
      setLoading(false);
      channel = supabase
        .channel(`notif-page:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => setItems((prev) => [payload.new as Notif, ...prev]),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const visible = filter === "unread" ? items.filter((i) => !i.read) : items;
  const unreadCount = items.filter((i) => !i.read).length;

  const markOne = async (id: string, read: boolean) => {
    const prev = items;
    setItems((p) => p.map((i) => (i.id === id ? { ...i, read } : i)));
    const { error } = await supabase.from("notifications").update({ read }).eq("id", id);
    if (error) {
      setItems(prev);
      toast.error("Nuk u përditësua");
    }
  };

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    setItems((p) => p.map((i) => ({ ...i, read: true })));
    const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
    if (error) toast.error("Nuk u përditësuan të gjitha");
    else toast.success("Të gjitha u shënuan si të lexuara");
  };

  const remove = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast.error("Nuk u fshi");
    }
  };

  const clearAll = async () => {
    if (!userId || items.length === 0) return;
    if (!confirm("Fshi të gjitha njoftimet?")) return;
    const prev = items;
    setItems([]);
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId);
    if (error) {
      setItems(prev);
      toast.error("Nuk u fshinë");
    } else {
      toast.success("Të gjitha njoftimet u fshinë");
    }
  };

  const openLink = (n: Notif) => {
    if (!n.read) markOne(n.id, true);
    if (n.link) navigate({ to: n.link as any });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Njoftimet</h1>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadCount} të reja</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllRead} className="gap-1">
                <CheckCheck className="h-4 w-4" /> Shëno të gjitha
              </Button>
            )}
            {items.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearAll} className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Pastro
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">Të gjitha ({items.length})</TabsTrigger>
            <TabsTrigger value="unread">Të palexuara ({unreadCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              {filter === "unread" ? "Asnjë njoftim i palexuar" : "Asnjë njoftim ende"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "unread"
                ? "Të gjitha njoftimet janë të lexuara."
                : "Do të shfaqen këtu aplikimet, mesazhet dhe përditësimet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((n) => (
              <div
                key={n.id}
                className={`group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-card)] ${
                  n.read ? "" : "border-primary/40 bg-primary/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openLink(n)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold leading-tight">{n.title}</h3>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="i palexuar" />}
                    </div>
                    {n.message && (
                      <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                    )}
                    <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("sq-AL")}
                      {n.type && <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] normal-case">{n.type}</span>}
                    </p>
                  </button>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.read && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markOne(n.id, true)} title="Shëno si i lexuar">
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(n.id)} title="Fshi">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}