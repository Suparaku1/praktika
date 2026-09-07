import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("nav.language")} className="gap-2">
          <Globe className="h-4 w-4" />
          {!compact && <span className="uppercase">{locale}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l: Locale) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => setLocale(l)}
            className={l === locale ? "font-semibold text-primary" : ""}
          >
            <span className="mr-2">{LOCALE_META[l].flag}</span>
            {LOCALE_META[l].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
