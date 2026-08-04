import { useEffect, useRef, type PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ open, title, onClose, footer, className, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={cn(
          'card w-full max-w-lg animate-fade-in flex flex-col max-h-[90vh]',
          className,
        )}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--border))' }}>
          <h3 className="font-semibold">{title}</h3>
          <button className="btn-ghost h-8 w-8 !p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto scrollbar-thin flex-1">{children}</div>
        {footer && (
          <div
            className="px-5 py-3 border-t flex items-center justify-end gap-2"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
