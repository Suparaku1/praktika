import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Mesazhet · Zemër & Praktikë" },
      { name: "description", content: "Bisedat e tua me biznese, nxënës dhe mësues." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Mesazhet · Zemër & Praktikë" },
      { property: "og:description", content: "Bisedat e tua me biznese, nxënës dhe mësues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

type Conv = {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string;
  other_id: string;
  other_name: string;
  last_body: string | null;
  unread: number;
};

function MessagesPage() {
  const [items, setItems] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, participant_a, participant_b, last_message_at")
      .order("last_message_at", { ascending: false });
    if (!convs || convs.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const otherIds = Array.from(new Set(convs.map((c) => (c.participant_a === user.id ? c.participant_b : c.participant_a))));
    const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", otherIds);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const convIds = convs.map((c) => c.id);
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("conversation_id, body, sender_id, read_at, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });
    const lastMap = new Map<string, any>();
    const unreadCount = new Map<string, number>();
    for (const m of lastMsgs ?? []) {
      if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
      if (m.sender_id !== user.id && !m.read_at) {
        unreadCount.set(m.conversation_id, (unreadCount.get(m.conversation_id) ?? 0) + 1);
      }
    }

    setItems(
      convs.map((c) => {
        const other = c.participant_a === user.id ? c.participant_b : c.participant_a;
        const op: any = pMap.get(other);
        const lm = lastMap.get(c.id);
        return {
          id: c.id,
          participant_a: c.participant_a,
          participant_b: c.participant_b,
          last_message_at: c.last_message_at,
          other_id: other,
          other_name: op?.full_name || op?.email || "Përdorues",
          last_body: lm?.body ?? null,
          unread: unreadCount.get(c.id) ?? 0,
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Mesazhet</h1>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-lg">Ende nuk ke biseda</CardTitle>
              <CardDescription>Bisedat fillojnë nga një aplikim ose kontratë.</CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <Link key={c.id} to="/messages/$id" params={{ id: c.id }}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {c.other_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-semibold">{c.other_name}</div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {new Date(c.last_message_at).toLocaleDateString("sq-AL")}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-muted-foreground">{c.last_body ?? "Bisedë e re"}</p>
                        {c.unread > 0 && (
                          <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}