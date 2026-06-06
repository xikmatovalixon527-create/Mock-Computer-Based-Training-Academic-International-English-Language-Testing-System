'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowRight, AlertCircle, GraduationCap, Users } from 'lucide-react';
import { STUDENT_GROUPS } from '@/lib/utils';

type Role = 'student' | 'teacher';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (role === 'student' && !groupName) {
      setError('Please select your group assignment');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, password, role, groupName: role === 'student' ? groupName : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register account');
      router.push(`/${role}/dashboard`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12 bg-black text-white">
      <div className="luxury-grid-overlay opacity-30" />

      <div className="w-full max-w-[440px] z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-12 h-12 rounded-full bg-zinc-900 items-center justify-center border border-zinc-800 shadow-xl mb-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Create Account</h1>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Register as a Student or Teacher
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Role selection */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all cursor-pointer ${
                    role === 'student'
                      ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/5'
                      : 'border-zinc-800 bg-black hover:border-zinc-700'
                  }`}
                >
                  <Users className={`w-4 h-4 ${role === 'student' ? 'text-blue-500' : 'text-zinc-500'}`} />
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${role === 'student' ? 'text-white' : 'text-zinc-400'}`}>
                    Student
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-4 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all cursor-pointer ${
                    role === 'teacher'
                      ? 'border-blue-500 bg-blue-500/5 shadow-md shadow-blue-500/5'
                      : 'border-zinc-800 bg-black hover:border-zinc-700'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 ${role === 'teacher' ? 'text-blue-500' : 'text-zinc-500'}`} />
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${role === 'teacher' ? 'text-white' : 'text-zinc-400'}`}>
                    Teacher
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-11 px-4 bg-black border border-zinc-800 rounded-xl text-xs tracking-wider text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500 transition-all font-medium"
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>

            {role === 'student' && (
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400">Class Group Assignment</label>
                <select
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full h-11 px-4 bg-black border border-zinc-800 rounded-xl text-xs tracking-wider text-white focus:outline-none focus:border-blue-500 transition-all font-medium cursor-pointer"
                >
                  <option value="" disabled className="text-zinc-700">-- Select Your Group --</option>
                  {STUDENT_GROUPS.map(g => (
                    <option key={g} value={g} className="text-white bg-zinc-900">{g}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider font-bold text-zinc-400">Security Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-black border border-zinc-800 rounded-xl text-xs tracking-wider text-white placeholder:text-zinc-700 focus:outline-none focus:border-blue-500 transition-all font-medium"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider rounded-full shadow-lg cursor-pointer transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            >
              <span>{loading ? 'Processing...' : 'Register'}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-black" />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs uppercase tracking-wider text-zinc-500">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-blue-500 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}