'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Clock, Award, ArrowRight, RefreshCw, BookOpen, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { Essay } from '@/types';
import { getBandBadgeStyle, getBandTextColor } from '@/lib/utils';

export default function StudentDashboard() {
  const router = useRouter();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ fullName: string } | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/essays').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([essaysData, userData]) => {
      if (essaysData.essays) setEssays(essaysData.essays);
      if (userData.user) setUser(userData.user);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const reviewed = essays.filter(e => e.status === 'reviewed');
  const pending = essays.filter(e => e.status !== 'reviewed');
  const reviewedWithScores = reviewed.filter(e => e.overall_band !== null && Number(e.overall_band) > 0);
  const avgBand = reviewedWithScores.length
    ? (reviewedWithScores.reduce((s, e) => s + Number(e.overall_band), 0) / reviewedWithScores.length).toFixed(1)
    : null;

  const getTopicText = (topic: string) => {
    try {
      const p = JSON.parse(topic);
      return p.task2?.text || p.task1?.text || topic;
    } catch { return topic; }
  };

  return (
    <Navbar>
      <div className="space-y-10">
        {/* Welcome Section */}
        <div className="p-8 sm:p-10 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative z-10">
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-500 block">
                Academic Practice Hub
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Welcome, {user?.fullName || 'Student'}
              </h1>
              <p className="text-base text-zinc-400 max-w-xl leading-relaxed">
                Hone your IELTS writing skills. Submit custom or standard test prompts to receive direct paragraph annotations and scored reviews.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <button
                onClick={() => router.push('/student/test/setup')}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-blue-600/10 active:scale-95"
              >
                <BookOpen className="w-4.5 h-4.5" />
                Standard Exam
              </button>
              <button
                onClick={() => router.push('/student/test/setup-customizable')}
                className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-full border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
              >
                <Settings2 className="w-4.5 h-4.5" />
                Custom Practice
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Submitted Tasks</span>
              <FileText className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">{essays.length}</span>
              <span className="text-xs text-zinc-500 font-semibold uppercase">Total Essays</span>
            </div>
          </div>

          <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Awaiting Marking</span>
              <Clock className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-amber-500 font-mono">{pending.length}</span>
              <span className="text-xs text-zinc-500 font-semibold uppercase">Pending Evaluation</span>
            </div>
          </div>

          <div className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Mean Score</span>
              <Award className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-black tracking-tight ${getBandTextColor(avgBand)}`}>{avgBand || '—'}</span>
              <span className="text-xs text-zinc-500 font-semibold uppercase">Avg Band</span>
            </div>
          </div>
        </div>

        {/* Essay List */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-neutral-300">Practice Log</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Chronological overview of submitted writings and evaluations</p>
            </div>
            {essays.length > 0 && (
              <button 
                onClick={fetchData} 
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            )}
          </div>

          <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
            {isLoading ? (
              <div className="p-20 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
                <p className="text-xs uppercase tracking-wider text-zinc-500">Retrieving test submissions...</p>
              </div>
            ) : essays.length === 0 ? (
              <div className="p-20 text-center">
                <FileText className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                <h3 className="text-base font-semibold uppercase tracking-wider text-white mb-1.5">No submissions logged</h3>
                <p className="text-xs text-zinc-400">Launch a task module using standard or custom configurations above to start.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {essays.map(essay => (
                  <div key={essay.id} className="p-6 hover:bg-zinc-900/20 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20 bg-blue-500/10 text-blue-400 rounded-full">
                            {essay.task_type === 'task1' ? 'Task 1 (Report)' : essay.task_type === 'task2' ? 'Task 2 (Essay)' : 'Composite Session'}
                          </span>
                          <span className="text-xs text-zinc-500 font-medium">
                            {format(new Date(essay.created_at), 'MMMM dd, yyyy · hh:mm a')}
                          </span>
                        </div>
                        <p className="text-base italic text-zinc-300 leading-relaxed line-clamp-2">
                          &ldquo;{getTopicText(essay.topic_text)}&rdquo;
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between md:justify-end">
                        {essay.status === 'reviewed' ? (
                          <>
                            <span className={`text-xs font-extrabold tracking-wider uppercase px-4 py-2 rounded-full border ${getBandBadgeStyle(essay.overall_band)}`}>
                              {essay.overall_band != null && Number(essay.overall_band) > 0 ? `Band ${Number(essay.overall_band).toFixed(1)}` : 'Feedback only'}
                            </span>
                            <Link
                              href={`/student/review/${essay.id}`}
                              className="px-5 py-2.5 text-xs uppercase font-bold text-black bg-white hover:bg-zinc-200 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              Review Evaluation <ArrowRight className="w-4 h-4" />
                            </Link>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting Marking
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Navbar>
  );
}