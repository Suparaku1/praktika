import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: "Bisedë · Zemër & Praktikë" },
      { name: "description", content: "Komunikim i drejtpërdrejtë mes nxënësve, bizneseve dhe mësuesve." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Bisedë · Zemër & Praktikë" },
      { property: "og:description", content: "Komunikim i drejtpërdrejtë mes nxënësve, bizneseve dhe mësuesve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function ChatPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [other, setOther] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);

      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .select("id, participant_a, participant_b")
        .eq("id", id)
        .maybeSingle();
      if (cErr || !conv) {
        toast.error("Biseda nuk u gjet");
        navigate({ to: "/messages" });
        return;
      }
      const otherId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a;
      const { data: prof } = await supabase.from("profiles").select("id, full_name, email").eq("id", otherId).maybeSingle();
      setOther({ id: otherId, name: prof?.full_name || prof?.email || "Përdorues" });

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, read_at, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(msgs ?? []);
      setLoading(false);

      // mark messages from other as read
      const unreadIds = (msgs ?? []).filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
      }

      channel = supabase
        .channel(`chat:${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
          (payload) => {
            const m = payload.new as Msg;
            setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            if (m.sender_id !== user.id) {
              supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
            }
          },
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !me) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: me, body });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/messages"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {other?.name.charAt(0).toUpperCase()}
          </div>
          <div className="font-semibold">{other?.name}</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl space-y-2 px-4 py-6">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Filloni bisedën me {other?.name}.</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={send} className="border-t border-border bg-background">
        <div className="container mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Shkruaj një mesazh…"
            maxLength={4000}
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}