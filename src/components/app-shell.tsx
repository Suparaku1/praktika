import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  LayoutDashboard,
  Briefcase,
  FileText,
  FileSignature,
  Award,
  Users,
  MessageCircle,
  BarChart3,
  Shield,
  UserCog,
  LogOut,
  Building2,
  Contact,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Bookmark } from "lucide-react";
import { Star } from "lucide-react";
import { Trophy, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { NotificationsBell } from "@/components/notifications-bell";
import { CommandPalette } from "@/components/command-palette";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { SchoolLogo } from "@/components/school-logo";

type AppRole = "super_admin" | "teacher" | "student" | "business";

type NavItem = { to: string; labelKey: TranslationKey; icon: LucideIcon; roles?: AppRole[] };

const NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "app.home", icon: LayoutDashboard },
  { to: "/jobs", labelKey: "app.jobs", icon: Briefcase },
  { to: "/jobs/manage", labelKey: "app.myJobs", icon: Briefcase, roles: ["business"] },
  { to: "/applications", labelKey: "app.applications", icon: FileText, roles: ["student", "business"] },
  { to: "/shortlist", labelKey: "app.shortlist", icon: Star, roles: ["teacher", "super_admin"] },
  { to: "/winners", labelKey: "app.winners", icon: Trophy, roles: ["business", "super_admin"] },
  { to: "/feedback", labelKey: "app.feedback", icon: ClipboardCheck, roles: ["business", "super_admin"] },
  { to: "/saved", labelKey: "app.saved", icon: Bookmark, roles: ["student"] },
  { to: "/history", labelKey: "app.history", icon: FileText, roles: ["student"] },
  { to: "/contracts", labelKey: "app.contracts", icon: FileSignature },
  { to: "/certificates", labelKey: "app.certificates", icon: Award },
  { to: "/classes", labelKey: "app.classes", icon: Users, roles: ["student", "teacher"] },
  { to: "/messages", labelKey: "app.messages", icon: MessageCircle },
  { to: "/crm", labelKey: "app.crm", icon: Contact, roles: ["business", "super_admin"] },
  { to: "/analytics", labelKey: "app.analytics", icon: BarChart3 },
  { to: "/reports", labelKey: "app.reports", icon: BarChart3, roles: ["teacher", "super_admin"] },
  { to: "/admin", labelKey: "app.admin", icon: Shield, roles: ["super_admin"] },
  { to: "/admin/users", labelKey: "app.users", icon: Users, roles: ["super_admin"] },
  { to: "/admin/businesses", labelKey: "app.businesses", icon: Building2, roles: ["super_admin"] },
];

const CRUMB_LABELS: Record<string, string> = {
  dashboard: "Kryefaqja",
  jobs: "Punët",
  manage: "Menaxho",
  new: "E re",
  applications: "Aplikimet",
  contracts: "Kontratat",
  certificates: "Certifikatat",
  classes: "Klasat",
  messages: "Mesazhet",
  analytics: "Analitika",
  notifications: "Njoftimet",
  profile: "Profili",
  admin: "Admin",
  users: "Përdoruesit",
  businesses: "Bizneset",
  crm: "CRM",
  shortlist: "Përzgjedhja",
  winners: "Fituesit",
  feedback: "Vlerësimet",
  history: "Historiku im",
  saved: "Të ruajtura",
  reports: "Raportet",
};

function useBreadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    const label = CRUMB_LABELS[p] ?? (p.length > 20 ? p.slice(0, 8) + "…" : p);
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

export function AppShell({ children, role }: { children: ReactNode; role?: AppRole | null }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const crumbs = useBreadcrumbs();

  const items = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("toast.loggedOut"));
    navigate({ to: "/", replace: true });
  };

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((n) => {
        const active = location.pathname === n.to || (n.to !== "/dashboard" && location.pathname.startsWith(n.to));
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to as any}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(n.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <Link to="/dashboard" className="flex items-center gap-2 px-4 py-4">
      <SchoolLogo />
      <span className="font-semibold tracking-tight">Zemër & Praktike</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-secondary/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:flex lg:flex-col">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t p-3 space-y-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Link to="/profile"><UserCog className="h-4 w-4" /> {t("nav.profile")}</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" /> {t("nav.logout")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile menu */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="border-b p-0">
                    <SheetTitle className="sr-only">{t("app.navigation")}</SheetTitle>
                    <Brand />
                  </SheetHeader>
                  <div className="flex h-[calc(100vh-72px)] flex-col">
                    <div className="flex-1 overflow-y-auto">
                      <SidebarNav onNavigate={() => setOpen(false)} />
                    </div>
                    <div className="border-t p-3 space-y-1">
                      <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => setOpen(false)}>
                        <Link to="/profile"><UserCog className="h-4 w-4" /> {t("nav.profile")}</Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start gap-2">
                        <LogOut className="h-4 w-4" /> {t("nav.logout")}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Breadcrumbs */}
              <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm text-muted-foreground sm:flex">
                {crumbs.map((c, i) => (
                  <span key={c.href} className="flex items-center gap-1 min-w-0">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                    {i === crumbs.length - 1 ? (
                      <span className="truncate font-medium text-foreground">{c.label}</span>
                    ) : (
                      <Link to={c.href as any} className="truncate hover:text-foreground">{c.label}</Link>
                    )}
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher compact />
              <CommandPalette />
              <NotificationsBell />
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
