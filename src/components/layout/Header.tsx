import { useState } from 'react';
import { Search, Bell, Sun, Moon, LogOut, HelpCircle } from 'lucide-react';
import { useStore } from '@/store';
import { greeting } from '@/lib/utils';
import { useT } from '@/lib/useT';
import { useAuth } from '@/lib/auth';
import { HelpModal } from '@/components/shared/HelpModal';

export function Header() {
  const t = useT();
  const name = useStore((s) => s.settings.name);
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);
  const { user, signOut } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const displayName = name || user?.email?.split('@')[0] || '';
  const initial = (displayName || 'U').slice(0, 1).toUpperCase();

  return (
    <>
    <header
      className="h-14 border-b flex items-center justify-between px-4 sticky top-0 z-20 bg-[rgb(var(--bg))]"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      <div className="flex items-center gap-3 text-sm text-[rgb(var(--muted))]">
        <span className="hidden sm:inline">
          {greeting()}{displayName ? `,${displayName}` : ''}。{t('greeting.suffix')}
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
          title="使用说明"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          className="btn-ghost h-9 w-9 !p-0"
          title="切换主题"
          onClick={() => updateSettings({ theme: nextTheme as 'light' | 'dark' })}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {user && (
          <button
            className="btn-ghost h-9 w-9 !p-0"
            title={`退出登录(${user.email})`}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
        <div
          className="ml-2 h-8 w-8 rounded-full bg-brand-500/20 grid place-items-center text-brand-700 dark:text-brand-300 text-sm font-semibold"
          title={user?.email ?? name}
        >
          {initial}
        </div>
      </div>
    </header>
    <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
