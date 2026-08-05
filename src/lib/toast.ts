// 轻量 toast:模块级发布订阅,组件与非组件(如 remoteStorage)均可调用。
export type ToastKind = 'error' | 'success' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

function push(kind: ToastKind, text: string) {
  const id = ++seq;
  toasts = [...toasts, { id, kind, text }];
  emit();
  setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export const toast = {
  error: (text: string) => push('error', text),
  success: (text: string) => push('success', text),
  info: (text: string) => push('info', text),
};
