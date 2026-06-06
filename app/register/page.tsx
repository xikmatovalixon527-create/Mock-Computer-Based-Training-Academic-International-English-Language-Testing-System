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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12 bg-[#0a0a0c] text-[#f5f5f7]">
      <div className="luxury-grid-overlay" />

      <div className="w-full max-w-[400px] z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex w-10 h-10 rounded-full bg-[#121214] items-center justify-center border border-[#1f1f23] mb-2">
            <BookOpen className="w-4 h-4 text-[#0071e3]" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-white">Create Account</h1>
          <p className="text-xs tracking-wide text-[#8a8a8e]">
            Register as a Student or Teacher
          </p>
        </div>

        <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 shadow-none space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#ff453a]/10 border border-[#ff453a]/20">
              <AlertCircle className="w-4 h-4 text-[#ff453a] shrink-0 mt-0.5" />
              <span className="text-xs text-[#ff453a] font-medium tracking-normal">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#8a8a8e]">Account Type</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-3.5 flex flex-col items-center justify-center gap-2 rounded-lg border transition-all cursor-pointer ${
                    role === 'student'
                      ? 'border-[#0071e3] bg-[#0071e3]/5'
                      : 'border-[#1f1f23] bg-black hover:border-[#374151]'
                  }`}
                >
                  <Users className={`w-4 h-4 ${role === 'student' ? 'text-[#0071e3]' : 'text-[#6e6e73]'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${role === 'student' ? 'text-white' : 'text-[#8a8a8e]'}`}>
                    Student
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-3.5 flex flex-col items-center justify-center gap-2 rounded-lg border transition-all cursor-pointer ${
                    role === 'teacher'
                      ? 'border-[#0071e3] bg-[#0071e3]/5'
                      : 'border-[#1f1f23] bg-black hover:border-[#374151]'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 ${role === 'teacher' ? 'text-[#0071e3]' : 'text-[#6e6e73]'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${role === 'teacher' ? 'text-white' : 'text-[#8a8a8e]'}`}>
                    Teacher
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#8a8a8e]">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-[#1f1f23] rounded-md text-sm text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0071e3] transition-colors"
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>

            {role === 'student' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#8a8a8e]">Class Group Assignment</label>
                <select
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full h-10 px-3 bg-black border border-[#1f1f23] rounded-md text-sm text-white focus:outline-none focus:border-[#0071e3] transition-colors cursor-pointer"
                >
                  <option value="" disabled className="text-[#6e6e73]">-- Select Your Group --</option>
                  {STUDENT_GROUPS.map(g => (
                    <option key={g} value={g} className="text-white bg-[#121214]">{g}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#8a8a8e]">Security Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-[#1f1f23] rounded-md text-sm text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0071e3] transition-colors"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#2997ff] text-white font-medium text-sm rounded-full transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <span>{loading ? 'Processing...' : 'Register'}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-white" />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8a8a8e]">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-[#0071e3] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}