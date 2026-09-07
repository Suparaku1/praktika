import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; to: string };
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button asChild size="sm" className="mt-4">
          <Link to={action.to as any}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}