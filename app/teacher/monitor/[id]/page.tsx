'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Users, ArrowLeft, RefreshCw, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { countWords } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LiveMonitorPage({ params }: PageProps) {
  const router = useRouter();
  const { id: studentId } = use(params);

  const [student, setStudent] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    // Initial fetch of candidate details
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        if (data.students) {
          const s = data.students.find((item: any) => item.id === studentId);
          if (s) setStudent(s);
        }
      })
      .catch(err => console.error('Error fetching student details:', err));
  }, [studentId]);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const res = await fetch(`/api/test/live-draft?student_id=${studentId}`);
        if (!res.ok) {
          throw new Error('Failed to load active streaming feed');
        }
        const data = await res.json();
        setDraft(data.draft || null);
        setLastSynced(new Date());
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error syncing writing stream');
        setIsLoading(false);
      }
    };

    fetchDraft();
    const interval = setInterval(fetchDraft, 1000); // 1-second snappy updates!
    return () => clearInterval(interval);
  }, [studentId]);

  const getTaskLabel = (type: string) => {
    if (type === 'task1') return 'Task 1';
    if (type === 'task2') return 'Task 2';
    if (type === 'both') return 'Task 1 & Task 2 Config';
    return type;
  };

  return (
    <Navbar>
      <div className="space-y-8 relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6 animate-luxury-fade">
        <div className="luxury-bg-glow" />
        <div className="luxury-grid-overlay" />

        {/* Header Action Row */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="inline-flex cursor-pointer items-center justify-center h-10 px-4 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[#111114] text-[#F5F5F7] hover:text-[#FFFFFF] text-xs uppercase tracking-widest font-semibold rounded transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Dashboard</span>
            </Link>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className={`${draft ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${draft ? 'bg-red-500' : 'bg-neutral-500'}`}></span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary)] font-extrabold">
                  {draft ? 'Active Broadcast Studio' : 'Active Monitor Offline'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {student ? student.full_name : 'Loading Student...'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {student?.group_name && (
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded">
                Cohort: {student.group_name}
              </span>
            )}
            {lastSynced && (
              <span className="text-[9px] font-mono text-emerald-400 uppercase bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-2 rounded flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin duration-[4000ms]" />
                <span>Last live feed update: {format(lastSynced, 'hh:mm:ss a')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Main Interface Layout */}
        <div className="relative z-10">
          {isLoading ? (
            <div className="p-24 text-center smoked-glass border border-[var(--color-border)]/60 rounded-lg shadow-xl space-y-4">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[var(--color-primary)]" />
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-bold">Initializing candidate security handshake...</p>
            </div>
          ) : !draft ? (
            <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg p-12 sm:p-20 text-center shadow-xl max-w-2xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full border border-neutral-800 flex items-center justify-center text-neutral-500 bg-neutral-950/80 mx-auto">
                <Clock className="w-7 h-7 animate-pulse text-[var(--color-warning)]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#F5F5F7]">
                  No Live Streaming Connection
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-normal leading-relaxed">
                  Candidate {student ? <strong>{student.full_name}</strong> : 'this student'} has not entered the computer-delivered exam room, or has closed their writing buffer container.
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wide">
                  Writing telemetry panels populate automatically in real-time as they type.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/teacher/dashboard"
                  className="inline-flex cursor-pointer items-center justify-center h-10 px-6 bg-transparent border border-[var(--color-border-strong)] hover:border-[var(--color-primary)] text-xs uppercase tracking-widest font-semibold text-neutral-300 hover:text-white rounded transition-all"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Sidebar Indicators */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl space-y-4">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary)] font-bold border-b border-neutral-800 pb-2">
                    Active Telemetry Controls
                  </h3>
                  
                  <div className="space-y-3 text-xs uppercase tracking-wider font-semibold">
                    <div className="flex justify-between border-b border-neutral-900/60 pb-2">
                      <span className="text-[var(--color-text-secondary)]">Task Type:</span>
                      <span className="text-white font-mono">{getTaskLabel(draft.task_type)}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-900/60 pb-2">
                      <span className="text-[var(--color-text-secondary)] text-xs">Viewing Screen:</span>
                      <span className="text-[var(--color-primary)] font-bold underline decoration-dotted">
                        Task {draft.active_tab} Panel
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-900/60 pb-2">
                      <span className="text-[var(--color-text-secondary)]">Stream Status:</span>
                      <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5 animate-pulse">
                        ● STABLE STREAMING
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-[var(--color-text-secondary)]">Last Ping:</span>
                      <span className="text-white font-mono">
                        {format(new Date(draft.updated_at), 'hh:mm:ss a')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl space-y-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-accent)] font-bold block border-b border-neutral-800 pb-2">
                    Writing Prompt
                  </span>
                  <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed italic font-serif max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {(() => {
                      try {
                        const parsed = JSON.parse(draft.topic_text);
                        return (
                          <div className="space-y-4">
                            {parsed.task1 && (
                              <div>
                                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] not-italic">Task 1:</h4>
                                <p className="mt-1">{parsed.task1.text}</p>
                              </div>
                            )}
                            {parsed.task2 && (
                              <div>
                                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] not-italic">Task 2:</h4>
                                <p className="mt-1">{parsed.task2.text}</p>
                              </div>
                            )}
                          </div>
                        );
                      } catch {
                        return <p>{draft.topic_text}</p>;
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Real-time Draft Editor Output Container */}
              <div className="lg:col-span-8 space-y-6">
                {/* Simulated Editor Tab Header */}
                <div className="flex bg-neutral-950 p-2 rounded-lg border border-neutral-900 gap-2">
                  {['task1', 'both'].includes(draft.task_type) && (
                    <div className={`flex-1 text-center py-3 text-xs font-bold uppercase tracking-widest rounded transition-all border ${draft.active_tab === 1 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]/40 shadow-inner' : 'text-neutral-500 border-transparent'}`}>
                      <span>Task 1 Draft</span>
                      <span className="ml-2.5 px-2 py-0.5 bg-neutral-900 rounded font-mono text-[10px] text-neutral-400">
                        {countWords(draft.content_task1 || '')} words
                      </span>
                    </div>
                  )}
                  {['task2', 'both'].includes(draft.task_type) && (
                    <div className={`flex-1 text-center py-3 text-xs font-bold uppercase tracking-widest rounded transition-all border ${draft.active_tab === 2 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]/40 shadow-inner' : 'text-neutral-500 border-transparent'}`}>
                      <span>Task 2 Draft</span>
                      <span className="ml-2.5 px-2 py-0.5 bg-neutral-900 rounded font-mono text-[10px] text-neutral-400">
                        {countWords(draft.content_task2 || '')} words
                      </span>
                    </div>
                  )}
                </div>

                {/* Subtitle Warning Banner */}
                <div className="p-3 bg-red-950/20 border border-red-950 rounded text-[10px] text-[var(--color-text-secondary)] font-medium leading-relaxed uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>Only viewing stream. You are restricted from editing the candidate&apos;s active buffer to prevent disruption.</span>
                </div>

                {/* Simulated Draft Papers */}
                <div className="space-y-6">
                  {['task1', 'both'].includes(draft.task_type) && (
                    <div className={`p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border rounded-lg shadow-xl space-y-2.5 transition-opacity duration-300 ${draft.active_tab === 1 ? 'border-[var(--color-primary)]/40 opacity-100' : 'border-neutral-900 opacity-50'}`}>
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-bold">
                          Task 1 Live Workspace {draft.active_tab === 1 && '✍️ (typing active)'}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                          WORD COUNT: {countWords(draft.content_task1 || '')} / 150 LIMIT
                        </span>
                      </div>
                      <div className="w-full bg-[#050507]/40 min-h-[220px] max-h-[350px] overflow-y-auto p-4 rounded text-xs leading-relaxed text-[#f4f4f6] font-sans whitespace-pre-wrap border border-neutral-950 pr-2">
                        {draft.content_task1 ? (
                          draft.content_task1
                        ) : (
                          <span className="italic text-neutral-600 uppercase tracking-widest text-[10px]">Candidate has not entered content for Task 1</span>
                        )}
                      </div>
                    </div>
                  )}

                  {['task2', 'both'].includes(draft.task_type) && (
                    <div className={`p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border rounded-lg shadow-xl space-y-2.5 transition-opacity duration-300 ${draft.active_tab === 2 ? 'border-[var(--color-primary)]/40 opacity-100' : 'border-neutral-900 opacity-50'}`}>
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-300 font-bold">
                          Task 2 Live Workspace {draft.active_tab === 2 && '✍️ (typing active)'}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold">
                          WORD COUNT: {countWords(draft.content_task2 || '')} / 250 LIMIT
                        </span>
                      </div>
                      <div className="w-full bg-[#050507]/40 min-h-[300px] max-h-[450px] overflow-y-auto p-4 rounded text-xs leading-relaxed text-[#f4f4f6] font-sans whitespace-pre-wrap border border-neutral-950 pr-2">
                        {draft.content_task2 ? (
                          draft.content_task2
                        ) : (
                          <span className="italic text-neutral-600 uppercase tracking-widest text-[10px]">Candidate has not entered content for Task 2</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Navbar>
  );
}
