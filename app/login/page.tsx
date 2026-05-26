'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');
      router.push(`/${data.user.role}/dashboard`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12">
      {/* Cinematic Backgrounds */}
      <div className="luxury-bg-glow" />
      <div className="luxury-grid-overlay" />
      
      {/* Precise watchmaker detail line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-32 bg-gradient-to-b from-[var(--color-primary)]/40 to-transparent" />

      <div className="w-full max-w-[420px] z-10 animate-luxury-fade">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex relative w-12 h-12 rounded-full bg-[#101014] items-center justify-center border border-[var(--color-primary)]/40 shadow-xl mb-4 group">
            <span className="absolute inset-0.5 rounded-full border border-dashed border-[var(--color-primary)]/10" />
            <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-h1 uppercase tracking-widest text-[#F5F5F7]">Vault Access</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] mt-2">
            Secure Platform Authorization
          </p>
        </div>

        {/* Card */}
        <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg p-6 sm:p-8 shadow-2xl relative">
          <div className="absolute top-0 left-10 w-20 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent" />

          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 rounded bg-[#E06C75]/10 border border-[#E06C75]/20 animate-shake">
              <AlertCircle className="w-5 h-5 text-[#E06C75] shrink-0 mt-0.5" />
              <span className="text-xs text-[#E06C75] font-semibold uppercase tracking-wider">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest font-semibold text-[var(--color-text-secondary)]">
                Authorized Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-11 px-4 bg-[#0B0B0E] border border-[var(--color-border)] rounded text-xs tracking-wider text-[#F5F5F7] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                placeholder="Full Registered Name"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest font-semibold text-[var(--color-text-secondary)]">
                Access Passphrase
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-[#0B0B0E] border border-[var(--color-border)] rounded text-xs tracking-wider text-[#F5F5F7] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                placeholder="Secure Access Code"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 relative overflow-hidden flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-primary)] to-[#D4AF37] hover:brightness-110 text-black font-semibold text-xs uppercase tracking-widest rounded shadow-xl cursor-pointer active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="absolute left-0 top-0 h-full w-[1px] bg-white/20" />
              <span className="relative z-10">{loading ? 'Decrypting...' : 'Enter Console'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5 relative z-10 text-black" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          Need verification?{' '}
          <Link href="/register" className="font-semibold text-[var(--color-primary)] hover:underline hover:brightness-110">
            Register Account
          </Link>
        </p>
      </div>
    </div>
  );
}