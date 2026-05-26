'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, Clock, Search, RefreshCw, AlertCircle, Edit3, ArrowRight, Trash2, Users, Eye, Edit2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { Essay } from '@/types';
import { Navbar } from '@/components/navbar';
import { toast } from 'sonner';
import { getBandBadgeStyle, getBandTextColor, STUDENT_GROUPS, countWords } from '@/lib/utils';

interface Student {
  id: string;
  full_name: string;
  group_name?: string | null;
  created_at: string;
  essay_count: number;
}

export default function TeacherDashboard() {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<{ fullName: string } | null>(null);
  const [viewTab, setViewTab] = useState<'submissions' | 'students'>('submissions');

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Live monitoring now runs on its own separate optimized page route with 1-second snappy updates

  const fetchEssays = (isInitial = false) => {
    if (!isInitial) {
      setIsLoading(true);
      setError(null);
    }
    fetch('/api/essays')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch essays');
        return res.json();
      })
      .then(data => {
        if (data.essays) setEssays(data.essays);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message || 'An error occurred while loading submissions');
        setIsLoading(false);
      });
  };

  const fetchStudents = () => {
    fetch('/api/students')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch students');
        return res.json();
      })
      .then(data => {
        if (data.students) setStudents(data.students);
      })
      .catch(err => {
        toast.error('Could not fetch student directory');
      });
  };

  useEffect(() => {
    fetchEssays(true);
    fetchStudents();
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleDeleteEssay = async (essayId: string) => {
    if (!confirm('Are you sure you want to permanently delete this student submission?')) return;
    try {
      const res = await fetch(`/api/essays?id=${essayId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete submission');
      toast.success('Submission successfully deleted');
      fetchEssays();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('WARNING: Deleting this student account will permanently remove all their essays, test scores, and reviews. Proceed?')) return;
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student');
      toast.success('Student account and historical records deleted');
      fetchStudents();
      fetchEssays();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          fullName: editName,
          groupName: editGroup,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');
      toast.success('Student profile updated successfully');
      setEditingStudent(null);
      fetchStudents();
      fetchEssays();
    } catch (err: any) {
      toast.error(err.message || 'Error updating student');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getTaskLabel = (type: string) => {
    if (type === 'task1') return 'Task 1';
    if (type === 'task2') return 'Task 2';
    return 'Both Tasks';
  };

  const filteredEssays = essays.filter(essay => {
    const matchesFilter = filter === 'all' || essay.status === filter;
    
    let topicText = essay.topic_text;
    try {
        const parsed = JSON.parse(topicText);
        topicText = parsed.task2?.text || parsed.task1?.text || topicText;
    } catch (e) {}

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
        topicText.toLowerCase().includes(searchLower) || 
        (essay.full_name || '').toLowerCase().includes(searchLower);
        
    const matchesGroup = selectedGroup === 'all' || 
        (selectedGroup === 'even' && ((essay as any).group_name || '').toLowerCase().startsWith('even')) ||
        (selectedGroup === 'odd' && ((essay as any).group_name || '').toLowerCase().startsWith('odd')) ||
        (essay as any).group_name === selectedGroup;
        
    return matchesFilter && matchesSearch && matchesGroup;
  });

  const filteredStudents = students.filter(student => 
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudentsGrouped = filteredStudents.filter(student => {
    if (selectedGroup === 'all') return true;
    if (selectedGroup === 'even') return (student.group_name || '').toLowerCase().startsWith('even');
    if (selectedGroup === 'odd') return (student.group_name || '').toLowerCase().startsWith('odd');
    return student.group_name === selectedGroup;
  });

  const totalSubmissions = essays.length;
  const pendingGradings = essays.filter(e => e.status !== 'reviewed').length;
  const completedGradings = essays.filter(e => e.status === 'reviewed').length;

  return (
    <Navbar>
      <div className="space-y-8 relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-6 animate-luxury-fade">
        {/* Luxury backgrounds and overlays */}
        <div className="luxury-bg-glow" />
        <div className="luxury-grid-overlay" />

        {/* Welcome Section */}
        <div className="relative overflow-hidden p-6 sm:p-8 smoked-glass border border-[var(--color-border)]/60 rounded-lg shadow-2xl">
          <div className="absolute top-0 left-20 w-32 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent" />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-primary)] font-bold block">
                Examiner Control Room
              </span>
              <h1 className="text-display text-[#F5F5F7]">
                Welcome, <span className="text-white italic">{user?.fullName || 'Examiner'}</span>!
              </h1>
              <p className="text-xs text-[var(--color-text-secondary)] max-w-xl">
                Signed in with standard master privileges. Review active candidate submissions, customize bands benchmarks, and regulate directory databases.
              </p>
            </div>
            <button 
              onClick={() => { fetchEssays(); fetchStudents(); }}
              className="inline-flex cursor-pointer items-center justify-center px-5 py-2.5 border border-[var(--color-border-strong)] hover:border-[var(--color-primary)]/40 hover:bg-[#111114] text-[#F5F5F7] hover:text-[#FFFFFF] text-xs uppercase tracking-widest font-semibold rounded transition-all active:scale-[0.99]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Sync Ledger
            </button>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex flex-wrap border-b border-[var(--color-border)]/50 gap-2 relative z-20">
          <button 
            onClick={() => setViewTab('submissions')}
            className={`flex items-center space-x-2 py-3 px-6 text-sm sm:text-xs uppercase tracking-wider font-bold border-b-2 transition-all duration-300 cursor-pointer ${
              viewTab === 'submissions' 
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <FileText className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-current" />
            <span>Active Submissions</span>
          </button>
          <button 
            onClick={() => setViewTab('students')}
            className={`flex items-center space-x-2 py-3 px-6 text-sm sm:text-xs uppercase tracking-wider font-bold border-b-2 transition-all duration-300 cursor-pointer ${
              viewTab === 'students' 
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Users className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-current" />
            <span>Candidates Directory</span>
          </button>
        </div>

        {/* Global Study Group selection panel - Filters both Active Submissions & Candidates Directory simultaneously */}
        <div className="relative z-10 smoked-glass p-5 sm:p-6 border border-[var(--color-border)]/70 rounded-lg shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] font-bold">
              Cohort Selection / Study Group Filter
            </span>
            <span className="text-[10px] font-mono text-[var(--color-primary)] font-semibold uppercase">
              Current focus: {selectedGroup === 'all' ? 'All Active Cohorts' : `Cohort ${selectedGroup}`}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedGroup('all')}
              className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedGroup === 'all'
                  ? 'bg-white/5 text-white border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.08)]'
                  : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[#F5F5F7]/30 hover:text-[#FFFFFF]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>All ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup('even')}
              className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedGroup === 'even'
                  ? 'bg-purple-950/30 text-purple-400 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-purple-500/50 hover:text-purple-300'
              }`}
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>Even Groups ({students.filter(s => (s.group_name || '').toLowerCase().startsWith('even')).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedGroup('odd')}
              className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedGroup === 'odd'
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)] shadow-[0_0_15px_rgba(197,168,128,0.12)]'
                  : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
              }`}
            >
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Odd Groups ({students.filter(s => (s.group_name || '').toLowerCase().startsWith('odd')).length})</span>
            </button>
            {STUDENT_GROUPS.map((grp) => {
              const grpCount = students.filter(s => s.group_name === grp).length;
              return (
                <button
                  type="button"
                  key={grp}
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    selectedGroup === grp
                      ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)] shadow-[0_0_15px_rgba(197,168,128,0.12)]'
                      : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[#F5F5F7]/30 hover:text-[#FFFFFF]'
                  }`}
                >
                  <span>{grp}</span>
                  <span className="bg-neutral-800 text-neutral-300 font-mono px-2 py-0.5 rounded text-[10px]">
                    {grpCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {viewTab === 'submissions' && (
          <>
            {/* Overview Stats for Teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-luxury">
              <div className="p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl luxury-card-hover">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Unlocking Submissions</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#101014] to-[#16161C] border border-[var(--color-border)]/60 flex items-center justify-center text-[var(--color-primary)]">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-mono text-[#F5F5F7]">{totalSubmissions}</span>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mt-1">Attempts Logged</p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl luxury-card-hover">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Active Appraisals</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#101014] to-[#16161C] border border-[var(--color-border)]/60 flex items-center justify-center text-[var(--color-warning)]">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-mono text-[#F5F5F7]">{pendingGradings}</span>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mt-1">Pending Calibration</p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-[#0B0B0E] to-[#111114] border border-[var(--color-border)]/60 rounded-lg shadow-xl luxury-card-hover sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">Calibrated Essays</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#101014] to-[#16161C] border border-[var(--color-border)]/60 flex items-center justify-center text-[var(--color-success)]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-mono text-[var(--color-primary)]">{completedGradings}</span>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mt-1">Evaluated Database</p>
                </div>
              </div>
            </div>

            {/* Filters and search panel */}
            <div className="smoked-glass p-5 border border-[var(--color-border)]/60 rounded-lg flex flex-col lg:flex-row gap-4 items-stretch lg:items-center shadow-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input 
                  type="text" 
                  placeholder="FILTER BY CANDIDATE NAME OR ESSAY OUTLINE..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-[#050507] border border-[var(--color-border)] rounded text-xs tracking-wider text-[#F5F5F7] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                />
              </div>

              <div className="flex bg-[#050507] p-1 rounded border border-[var(--color-border)]/80 overflow-x-auto shrink-0 gap-1.5">
                {[
                  { id: 'all', label: 'All Essays' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'reviewed', label: 'Reviewed' }
                ].map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                      filter === tab.id
                        ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                        : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Essays List Block */}
            <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg overflow-hidden shadow-2xl">
              {isLoading ? (
                <div className="p-20 text-center text-[var(--color-text-tertiary)] space-y-3">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--color-primary)]" />
                  <p className="text-xs uppercase tracking-widest">Retrieving candidate ledger...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <AlertCircle className="w-8 h-8 text-[#E06C75] mb-3" />
                  <h3 className="text-xs uppercase tracking-widest font-bold text-[#F5F5F7] mb-2">Error Loading Inbox</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] font-medium max-w-md">{error}</p>
                </div>
              ) : filteredEssays.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center">
                  <FileText className="w-10 h-10 text-[var(--color-text-tertiary)] mb-4 opacity-40" />
                  <h3 className="text-xs uppercase tracking-widest font-bold text-[#F5F5F7]">No candidate logs</h3>
                  <p className="text-[10px] uppercase tracking-normal text-[var(--color-text-tertiary)] mt-1">Try resetting the selection matrix query.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] divide-y divide-[var(--color-border)]/40 text-xs text-[#F5F5F7]">
                    <thead className="bg-[#0B0B0E]/80 border-b border-[var(--color-border)]/50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Attempt Date</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Student Name</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Task Module</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Topic Prompt</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Score / Status</th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/20 bg-[#050507]/20">
                      {filteredEssays.map((essay) => {
                        let topicText = essay.topic_text;
                        try {
                            const parsed = JSON.parse(topicText);
                            topicText = parsed.task2?.text || parsed.task1?.text || topicText;
                        } catch (e) {}

                        const studentName = essay.full_name || 'Unknown Student';
                        const initials = studentName !== 'Unknown Student'
                          ? studentName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                          : '?';

                        return (
                          <tr key={essay.id} className="hover:bg-[#111114]/40 transition-colors duration-200 group">
                            <td className="px-6 py-4.5 whitespace-nowrap text-[var(--color-text-secondary)] font-mono">
                              {format(new Date(essay.created_at), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="w-7 h-7 rounded-full bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] text-[10px] font-mono font-bold">
                                  {initials}
                                </div>
                                <span className="font-semibold text-[#FFFFFF]">{studentName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
                              {getTaskLabel(essay.task_type)}
                            </td>
                            <td className="px-6 py-4.5 max-w-[200px] truncate text-[var(--color-text-tertiary)] italic font-serif">
                              &ldquo;{topicText}&rdquo;
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap">
                              {essay.status === 'reviewed' ? (
                                <span className={`text-sm font-sans font-extrabold tracking-wide uppercase flex items-center gap-2 px-4 py-2 rounded-md border shadow-sm ${getBandBadgeStyle(essay.overall_band)}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${essay.overall_band != null && Number(essay.overall_band) >= 9.0 ? 'bg-gradient-to-r from-red-500 to-purple-500 animate-pulse' : 'bg-current'}`} />
                                  Band {essay.overall_band != null ? Number(essay.overall_band).toFixed(1) : '—'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono font-semibold tracking-wider text-[var(--color-warning)] uppercase flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--color-warning-soft)] border border-[var(--color-warning)]/10">
                                  <span className="w-1 h-1 rounded-full bg-[var(--color-warning)] animate-pulse" />
                                  Unmarked
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4.5 whitespace-nowrap text-center space-x-2">
                              {essay.status === 'reviewed' ? (
                                <Link 
                                  href={`/teacher/review/${essay.id}`} 
                                  className="inline-flex cursor-pointer items-center px-3 py-1 border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[#111114] rounded text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[#FFFFFF] transition-all"
                                >
                                  <Edit3 className="w-3 h-3 mr-1 text-[var(--color-primary)]/80" /> Re-Grade
                                </Link>
                              ) : (
                                <Link 
                                  href={`/teacher/review/${essay.id}`} 
                                  className="inline-flex cursor-pointer items-center justify-center px-4.5 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black text-[10px] font-extrabold uppercase tracking-[0.16em] rounded border border-[var(--color-primary)] transition-all shadow-md gap-1"
                                >
                                  <span>Evaluate</span>
                                  <ArrowRight className="w-3.5 h-3.5 text-black stroke-[3]" />
                                </Link>
                              )}
                              <button
                                onClick={() => handleDeleteEssay(essay.id)}
                                className="inline-flex cursor-pointer items-center justify-center p-2 text-[#E06C75]/70 hover:text-[#E06C75] border border-transparent hover:border-[#E06C75]/20 hover:bg-[#E06C75]/10 rounded transition-all"
                                title="Delete Essay Submission"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {viewTab === 'students' && (
          <div className="space-y-6 animate-luxury-fade">
            <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[var(--color-border)]/50 bg-[#0B0B0E]/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-[var(--color-primary)]">Registered Candidates Ledger</h3>
                  <p className="text-xs text-[var(--color-text-tertiary)] uppercase mt-1 tracking-wider leading-relaxed">Management panel to filter cohorts, clean database profiles, and monitor writing live.</p>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input 
                    type="text" 
                    placeholder="SEARCH ALUMNI..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#050507] border border-[var(--color-border)] rounded text-xs tracking-wider text-[#F5F5F7] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                </div>
              </div>

              {filteredStudentsGrouped.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="w-10 h-10 text-[var(--color-text-tertiary)] mx-auto mb-4 opacity-40" />
                  <p className="text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] font-bold">No registered candidates matched your query</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[950px] divide-y divide-[var(--color-border)]/45 text-xs text-[#F5F5F7]">
                    <thead className="bg-[#0B0B0E]/80 border-b border-[var(--color-border)]/50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Registration Date</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Student Name</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Study Group</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Saved Attempts</th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-[var(--color-text-tertiary)] tracking-widest uppercase">Operations & Live Monitoring</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/20 bg-[#050507]/20">
                      {filteredStudentsGrouped.map((student) => (
                        <tr key={student.id} className="hover:bg-[#111114]/40 transition-colors duration-200">
                          <td className="px-6 py-4.5 whitespace-nowrap text-[var(--color-text-secondary)] font-mono text-xs">
                            {format(new Date(student.created_at), 'MMMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap font-bold text-[#FFFFFF] text-xs">
                            {student.full_name}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <span className="text-xs px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-semibold uppercase tracking-wider">
                              {student.group_name || 'No Group Specified'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold text-xs">
                            {student.essay_count} essays submitted
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-center space-x-2">
                            <Link
                              href={`/teacher/monitor/${student.id}`}
                              className="inline-flex cursor-pointer items-center space-x-1.5 px-3 py-2 bg-red-950/20 text-red-400 border border-red-900/40 hover:bg-red-950 hover:text-red-300 rounded text-xs uppercase tracking-widest font-extrabold transition-all duration-200 animate-pulse hover:animate-none"
                              title="Launch Full Screen Live Writing Stream"
                            >
                              <Eye className="w-4 h-4 shrink-0" />
                              <span>Live Monitor</span>
                            </Link>
                            
                            <button
                              onClick={() => {
                                setEditingStudent(student);
                                setEditName(student.full_name);
                                setEditGroup(student.group_name || STUDENT_GROUPS[0]);
                              }}
                              className="inline-flex cursor-pointer items-center space-x-1 px-3 py-1.5 bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 rounded text-xs uppercase tracking-widest font-bold transition-all duration-200"
                            >
                              <Edit2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Edit / Transfer</span>
                            </button>

                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="inline-flex cursor-pointer items-center space-x-1 px-3 py-1.5 bg-[#E06C75]/10 text-[#E06C75] border border-[#E06C75]/25 hover:bg-[#E06C75] hover:text-black rounded text-[#11px] uppercase tracking-widest font-bold transition-all duration-200"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transfer group & Edit modal screen */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-luxury-fade">
            <div className="w-full max-w-md smoked-glass border border-[var(--color-border)]/80 rounded-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-4.5 border-b border-[var(--color-border)]/50 bg-[#0c0c10] flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--color-primary)]">
                  Edit Candidate Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="text-xs uppercase tracking-widest text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveStudentEdit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full h-11 px-4 bg-[#0B0B0E] border border-[var(--color-border)] rounded text-xs tracking-wider text-[#F5F5F7] focus:outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400">Cohort Group (Transfer)</label>
                  <select
                    value={editGroup}
                    onChange={e => setEditGroup(e.target.value)}
                    className="w-full h-11 px-4 bg-[#0B0B0E] border border-[var(--color-border)] rounded text-xs tracking-wider text-[#F5F5F7] focus:outline-none focus:border-[var(--color-primary)] transition-all cursor-pointer font-semibold"
                  >
                    {STUDENT_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="w-full h-11 relative overflow-hidden flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--color-primary)] to-[#D4AF37] hover:brightness-110 text-black font-semibold text-xs uppercase tracking-widest rounded shadow-xl cursor-pointer transition-all disabled:opacity-40"
                >
                  {isSavingEdit ? 'Applying Database Changes...' : 'Save Profile Details'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}