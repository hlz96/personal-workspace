import { NavLink } from 'react-router-dom';
import {
  Home,
  ListChecks,
  Folders,
  Trophy,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useT } from '@/lib/useT';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const t = useT();
  const items = [
    { to: '/', icon: Home, label: t('nav.dashboard') },
    { to: '/tasks', icon: ListChecks, label: t('nav.tasks') },
    { to: '/projects', icon: Folders, label: t('nav.projects') },
    { to: '/achievements', icon: Trophy, label: t('nav.achievements') },
    { to: '/reports', icon: FileText, label: t('nav.reports') },
    { to: '/reviews', icon: ClipboardList, label: t('nav.reviews') },
    { to: '/stats', icon: BarChart3, label: t('nav.stats') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <aside className="hidden md:flex w-52 shrink-0 flex-col border-r py-4"
      style={{ borderColor: 'rgb(var(--border))' }}>
      <div className="px-5 pb-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-brand-500 text-white grid place-items-center font-semibold">
          W
        </div>
        <div className="font-semibold">{t('app.name')}</div>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300 font-medium'
                  : 'hover:bg-black/5 dark:hover:bg-white/5',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
