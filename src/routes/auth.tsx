import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SchoolLogo } from "@/components/school-logo";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

const authSearchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => authSearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Hyr ose Regjistrohu — Zemër & Praktike" },
      { name: "description", content: "Hyr ose krijo llogarinë e re në platformën Zemër & Praktike." },
      { property: "og:title", content: "Hyr ose Regjistrohu — Zemër & Praktike" },
      { property: "og:description", content: "Krijo llogarinë si nxënës, biznes ose mësues praktike." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

type Role = "student" | "business" | "teacher";

const roleValues: Role[] = ["student", "business", "teacher"];

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tab, setTab] = useState<"login" | "signup">(search.mode ?? "login");

  // Redirect to dashboard when session arrives
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <div
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{ background: "var(--gradient-hero)" }}
        aria-hidden
      />
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <SchoolLogo className="h-11 w-11" />
          <span className="text-lg font-semibold tracking-tight">Zemër & Praktike</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("nav.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("nav.signup")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignupForm />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("auth.terms")}
        </p>
      </div>
    </div>
  );
}

function GoogleButton() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (res.error) {
      setLoading(false);
      toast.error(t("auth.googleFailed"), { description: String(res.error) });
    }
  };
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
          <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.42 3.46 1.18 4.95l3.66-2.84Z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
        </svg>
      )}
      {t("auth.google")}
    </Button>
  );
}

function LoginForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(t("auth.loginFailed"), { description: error.message });
    else toast.success(t("auth.welcome"));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <GoogleButton />
      <div className="relative my-2 text-center">
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
        <span className="relative bg-card px-3 text-xs text-muted-foreground">{t("auth.orEmail")}</span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-email">{t("auth.email")}</Label>
        <Input id="login-email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">{t("auth.password")}</Label>
        <Input id="login-password" type="password" value={password} required onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("nav.login")}
      </Button>
    </form>
  );
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Emri është shumë i shkurtër").max(120),
  email: z.string().trim().email("Email i pavlefshëm").max(255),
  password: z.string().min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere").max(128),
  organization: z.string().trim().max(200).optional(),
  role: z.enum(["student", "business", "teacher"]),
});

function SignupForm() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    organization: "",
    role: "student" as Role,
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.full_name,
          organization: parsed.data.organization ?? "",
          role: parsed.data.role,
        },
      },
    });
    setLoading(false);
    if (error) toast.error(t("auth.signupFailed"), { description: error.message });
    else toast.success(t("auth.signupOk"));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <GoogleButton />
      <div className="relative my-2 text-center">
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
        <span className="relative bg-card px-3 text-xs text-muted-foreground">{t("auth.orEmail")}</span>
      </div>
      <div className="space-y-2">
        <Label>{t("auth.iam")}</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {roleValues.map((r) => (
              <SelectItem key={r} value={r}>
                <div className="flex flex-col">
                  <span className="font-medium">{t(`auth.role.${r}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`auth.role.${r}.desc`)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-name">{form.role === "business" ? t("auth.contactPerson") : t("auth.fullName")}</Label>
        <Input id="su-name" value={form.full_name} required onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      {(form.role === "business" || form.role === "teacher") && (
        <div className="space-y-2">
          <Label htmlFor="su-org">{form.role === "business" ? t("auth.businessName") : t("auth.school")}</Label>
          <Input id="su-org" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="su-email">{t("auth.email")}</Label>
        <Input id="su-email" type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">{t("auth.password")}</Label>
        <Input id="su-password" type="password" value={form.password} required onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("auth.createAccount")}
      </Button>
    </form>
  );
}
