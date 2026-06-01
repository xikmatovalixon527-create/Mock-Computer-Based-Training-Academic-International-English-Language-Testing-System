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
      <div className="space-y-8 animate-luxury-fade">
        {/* Welcome Hero Panel */}
        <div className="relative overflow-hidden p-6 sm:p-10 smoked-glass border border-[var(--color-border)]/60 rounded-lg shadow-2xl">
          {/* Subtle Golden Timing Ring Background Graphic (Static for performance & quiet premium feel) */}
          <div className="absolute right-[-100px] top-[-100px] w-[350px] h-[350px] rounded-full border border-[var(--color-primary)]/[0.04] pointer-events-none">
            <span className="absolute inset-4 rounded-full border border-dashed border-[var(--color-primary)]/[0.04]" />
            <span className="absolute inset-16 rounded-full border border-solid border-[var(--color-primary)]/[0.02]" />
            <span className="absolute inset-28 rounded-full border border-solid border-[var(--color-primary)]/[0.01]" />
          </div>
          <div className="absolute top-0 left-20 w-32 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative z-10">
            <div>
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[var(--color-primary)] font-bold mb-2 block">
                Standard Flight Deck
              </span>
              <h1 className="text-display text-[#F5F5F7]">
                Welcome, <span className="text-[#FFFFFF] italic">{user?.fullName || 'Candidate'}</span>
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-3 max-w-xl leading-relaxed">
                Unlock higher test performance bands with clinical, metrics-driven diagnostic feedbacks. Choose an active practice layout below.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <button
                onClick={() => router.push('/student/test/setup')}
                className="touch-target px-7 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-bold text-[10px] uppercase tracking-[0.2em] rounded border border-[var(--color-primary)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-black/40 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-black stroke-[2.5]" />
                Original Exam
              </button>
              <button
                onClick={() => router.push('/student/test/setup-customizable')}
                className="touch-target px-7 py-3 bg-[#0B0B0E] hover:bg-[#101014] text-[#F5F5F7] hover:text-[#FFFFFF] font-bold text-[10px] uppercase tracking-[0.2em] rounded border border-[var(--color-border-strong)] hover:border-[var(--color-primary)]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-black/40 cursor-pointer"
              >
                <Settings2 className="w-4 h-4 text-[#F5F5F7]/85" />
                Interactive Custom
              </button>
            </div>
          </div>
        </div>

        {/* Tactical Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger-luxury">
          {/* Card Completed */}
          <div className="relative p-6 sm:p-7 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl luxury-card-hover">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] animate-pulse">Completed Vaults</span>
              <div className="w-9 h-9 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center border border-[var(--color-primary)]/15">
                <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl font-mono font-extrabold text-[#FFFFFF]">{essays.length}</span>
              <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">Submissions</span>
            </div>
          </div>

          {/* Card Pending */}
          <div className="relative p-6 sm:p-7 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl luxury-card-hover">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Awaiting Appraisal</span>
              <div className="w-9 h-9 rounded-full bg-[var(--color-warning-soft)] flex items-center justify-center border border-[var(--color-warning)]/15">
                <Clock className="w-5 h-5 text-[var(--color-warning)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl font-mono font-extrabold text-[#FFFFFF]">{pending.length}</span>
              <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">Pending</span>
            </div>
          </div>

          {/* Card Avg Band */}
          <div className="relative p-6 sm:p-7 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl luxury-card-hover">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">Historical Precision</span>
              <div className="w-9 h-9 rounded-full bg-[var(--color-success-soft)] flex items-center justify-center border border-[var(--color-success)]/15">
                <Award className="w-5 h-5 text-[var(--color-success)]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className={`text-6xl sm:text-7xl tracking-wide font-sans font-black ${getBandTextColor(avgBand)}`}>{avgBand || '—'}</span>
              <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">Avg Band Score</span>
            </div>
          </div>
        </div>

        {/* History Block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-[var(--color-text-secondary)]">Appraisal Ledger</h2>
              <p className="text-xs text-[var(--color-text-tertiary)] uppercase mt-0.5 tracking-wider font-semibold">Chronological test entries & expert annotations</p>
            </div>
            {essays.length > 0 && (
              <button 
                onClick={fetchData} 
                className="touch-target p-2 px-3.5 rounded-lg hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]/60 hover:border-[var(--color-border-strong)] text-xs font-bold uppercase tracking-widest text-[#FFFFFF] transition-all cursor-pointer flex items-center gap-2"
                title="Refresh ledger"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Logs</span>
              </button>
            )}
          </div>

          <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg overflow-hidden shadow-2xl">
            {isLoading ? (
              <div className="p-16 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)] mb-4" />
                <p className="text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] font-bold">Synchronizing record ledger...</p>
              </div>
            ) : essays.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="w-12 h-12 mx-auto text-[var(--color-text-tertiary)] mb-4 opacity-40" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F5F5F7] mb-1">No chronological entries</h3>
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">Deploy your initial practice exam to initiate scores logging.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]/40">
                {essays.map(essay => (
                  <div key={essay.id} className="p-5 sm:p-6 hover:bg-[#111114]/40 transition-colors duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3.5 mb-2.5">
                          <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest border border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)] text-[var(--color-primary)] rounded">
                            {essay.task_type === 'task1' ? 'Academic Task 1' : essay.task_type === 'task2' ? 'Academic Task 2' : 'Composite Session'}
                          </span>
                          <span className="text-xs font-mono text-[var(--color-text-tertiary)] font-semibold">
                            {format(new Date(essay.created_at), 'MMMM dd, yyyy · hh:mm a')}
                          </span>
                        </div>
                        <p className="text-sm font-serif italic text-neutral-300 line-clamp-2 pr-6 leading-relaxed">
                          &ldquo;{getTopicText(essay.topic_text)}&rdquo;
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between sm:justify-end">
                        {essay.status === 'reviewed' ? (
                          <>
                            <span className={`text-lg font-sans font-black tracking-wide uppercase flex items-center gap-2.5 px-4.5 py-2.5 rounded-lg border shadow-md ${getBandBadgeStyle(essay.overall_band)}`}>
                              <span className={`w-2 h-2 rounded-full ${essay.overall_band != null && Number(essay.overall_band) >= 9.0 ? 'bg-gradient-to-r from-red-500 to-purple-500 animate-pulse' : 'bg-current'}`} />
                              {essay.overall_band != null && Number(essay.overall_band) > 0 ? `Band ${Number(essay.overall_band).toFixed(1)}` : 'FEEDBACK ONLY'}
                            </span>
                            <Link
                              href={`/student/review/${essay.id}`}
                              className="touch-target px-5 py-2.5 text-xs uppercase font-extrabold tracking-[0.18em] text-black bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded border border-[var(--color-primary)] shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:translate-x-0.5 duration-200"
                            >
                              Analytical Review <ArrowRight className="w-4 h-4 text-black stroke-[3]" />
                            </Link>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded text-xs uppercase tracking-widest font-extrabold bg-[var(--color-warning-soft)] text-[var(--color-warning)] border border-[var(--color-warning)]/15">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
                            Diagnostic appraisal pending
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