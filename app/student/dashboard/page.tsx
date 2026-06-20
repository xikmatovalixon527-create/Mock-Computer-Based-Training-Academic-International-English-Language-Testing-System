'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, Award, ArrowRight, RefreshCw, BookOpen, Settings2, User, ShieldAlert, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { Leaderboard } from '@/components/leaderboard';
import { Essay } from '@/types';
import { getBandBadgeStyle, getBandTextColor } from '@/lib/utils';
import { toast } from 'sonner';

type ActiveTab = 'essays' | 'leaderboard' | 'account';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('essays');
  const [essays, setEssays] = useState<Essay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; fullName: string; role: string; groupName?: string; createdAt?: string } | null>(null);

  // Account modification states
  const [editName, setEditName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/essays').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([essaysData, userData]) => {
      if (essaysData.essays) setEssays(essaysData.essays);
      if (userData.user) {
        setUser(userData.user);
        setEditName(userData.user.fullName);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingAccount(true);
    try {
      const res = await fetch('/api/settings/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editName,
          newPassword: newPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credentials');
      }
      toast.success('Account profile updated successfully');
      setNewPassword('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile details.');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

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

  const getIsMock = (topic: string) => {
    try {
      const p = JSON.parse(topic);
      return p.isMock === true;
    } catch { return false; }
  };

  return (
    <Navbar>
      <div className="space-y-8 max-w-7xl mx-auto relative">
        <div className="luxury-grid-overlay opacity-30" />

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-[#1f1f23] gap-1 bg-black/40 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('essays')}
            className={`flex items-center space-x-2 py-2 px-5 text-xs font-semibold tracking-wider rounded-md cursor-pointer transition-all ${
              activeTab === 'essays' ? 'bg-[#121214] text-[#0071e3]' : 'text-[#8a8a8e] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Essays ({essays.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center space-x-2 py-2 px-5 text-xs font-semibold tracking-wider rounded-md cursor-pointer transition-all ${
              activeTab === 'leaderboard' ? 'bg-[#121214] text-[#0071e3]' : 'text-[#8a8a8e] hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center space-x-2 py-2 px-5 text-xs font-semibold tracking-wider rounded-md cursor-pointer transition-all ${
              activeTab === 'account' ? 'bg-[#121214] text-[#0071e3]' : 'text-[#8a8a8e] hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Account</span>
          </button>
        </div>

        {activeTab === 'essays' && (
          <div className="space-y-8 animate-fade-in">
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
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getIsMock(essay.topic_text) ? 'bg-[#bf5af2]/15 text-[#bf5af2] border border-[#bf5af2]/30' : 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'}`}>
                                {getIsMock(essay.topic_text) ? 'Mock' : 'Practice'}
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
                                <button
                                  onClick={() => router.push(`/student/review/${essay.id}`)}
                                  className="px-4 py-2 text-xs font-semibold text-black bg-[#f5f5f7] hover:bg-[#cfcfcf] rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  Review <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />
                                  Awaiting Marking
                                </span>
                                <button
                                  onClick={() => router.push(`/student/review/${essay.id}`)}
                                  className="px-4 py-2 text-xs font-semibold text-neutral-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  View Writing <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </>
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
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 animate-fade-in">
            <Leaderboard />
          </div>
        )}

        {activeTab === 'account' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Account Details Panel */}
            <div className="md:col-span-1 bg-[#121214] border border-[#1f1f23] p-6 rounded-xl space-y-4">
              <div className="flex flex-col items-center text-center space-y-2 py-4 border-b border-[#1f1f23]">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3] shadow-lg">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white">{user?.fullName || 'Student'}</h3>
                <span className="px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-zinc-800 border border-zinc-700 text-neutral-300 rounded-full">
                  Student Profile
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-0.5">Assigned Class Group</span>
                  <span className="font-semibold text-[#0071e3] uppercase tracking-wider">{user?.groupName || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-0.5">Registration Date</span>
                  <span className="text-[#a1a1aa] font-mono">
                    {user?.createdAt ? format(new Date(user.createdAt), 'MMMM dd, yyyy') : '—'}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#1f1f23] flex items-center gap-2 text-[#71717a] leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-[#ff9f0a] shrink-0" />
                  <span>Registered under strict Latin "First Last" name formatting protocol.</span>
                </div>
              </div>
            </div>

            {/* Profile Update Panel */}
            <div className="md:col-span-2 bg-[#121214] border border-[#1f1f23] p-6 rounded-xl space-y-5">
              <div className="pb-2 border-b border-[#1f1f23]">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Profile Security</h2>
                <p className="text-xs text-[#8a8a8e]">Modify your name structure or secure password parameters below</p>
              </div>

              <form onSubmit={handleUpdateAccount} className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-[#8a8a8e]">Full Name (First Last)</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full h-10 px-3 bg-black border border-[#1f1f23] rounded-lg text-sm text-white focus:outline-none focus:border-[#0071e3] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-semibold text-[#8a8a8e]">
                    New Security Password <span className="text-[10px] text-[#6e6e73] font-normal lowercase italic">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 bg-black border border-[#1f1f23] rounded-lg text-sm text-white focus:outline-none focus:border-[#0071e3] transition-colors placeholder:text-zinc-700 font-mono"
                    />
                    <KeyRound className="w-4 h-4 text-zinc-600 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingAccount}
                  className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider rounded-full cursor-pointer transition-all disabled:opacity-50"
                >
                  {isUpdatingAccount ? 'Updating Account...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}