import { cn } from '@/lib/utils';
import type { PropsWithChildren, HTMLAttributes } from 'react';

export function Card({
  className,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn('card p-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }: PropsWithChildren<{ action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-[rgb(var(--muted))]">{children}</h3>
      {action}
    </div>
  );
}

interface ProgressProps {
  value: number;
  color?: string;
}
export function Progress({ value, color = '#22C55E' }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-1.5 w-full rounded-full overflow-hidden"
      style={{ background: 'rgb(var(--border))' }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

interface ChipProps {
  color?: string;
  children: React.ReactNode;
  className?: string;
}
export function Chip({ color = '#94A3B8', children, className }: ChipProps) {
  return (
    <span
      className={cn('chip', className)}
      style={{ background: `${color}20`, color }}
    >
      {children}
    </span>
  );
}
