import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { subscribeToasts, dismiss, type ToastItem } from '@/lib/toast';

const kindStyle: Record<ToastItem['kind'], string> = {
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  success: 'bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/30',
  info: 'bg-[rgb(var(--card))] text-[rgb(var(--fg))] border-[rgb(var(--border))]',
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg ${kindStyle[t.kind]}`}
        >
          <span className="flex-1">{t.text}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-60 hover:opacity-100"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
