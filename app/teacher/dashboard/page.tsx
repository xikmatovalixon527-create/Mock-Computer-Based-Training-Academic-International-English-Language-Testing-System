'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle2, Clock, Search, RefreshCw, AlertCircle, Edit3, ArrowRight, Trash2, Users, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { Essay } from '@/types';
import { Navbar } from '@/components/navbar';
import { toast } from 'sonner';
import { getBandBadgeStyle, getBandTextColor, STUDENT_GROUPS } from '@/lib/utils';

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

  const fetchEssays = (isInitial = false) => {
    if (!isInitial) { setIsLoading(true); setError(null); }
    fetch('/api/essays').then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); }).then(data => { if (data.essays) setEssays(data.essays); setIsLoading(false); }).catch(err => { setError(err.message); setIsLoading(false); });
  };

  const fetchStudents = () => {
    fetch('/api/students').then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); }).then(data => { if (data.students) setStudents(data.students); }).catch(() => toast.error('Error'));
  };

  useEffect(() => {
    fetchEssays(true); fetchStudents(); fetch('/api/me').then(res => res.json()).then(data => { if (data.user) setUser(data.user); }).catch(() => {});
  }, []);

  const handleDeleteEssay = async (essayId: string) => {
    if (!confirm('Are you sure?')) return;
    try { await fetch(`/api/essays?id=${essayId}`, { method: 'DELETE' }); toast.success('Deleted'); fetchEssays(); } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('WARNING: Delete student?')) return;
    try { await fetch(`/api/students?id=${studentId}`, { method: 'DELETE' }); toast.success('Deleted'); fetchStudents(); fetchEssays(); } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/students', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingStudent.id, fullName: editName, groupName: editGroup }) });
      if (!res.ok) throw new Error('Failed');
      toast.success('Updated'); setEditingStudent(null); fetchStudents(); fetchEssays();
    } catch (err: any) { toast.error(err.message); } finally { setIsSavingEdit(false); }
  };

  const getTaskLabel = (type: string) => { if (type === 'task1') return 'Task 1'; if (type === 'task2') return 'Task 2'; return 'Both'; };

  const filteredEssays = essays.filter(essay => {
    const matchesFilter = filter === 'all' || essay.status === filter;
    let topicText = essay.topic_text;
    try { const parsed = JSON.parse(topicText); topicText = parsed.task2?.text || parsed.task1?.text || topicText; } catch {}
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = topicText.toLowerCase().includes(searchLower) || (essay.full_name || '').toLowerCase().includes(searchLower);
    const matchesGroup = selectedGroup === 'all' || (selectedGroup === 'even' && ((essay as any).group_name || '').toLowerCase().startsWith('even')) || (selectedGroup === 'odd' && ((essay as any).group_name || '').toLowerCase().startsWith('odd')) || (essay as any).group_name === selectedGroup;
    return matchesFilter && matchesSearch && matchesGroup;
  });

  const filteredStudentsGrouped = students.filter(student => student.full_name.toLowerCase().includes(searchQuery.toLowerCase())).filter(student => {
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
        <div className="luxury-bg-glow" /><div className="luxury-grid-overlay" />
        <div className="relative overflow-hidden p-6 sm:p-8 smoked-glass border border-[var(--color-border)]/60 rounded-lg shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-primary)] font-bold block">Examiner Control Room</span>
              <h1 className="text-display text-[#F5F5F7]">Welcome, <span className="text-white italic">{user?.fullName || 'Examiner'}</span>!</h1>
            </div>
            <button onClick={() => { fetchEssays(); fetchStudents(); }} className="inline-flex cursor-pointer items-center justify-center px-5 py-2.5 border border-[var(--color-border-strong)] hover:border-[var(--color-primary)]/40 hover:bg-[#111114] text-[#F5F5F7] text-xs uppercase font-semibold rounded"><RefreshCw className="w-3.5 h-3.5 mr-2" />Sync</button>
          </div>
        </div>
        <div className="flex flex-wrap border-b border-[var(--color-border)]/50 gap-2 relative z-20">
          <button onClick={() => setViewTab('submissions')} className={`flex items-center space-x-2 py-3 px-6 text-sm sm:text-xs uppercase font-bold border-b-2 cursor-pointer ${viewTab === 'submissions' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-tertiary)]'}`}><FileText className="w-4 h-4" /><span>Submissions</span></button>
          <button onClick={() => setViewTab('students')} className={`flex items-center space-x-2 py-3 px-6 text-sm sm:text-xs uppercase font-bold border-b-2 cursor-pointer ${viewTab === 'students' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-tertiary)]'}`}><Users className="w-4 h-4" /><span>Directory</span></button>
        </div>
        <div className="relative z-10 smoked-glass p-5 border border-[var(--color-border)]/70 rounded-lg shadow-xl space-y-3.5">
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => setSelectedGroup('all')} className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase border cursor-pointer ${selectedGroup === 'all' ? 'bg-white/5 text-white border-white/30' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)]'}`}>All</button>
            <button type="button" onClick={() => setSelectedGroup('even')} className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase border cursor-pointer ${selectedGroup === 'even' ? 'bg-purple-950/30 text-purple-400 border-purple-500' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)]'}`}>Even</button>
            <button type="button" onClick={() => setSelectedGroup('odd')} className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase border cursor-pointer ${selectedGroup === 'odd' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)]'}`}>Odd</button>
            {STUDENT_GROUPS.map((grp) => <button type="button" key={grp} onClick={() => setSelectedGroup(grp)} className={`px-4.5 py-2.5 rounded text-xs font-bold uppercase border cursor-pointer ${selectedGroup === grp ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-tertiary)]'}`}>{grp}</button>)}
          </div>
        </div>

        {viewTab === 'submissions' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-[#0B0B0E] border border-[var(--color-border)]/60 rounded-lg"><div className="text-[10px] text-neutral-400 uppercase mb-4">Total</div><div className="text-2xl text-[#F5F5F7]">{totalSubmissions}</div></div>
              <div className="p-6 bg-[#0B0B0E] border border-[var(--color-border)]/60 rounded-lg"><div className="text-[10px] text-neutral-400 uppercase mb-4">Pending</div><div className="text-2xl text-[#F5F5F7]">{pendingGradings}</div></div>
              <div className="p-6 bg-[#0B0B0E] border border-[var(--color-border)]/60 rounded-lg"><div className="text-[10px] text-neutral-400 uppercase mb-4">Reviewed</div><div className="text-2xl text-[var(--color-primary)]">{completedGradings}</div></div>
            </div>
            <div className="smoked-glass p-5 border border-[var(--color-border)]/60 rounded-lg flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" /><input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-[#050507] border border-[var(--color-border)] rounded text-xs text-[#F5F5F7]" /></div>
              <div className="flex bg-[#050507] p-1 rounded border border-[var(--color-border)]/80 gap-1.5">
                {[{ id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'reviewed', label: 'Reviewed' }].map((tab) => <button type="button" key={tab.id} onClick={() => setFilter(tab.id as any)} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase cursor-pointer ${filter === tab.id ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>{tab.label}</button>)}
              </div>
            </div>
            <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg overflow-hidden">
              {isLoading ? <div className="p-20 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--color-primary)]" /></div> : error ? <div className="p-12 text-center"><AlertCircle className="w-8 h-8 text-[#E06C75] mb-3 mx-auto" /></div> : filteredEssays.length === 0 ? <div className="p-16 text-center text-[var(--color-text-tertiary)]">Empty</div> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-[#F5F5F7]">
                    <thead className="bg-[#0B0B0E]/80 border-b border-[var(--color-border)]/50"><tr><th className="px-6 py-4 text-left font-bold uppercase">Date</th><th className="px-6 py-4 text-left font-bold uppercase">Student</th><th className="px-6 py-4 text-left font-bold uppercase">Task</th><th className="px-6 py-4 text-left font-bold uppercase">Status</th><th className="px-6 py-4 text-center font-bold uppercase">Action</th></tr></thead>
                    <tbody className="divide-y divide-[var(--color-border)]/20">
                      {filteredEssays.map((essay) => (
                        <tr key={essay.id} className="hover:bg-[#111114]/40">
                          <td className="px-6 py-4.5">{format(new Date(essay.created_at), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4.5 font-bold">{essay.full_name || 'Unknown'}</td>
                          <td className="px-6 py-4.5 uppercase">{getTaskLabel(essay.task_type)}</td>
                          <td className="px-6 py-4.5">{essay.status === 'reviewed' ? <span className={`px-4 py-2 rounded-md ${getBandBadgeStyle(essay.overall_band)}`}>{essay.overall_band ? `Band ${Number(essay.overall_band).toFixed(1)}` : 'FB'}</span> : <span className="text-[var(--color-warning)]">Unmarked</span>}</td>
                          <td className="px-6 py-4.5 text-center space-x-2">
                            <Link href={`/teacher/review/${essay.id}`} className="inline-flex px-3 py-1.5 bg-[var(--color-primary)] text-black font-bold uppercase rounded">Review</Link>
                            <button onClick={() => handleDeleteEssay(essay.id)} className="p-1.5 text-[#E06C75]"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {viewTab === 'students' && (
          <div className="space-y-6">
            <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-[var(--color-border)]/50 bg-[#0B0B0E]/80 flex justify-between items-center"><h3 className="text-sm uppercase font-bold text-[var(--color-primary)]">Candidates</h3><input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-72 px-4 py-2 bg-[#050507] border border-[var(--color-border)] rounded text-xs text-[#F5F5F7]" /></div>
              {filteredStudentsGrouped.length === 0 ? <div className="p-16 text-center text-neutral-500">Empty</div> : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--color-border)]/45 text-xs text-[#F5F5F7]">
                    <thead className="bg-[#0B0B0E]/80 border-b border-[var(--color-border)]/50"><tr><th className="px-6 py-4 text-left font-bold uppercase">Date</th><th className="px-6 py-4 text-left font-bold uppercase">Name</th><th className="px-6 py-4 text-left font-bold uppercase">Group</th><th className="px-6 py-4 text-left font-bold uppercase">Essays</th><th className="px-6 py-4 text-center font-bold uppercase">Actions</th></tr></thead>
                    <tbody className="divide-y divide-[var(--color-border)]/20">
                      {filteredStudentsGrouped.map((student) => (
                        <tr key={student.id} className="hover:bg-[#111114]/40">
                          <td className="px-6 py-4.5">{format(new Date(student.created_at), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4.5 font-bold">{student.full_name}</td>
                          <td className="px-6 py-4.5 uppercase">{student.group_name || 'None'}</td>
                          <td className="px-6 py-4.5">{student.essay_count}</td>
                          <td className="px-6 py-4.5 text-center space-x-2">
                            <button onClick={() => { setEditingStudent(student); setEditName(student.full_name); setEditGroup(student.group_name || STUDENT_GROUPS[0]); }} className="px-3 py-1.5 bg-neutral-900 text-neutral-300 rounded font-bold uppercase"><Edit2 className="w-3.5 h-3.5 inline mr-1" />Edit</button>
                            <button onClick={() => handleDeleteStudent(student.id)} className="px-3 py-1.5 bg-[#E06C75]/10 text-[#E06C75] rounded font-bold uppercase"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Delete</button>
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

        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-md bg-[#0c0c10] border border-[var(--color-border)]/80 rounded-lg p-6">
              <div className="flex justify-between mb-4"><h3 className="text-xs uppercase font-bold text-[var(--color-primary)]">Edit Profile</h3><button onClick={() => setEditingStudent(null)} className="text-xs text-neutral-500">Cancel</button></div>
              <form onSubmit={handleSaveStudentEdit} className="space-y-4">
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2 bg-[#0B0B0E] border border-[var(--color-border)] rounded text-xs text-white" required />
                <select value={editGroup} onChange={e => setEditGroup(e.target.value)} className="w-full px-4 py-2 bg-[#0B0B0E] border border-[var(--color-border)] rounded text-xs text-white">{STUDENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select>
                <button type="submit" disabled={isSavingEdit} className="w-full py-2 bg-[var(--color-primary)] text-black font-bold text-xs uppercase rounded">{isSavingEdit ? 'Saving...' : 'Save'}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}