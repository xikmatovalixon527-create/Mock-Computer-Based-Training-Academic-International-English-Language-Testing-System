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
      <div className="space-y-8">
        <div className="p-8 bg-[#121214] border border-[#1f1f23] rounded-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#0071e3] block">
                Academic Practice Hub
              </span>
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                Welcome, {user?.fullName || 'Student'}
              </h1>
              <p className="text-sm text-[#8a8a8e] max-w-xl leading-relaxed">
                Hone your IELTS writing skills. Submit custom or standard test prompts to receive direct paragraph annotations and scored reviews.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => router.push('/student/test/setup')}
                className="px-5 py-2.5 bg-[#0071e3] hover:bg-[#2997ff] text-white font-medium text-xs rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                Standard Exam
              </button>
              <button
                onClick={() => router.push('/student/test/setup-customizable')}
                className="px-5 py-2.5 bg-black hover:bg-[#121214] text-white font-medium text-xs rounded-full border border-[#1f1f23] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
                Custom Practice
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-[#121214] border border-[#1f1f23] rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#8a8a8e]">Submitted Tasks</span>
              <FileText className="w-4 h-4 text-[#8a8a8e]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-mono font-medium text-white">{essays.length}</span>
              <span className="text-[10px] text-[#6e6e73] font-bold uppercase tracking-wider">Total</span>
            </div>
          </div>

          <div className="p-5 bg-[#121214] border border-[#1f1f23] rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#8a8a8e]">Awaiting Marking</span>
              <Clock className="w-4 h-4 text-[#8a8a8e]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-mono font-medium text-[#ff9f0a]">{pending.length}</span>
              <span className="text-[10px] text-[#6e6e73] font-bold uppercase tracking-wider">Pending</span>
            </div>
          </div>

          <div className="p-5 bg-[#121214] border border-[#1f1f23] rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#8a8a8e]">Mean Score</span>
              <Award className="w-4 h-4 text-[#8a8a8e]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-mono font-black ${getBandTextColor(avgBand)}`}>{avgBand || '—'}</span>
              <span className="text-[10px] text-[#6e6e73] font-bold uppercase tracking-wider">Avg Band</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-300">Practice Log</h2>
              <p className="text-xs text-[#8a8a8e]">Chronological overview of submitted writings and evaluations</p>
            </div>
            {essays.length > 0 && (
              <button 
                onClick={fetchData} 
                className="px-3.5 py-1.5 bg-[#121214] hover:bg-black border border-[#1f1f23] rounded-full text-xs font-medium text-[#f5f5f7] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            )}
          </div>

          <div className="bg-[#121214]/50 border border-[#1f1f23] rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0071e3] mb-3" />
                <p className="text-xs text-[#8a8a8e]">Retrieving test submissions...</p>
              </div>
            ) : essays.length === 0 ? (
              <div className="p-16 text-center">
                <FileText className="w-10 h-10 mx-auto text-[#374151] mb-3" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-1">No submissions logged</h3>
                <p className="text-xs text-[#8a8a8e]">Launch a task module using standard or custom configurations above to start.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1f1f23]">
                {essays.map(essay => (
                  <div key={essay.id} className="p-5 hover:bg-[#121214]/40 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-[#0071e3]/20 bg-[#0071e3]/10 text-[#2997ff] rounded-full">
                            {essay.task_type === 'task1' ? 'Task 1 (Report)' : essay.task_type === 'task2' ? 'Task 2 (Essay)' : 'Composite Session'}
                          </span>
                          <span className="text-xs text-[#6e6e73]">
                            {format(new Date(essay.created_at), 'MMMM dd, yyyy · hh:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-[#f5f5f7] leading-relaxed line-clamp-2">
                          &ldquo;{getTopicText(essay.topic_text)}&rdquo;
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 shrink-0 justify-between md:justify-end">
                        {essay.status === 'reviewed' ? (
                          <>
                            <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full border ${getBandBadgeStyle(essay.overall_band)}`}>
                              {essay.overall_band != null && Number(essay.overall_band) > 0 ? `Band ${Number(essay.overall_band).toFixed(1)}` : 'Feedback only'}
                            </span>
                            <Link
                              href={`/student/review/${essay.id}`}
                              className="px-4 py-2 text-xs font-semibold text-black bg-[#f5f5f7] hover:bg-[#cfcfcf] rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              Review <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />
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