'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, BookOpen, User } from 'lucide-react';

export function Navbar({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => d.user && setUser(d.user))
      .catch(() => { });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white selection:bg-blue-600/30">
      <header className="sticky top-0 z-50 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900/80 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link
              href={isTeacher ? '/teacher/dashboard' : '/student/dashboard'}
              className="flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center transition-all group-hover:border-blue-500/50 group-hover:bg-zinc-800">
                <BookOpen className="w-5 h-5 text-blue-500 transition-transform group-hover:scale-110" />
              </div>
              <span className="text-base font-bold tracking-widest uppercase">
                <span className="text-blue-500">Mock Computer Based Training Academic International English Language Testing System</span>
              </span>
            </Link>

            {user && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800">
                  <User className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-white max-w-[150px] truncate">{user.fullName}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-zinc-800 px-2.5 py-0.5 rounded-full">
                    {isTeacher ? 'Teacher' : 'Student'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
    </div>
  );
}