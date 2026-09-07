import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type Notif = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationsBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, link, read, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await load(user.id);
      channel = supabase
        .channel(`notif:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => setItems((prev) => [payload.new as Notif, ...prev].slice(0, 20)),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (!userId) return;
    const ids = items.filter((i) => !i.read).map((i) => i.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">Njoftime</div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="h-7 gap-1 text-xs">
              <Check className="h-3 w-3" /> Shëno të lexuara
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Asnjë njoftim ende</div>
          ) : (
            items.map((n) => {
              const inner = (
                <div className={`px-3 py-2.5 ${n.read ? "" : "bg-primary/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium leading-tight">{n.title}</div>
                    {!n.read && <Badge variant="secondary" className="h-4 px-1 text-[9px]">i ri</Badge>}
                  </div>
                  {n.message && <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>}
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("sq-AL")}
                  </p>
                </div>
              );
              return (
                <div key={n.id} className="border-b last:border-b-0">
                  {n.link ? <Link to={n.link as any}>{inner}</Link> : inner}
                </div>
              );
            })
          )}
        </div>
        <div className="border-t px-3 py-2">
          <Link to="/notifications" className="block text-center text-xs font-medium text-primary hover:underline">
            Shih të gjitha njoftimet
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}