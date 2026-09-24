import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StateKind = "empty" | "error" | "success";

const icons: Record<StateKind, LucideIcon> = {
  empty: Search,
  error: AlertTriangle,
  success: Check,
};

export function DestinationLoading({ label = "Gathering your latest activity" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 py-16 text-center" role="status" aria-live="polite">
      <div className="relative mb-7 h-20 w-20">
        <span className="absolute inset-0 rounded-full border border-border" />
        <span className="absolute inset-4 rotate-12 rounded-sm border border-accent/35 motion-safe:animate-pulse" />
        <LoaderCircle className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-accent motion-reduce:animate-none" strokeWidth={1.4} />
      </div>
      <p className="font-serif text-[24px] font-normal leading-tight text-foreground">Just a moment</p>
      <p className="mt-2 max-w-[240px] text-[11px] leading-5 text-muted-foreground">{label}</p>
    </div>
  );
}

export function DestinationState({ kind = "empty", title, description, actionLabel, onAction, compact = false, icon: IconOverride }: {
  kind?: StateKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  const Icon = IconOverride || icons[kind];
  return (
    <div className={cn("flex flex-col items-center justify-center px-8 text-center", compact ? "py-8" : "min-h-[280px] py-14")} role={kind === "error" ? "alert" : "status"}>
      <div className={cn("relative", compact ? "mb-5 h-14 w-14" : "mb-8 h-20 w-20")} aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-border bg-secondary/20" />
        <span className="absolute inset-[22%] rotate-12 rounded-sm border border-border" />
        <Icon className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", compact ? "h-4 w-4" : "h-5 w-5", kind === "error" ? "text-destructive" : "text-accent")} strokeWidth={1.4} />
      </div>
      <h2 className={cn("font-serif font-normal leading-tight text-foreground", compact ? "text-[22px]" : "text-[28px]")}>{title}</h2>
      <p className="mt-2 max-w-[260px] text-[11px] leading-5 text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction} className="mt-6 h-9 rounded-none border-b border-accent px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent hover:bg-transparent hover:text-accent">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}