import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Users,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  FileSignature,
  Award,
  Building2,
} from "lucide-react";
import heroImg from "@/assets/hero-students.jpg";
import { useI18n, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zemër & Praktike — Lidh shkollën me biznesin" },
      {
        name: "description",
        content:
          "Platforma kombëtare që lidh nxënësit e shkollave profesionale me bizneset në Shqipëri. Praktikë, internship, projekte dhe punësim — të menaxhuar nga mësuesi i praktikës.",
      },
      { property: "og:title", content: "Zemër & Praktike" },
      {
        property: "og:description",
        content:
          "Nxënësit punojnë. Bizneset fitojnë. Shkolla zhvillon të ardhmen.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const audiences = [
  { icon: GraduationCap, key: "students" },
  { icon: Building2, key: "business" },
  { icon: Users, key: "teachers" },
] as const;

const steps = [
  { icon: Sparkles, n: 1 },
  { icon: Briefcase, n: 2 },
  { icon: FileSignature, n: 3 },
  { icon: Award, n: 4 },
] as const;

const faqIndexes = [1, 2, 3, 4] as const;

function LandingPage() {
  const { t } = useI18n();
  const tk = (k: string) => t(k as TranslationKey);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{ background: "var(--gradient-hero)" }}
          aria-hidden
        />
        <div className="container mx-auto grid gap-12 px-4 py-16 md:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t("home.badge")}
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("home.h1.pre")} <span className="text-primary">{t("home.h1.school")}</span> {t("home.h1.mid")}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                {t("home.h1.business")}
              </span>
              .
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("home.sub")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-7 text-base shadow-[var(--shadow-elegant)]">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("home.cta.start")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
                <Link to="/" hash="how">{t("home.cta.how")}</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("home.trust.contracts")}</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("home.trust.payments")}</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("home.trust.free")}</div>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-4 -z-10 rounded-3xl opacity-30 blur-3xl"
              style={{ background: "var(--gradient-primary)" }}
              aria-hidden
            />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
              <img
                src={heroImg}
                alt={t("home.hero.alt")}
                width={1600}
                height={1200}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:block">
              <div className="text-2xl font-bold text-primary">+1,200</div>
              <div className="text-xs text-muted-foreground">{t("home.stat.label")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCES */}
      <section id="audiences" className="border-y border-border bg-secondary/40 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("home.aud.kicker")}</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("home.aud.title")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("home.aud.sub")}
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <div
                key={a.key}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <a.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{tk(`home.aud.${a.key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tk(`home.aud.${a.key}.desc`)}</p>
                <ul className="mt-5 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      {tk(`home.aud.${a.key}.b${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("home.how.kicker")}</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("home.how.title")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("home.how.sub")}
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <div className="absolute -top-3 left-0 text-7xl font-bold text-primary/5">
                  0{s.n}
                </div>
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{tk(`home.step${s.n}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tk(`home.step${s.n}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-16 text-center text-primary-foreground shadow-[var(--shadow-elegant)] sm:px-16"
            style={{ background: "var(--gradient-hero)" }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("home.cta2.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              {t("home.cta2.sub")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 px-7 text-base">
                <Link to="/auth" search={{ mode: "signup" }}>{t("home.cta2.create")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/auth">{t("home.cta2.have")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-secondary/40 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("home.faq.title")}
            </h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {faqIndexes.map((i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-base font-medium">{tk(`home.faq.q${i}`)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{tk(`home.faq.a${i}`)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
