import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { cn } from '@/lib/utils';
import { productDoc, usageDoc } from '@/data/docs';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'product' | 'usage';

export function HelpModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('usage');

  return (
    <Modal open={open} title="帮助说明" onClose={onClose} className="max-w-3xl">
      <div className="flex gap-1 mb-4">
        {([
          ['usage', '使用说明'],
          ['product', '产品说明'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              tab === key
                ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                : 'hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="max-h-[65vh] overflow-y-auto scrollbar-thin pr-1">
        <MarkdownView content={tab === 'usage' ? usageDoc : productDoc} />
      </div>
    </Modal>
  );
}
