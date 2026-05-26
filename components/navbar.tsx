'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, BookOpen, UserCircle } from 'lucide-react';

export function Navbar({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => d.user && setUser(d.user))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full smoked-glass border-b border-[var(--color-border)]/50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href={isTeacher ? '/teacher/dashboard' : '/student/dashboard'}
              className="flex items-center gap-3 group"
            >
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#0B0B0E] to-[#16161C] flex items-center justify-center border border-[var(--color-primary)]/40 shadow-xl transition-all group-hover:border-[var(--color-primary)]">
                {/* Thin gold watch accent lines */}
                <span className="absolute inset-0.5 rounded-full border border-dashed border-[var(--color-primary)]/10 animate-[spin_120s_linear_infinite]" />
                <BookOpen className="w-4 h-4 text-[var(--color-primary)] relative z-10 transition-transform group-hover:scale-110" />
              </div>
              <span className="font-serif text-lg tracking-widest text-[#F5F5F7] uppercase flex items-center gap-1.5">
                IELTS <span className="text-[var(--color-primary)] font-semibold text-xs tracking-[0.2em] uppercase px-1.5 py-0.5 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]">CBT</span>
              </span>
            </Link>

            {user && (
              <div className="flex items-center gap-1.5 sm:gap-4">
                <div className="flex items-center gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#101014] border border-[var(--color-border)]/80 self-center">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-[#F5F5F7] max-w-[70px] sm:max-w-[120px] truncate">{user.fullName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest border ${
                    isTeacher 
                      ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-accent)]' 
                      : 'border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  }`}>
                    {isTeacher ? 'Examiner' : 'Student'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="touch-target px-2 py-2 sm:px-3.5 sm:py-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[#E06C75] hover:bg-[#E06C75]/10 border border-transparent hover:border-[#E06C75]/10 transition-all font-medium flex items-center shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4 text-neutral-400 hover:text-[#E06C75]" />
                  <span className="hidden sm:inline ml-2 text-xs uppercase tracking-widest font-semibold">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}