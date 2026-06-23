import type { ComponentType, ReactNode } from "react";

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {children ?? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground sm:p-10">
          Bu modül planın sonraki adımında geliyor. Sunucu denetimini bekliyoruz.
        </div>
      )}
    </div>
  );
}
