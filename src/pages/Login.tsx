import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Github, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(
    null,
  );
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(
    null,
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[rgb(var(--bg))]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--muted))]" />
      </div>
    );
  }
  if (session) {
    navigate(from, { replace: true });
    return null;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!email || !password) {
      setMsg({ kind: 'error', text: '请输入邮箱和密码' });
      return;
    }
    if (password.length < 6) {
      setMsg({ kind: 'error', text: '密码至少 6 位' });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMsg({ kind: 'error', text: error.message });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setMsg({ kind: 'error', text: error.message });
        } else if (data.session) {
          // 已直接登录
        } else {
          setMsg({
            kind: 'info',
            text: '注册成功,请到邮箱点击验证链接后再登录',
          });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const oauth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setOauthLoading(null);
      setMsg({ kind: 'error', text: error.message });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[rgb(var(--bg))] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">个人工作台</h1>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">
            把每天做过的事,变成可复盘、可汇报、可沉淀的记录
          </p>
        </div>

        <div
          className="card p-6"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <div className="flex mb-4 rounded-lg overflow-hidden border"
            style={{ borderColor: 'rgb(var(--border))' }}>
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm ${
                mode === 'login'
                  ? 'bg-brand-500 text-white'
                  : 'text-[rgb(var(--muted))]'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm ${
                mode === 'register'
                  ? 'bg-brand-500 text-white'
                  : 'text-[rgb(var(--muted))]'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              <span className="text-[rgb(var(--muted))]">邮箱</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent"
                style={{ borderColor: 'rgb(var(--border))' }}
                placeholder="you@example.com"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[rgb(var(--muted))]">密码</span>
              <input
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent"
                style={{ borderColor: 'rgb(var(--border))' }}
                placeholder="至少 6 位"
              />
            </label>

            {msg && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  msg.kind === 'error'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                }`}
              >
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {mode === 'login' ? '登录' : '创建账号'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
            <div className="flex-1 h-px bg-[rgb(var(--border))]" />
            <span>或</span>
            <div className="flex-1 h-px bg-[rgb(var(--border))]" />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => oauth('google')}
              disabled={oauthLoading !== null}
              className="btn-secondary w-full justify-center gap-2"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              使用 Google 登录
            </button>
            <button
              type="button"
              onClick={() => oauth('github')}
              disabled={oauthLoading !== null}
              className="btn-secondary w-full justify-center gap-2"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Github className="h-4 w-4" />
              )}
              使用 GitHub 登录
            </button>
            <div className="text-xs text-center text-[rgb(var(--muted))] pt-2">
              微信登录敬请期待
            </div>
          </div>
        </div>

        <p className="text-xs text-[rgb(var(--muted))] text-center mt-4">
          注册即表示同意数据以加密方式保存在 Supabase 云端,你可随时导出或删除
        </p>
      </div>
    </div>
  );
}
