import { cn } from '@/lib/utils';

interface EmptyProps {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({ title, desc, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center gap-2',
        className,
      )}
    >
      <div className="h-14 w-14 rounded-full bg-brand-500/10 grid place-items-center text-brand-500 text-2xl">
        ✨
      </div>
      <div className="font-medium">{title}</div>
      {desc && <div className="text-sm text-[rgb(var(--muted))] max-w-sm">{desc}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
