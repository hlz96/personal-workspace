import { useEffect, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth';
import { remoteStorage } from '@/lib/remoteStorage';
import { storage } from '@/lib/storage';
import {
  bindUser,
  unbindUser,
  hydrateFromRemote,
  currentSnapshot,
  resetToSeed,
} from '@/store';
import type { WorkspaceData } from '@/types';

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ask-import'; local: WorkspaceData }
  | { kind: 'ready' };

function hasMeaningfulLocalData(d: WorkspaceData | null): boolean {
  if (!d) return false;
  return (
    (d.tasks?.length ?? 0) > 0 ||
    (d.projects?.length ?? 0) > 0 ||
    (d.achievements?.length ?? 0) > 0 ||
    (d.reports?.length ?? 0) > 0 ||
    (d.reviews?.length ?? 0) > 0 ||
    Boolean(d.profile?.onboardedAt)
  );
}

export function SessionSync({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  useEffect(() => {
    if (loading) return;

    if (!user) {
      unbindUser();
      setPhase({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    setPhase({ kind: 'checking' });
    bindUser(user.id);

    (async () => {
      const exists = await remoteStorage.profileExists(user.id);
      if (cancelled) return;

      if (exists) {
        const remote = await remoteStorage.loadAll(user.id);
        if (cancelled) return;
        if (remote) {
          hydrateFromRemote(remote);
          setPhase({ kind: 'ready' });
          return;
        }
      }

      // 云端为空 → 看本地是不是有值得导入的数据
      const local = storage.load();
      if (hasMeaningfulLocalData(local) && local) {
        setPhase({ kind: 'ask-import', local });
      } else {
        resetToSeed();
        await remoteStorage.bulkInsertAll(user.id, currentSnapshot());
        setPhase({ kind: 'ready' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const doImport = async () => {
    if (phase.kind !== 'ask-import' || !user) return;
    hydrateFromRemote(phase.local);
    await remoteStorage.bulkInsertAll(user.id, phase.local);
    storage.clear();
    setPhase({ kind: 'ready' });
  };

  const skipImport = async () => {
    if (!user) return;
    resetToSeed();
    await remoteStorage.bulkInsertAll(user.id, currentSnapshot());
    storage.clear();
    setPhase({ kind: 'ready' });
  };

  if (user && (phase.kind === 'checking' || phase.kind === 'idle')) {
    return (
      <div className="min-h-screen grid place-items-center bg-[rgb(var(--bg))]">
        <div className="text-sm text-[rgb(var(--muted))]">
          正在同步你的数据...
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {phase.kind === 'ask-import' && (
        <Modal
          open
          title="发现本地数据"
          onClose={skipImport}
          footer={
            <>
              <button className="btn-ghost text-sm" onClick={skipImport}>
                不导入,从零开始
              </button>
              <button className="btn-primary" onClick={doImport}>
                导入到我的账号
              </button>
            </>
          }
        >
          <div className="space-y-2 text-sm">
            <p>
              我们在这台设备上找到了你之前使用时留下的数据。是否要把它导入到你刚登录的账号里?
            </p>
            <div className="rounded-lg border p-3 text-[rgb(var(--muted))]"
              style={{ borderColor: 'rgb(var(--border))' }}>
              任务 {phase.local.tasks?.length ?? 0} · 项目 {phase.local.projects?.length ?? 0}{' '}
              · 成果 {phase.local.achievements?.length ?? 0} · 周期总结{' '}
              {phase.local.reports?.length ?? 0}
            </div>
            <p className="text-xs text-[rgb(var(--muted))]">
              选择"导入"后,本地数据会合并到云端;选择"不导入"会清空本地缓存,从种子数据开始。
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
