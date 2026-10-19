import { useI18n } from "@/lib/i18n";
import { SchoolLogo } from "@/components/school-logo";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer id="contact" className="border-t border-border/60 bg-secondary/40">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <SchoolLogo />
            <span className="font-semibold tracking-tight">Zemër & Praktike</span>
          </div>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {t("footer.blurb")}
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{t("footer.platform")}</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{t("footer.forStudents")}</li>
            <li>{t("footer.forBusinesses")}</li>
            <li>{t("footer.forTeachers")}</li>
            <li>{t("footer.forSchools")}</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{t("footer.contact")}</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Shkolla Teknike Elektrike "Gjergj Canco"</li>
            <li>info@zemerpraktike.al</li>
            <li>+355 69 000 0000</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Zemër & Praktike. {t("footer.rights")}</span>
          <span>{t("footer.built")}</span>
        </div>
      </div>
    </footer>
  );
}
