interface MinimalHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function MinimalHeader({ title, subtitle, actions }: MinimalHeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-border px-6 py-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}