import { useEffect } from 'react';
import { useStore } from '@/store';

export function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const root = document.documentElement;
    const resolved =
      theme === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    root.classList.toggle('dark', resolved === 'dark');
  }, [theme]);
}
