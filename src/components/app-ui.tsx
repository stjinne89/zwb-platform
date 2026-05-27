import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "jersey-panel flex flex-col gap-4 rounded-lg border bg-card/90 p-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex items-center justify-between gap-3 border-b border-border/70 pb-2",
        className,
      )}
    >
      <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg">
        {Icon && <Icon className="size-4 text-primary" />}
        <span className="truncate">{title}</span>
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed bg-card/70 p-4 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}

export function HelpLink({
  href = "/hulp",
  label = "Hulp",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary",
        className,
      )}
    >
      <CircleHelp className="size-4" />
      {label}
    </Link>
  );
}

export function InlineMoreLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}
