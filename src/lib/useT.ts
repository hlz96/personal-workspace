import { useMemo } from 'react';
import { useStore } from '@/store';
import { makeTranslator } from '@/lib/i18n';

export function useT() {
  const templateId = useStore((s) => s.profile.templateId);
  const override = useStore((s) => s.profile.terminology);
  return useMemo(() => makeTranslator(templateId, override), [templateId, override]);
}
