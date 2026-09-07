import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteHeader() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setReady(true);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("toast.loggedOut"));
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-foreground">Zemër & Praktike</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("brand.tagline")}</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/jobs" className="transition-colors hover:text-foreground">{t("nav.jobs")}</Link>
          <Link to="/" hash="audiences" className="transition-colors hover:text-foreground">{t("nav.audiences")}</Link>
          <Link to="/" hash="how" className="transition-colors hover:text-foreground">{t("nav.how")}</Link>
          <Link to="/" hash="faq" className="transition-colors hover:text-foreground">{t("nav.faq")}</Link>
          <Link to="/" hash="contact" className="transition-colors hover:text-foreground">{t("nav.contact")}</Link>
        </nav>
        <div className="flex min-h-9 items-center gap-2">
          <LanguageSwitcher compact />
          {!ready ? null : userId ? (
            <>
              <Button asChild size="sm">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4" /> {t("nav.dashboard")}</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout} aria-label={t("nav.logout")}>
                <LogOut className="h-4 w-4" /> {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}