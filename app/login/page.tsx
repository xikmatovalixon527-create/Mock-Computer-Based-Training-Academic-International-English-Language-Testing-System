'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowRight, AlertCircle } from 'lucide-react';
import { validateFullName } from '@/lib/utils';

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

    const trimmedName = fullName.trim();

    // Fast layout formatting check
    if (!validateFullName(trimmedName)) {
      setError('Please enter your full name as exactly "First Last" using Latin letters (e.g., "John Doe").');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmedName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      router.push(`/${data.user.role}/dashboard`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12 bg-black text-white">
      <div className="luxury-grid-overlay opacity-30" />
      
      <div className="w-full max-w-[400px] z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex w-12 h-12 rounded-full bg-zinc-900 items-center justify-center border border-zinc-800 shadow-xl mb-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Sign In</h1>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            IELTS CBT Practice Platform
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-400 font-semibold uppercase tracking-wider leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-11 px-4 bg-black border border-zinc-800 rounded-xl text-xs tracking-wider text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500 transition-all font-medium"
                placeholder="e.g. John Doe"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-black border border-zinc-800 rounded-xl text-xs tracking-wider text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500 transition-all font-medium"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider rounded-full shadow-lg cursor-pointer transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-black" />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs uppercase tracking-wider text-zinc-500">
          New to the platform?{' '}
          <Link href="/register" className="font-bold text-blue-500 hover:underline">
            Register Account
          </Link>
        </p>
      </div>
    </div>
  );
}