import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  FileSignature,
  Award,
  Users,
  MessageCircle,
  BarChart3,
  Bell,
  UserCog,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

type JobHit = { id: string; title: string; city: string | null };

const NAV_ITEMS = [
  { to: "/dashboard", label: "Kryefaqja", icon: LayoutDashboard },
  { to: "/jobs", label: "Punët", icon: Briefcase },
  { to: "/applications", label: "Aplikimet", icon: FileText },
  { to: "/contracts", label: "Kontratat", icon: FileSignature },
  { to: "/certificates", label: "Certifikatat", icon: Award },
  { to: "/classes", label: "Klasat", icon: Users },
  { to: "/messages", label: "Mesazhet", icon: MessageCircle },
  { to: "/analytics", label: "Analitika", icon: BarChart3 },
  { to: "/notifications", label: "Njoftimet", icon: Bell },
  { to: "/profile", label: "Profili", icon: UserCog },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobHit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setJobs([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, city")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(8);
      setJobs((data as JobHit[]) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = (to: string, params?: Record<string, string>) => {
    setOpen(false);
    if (params) navigate({ to: to as any, params: params as any });
    else navigate({ to: to as any });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-secondary sm:inline-flex"
        aria-label="Kërko"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Kërko…</span>
        <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Kërko faqe, shpallje…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>Asnjë rezultat.</CommandEmpty>
          <CommandGroup heading="Navigim">
            {NAV_ITEMS.map((n) => {
              const Icon = n.icon;
              return (
                <CommandItem key={n.to} value={n.label} onSelect={() => go(n.to)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {n.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
          {jobs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Shpallje">
                {jobs.map((j) => (
                  <CommandItem
                    key={j.id}
                    value={`job-${j.id}-${j.title}`}
                    onSelect={() => go("/jobs/$id", { id: j.id })}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span className="truncate">{j.title}</span>
                    {j.city && (
                      <span className="ml-auto text-xs text-muted-foreground">{j.city}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}