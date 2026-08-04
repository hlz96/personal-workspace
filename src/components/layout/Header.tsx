import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useStore } from '@/store';
import { greeting } from '@/lib/utils';
import { useT } from '@/lib/useT';

export function Header() {
  const t = useT();
  const name = useStore((s) => s.settings.name);
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4 sticky top-0 z-20 bg-[rgb(var(--bg))]"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      <div className="flex items-center gap-3 text-sm text-[rgb(var(--muted))]">
        <span className="hidden sm:inline">
          {greeting()},{name}。{t('greeting.suffix')}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost h-9 w-9 !p-0" title="搜索">
          <Search className="h-4 w-4" />
        </button>
        <button className="btn-ghost h-9 w-9 !p-0" title="通知">
          <Bell className="h-4 w-4" />
        </button>
        <button
          className="btn-ghost h-9 w-9 !p-0"
          title="切换主题"
          onClick={() => updateSettings({ theme: nextTheme as 'light' | 'dark' })}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="ml-2 h-8 w-8 rounded-full bg-brand-500/20 grid place-items-center text-brand-700 dark:text-brand-300 text-sm font-semibold">
          {name.slice(0, 1)}
        </div>
      </div>
    </header>
  );
}
