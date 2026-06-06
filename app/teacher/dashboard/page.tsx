'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Search, RefreshCw, AlertCircle, Trash2, Users, Edit2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Essay } from '@/types';
import { Navbar } from '@/components/navbar';
import { toast } from 'sonner';
import { getBandBadgeStyle, STUDENT_GROUPS } from '@/lib/utils';

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

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'deleteEssay' | 'deleteStudent' | 'none';
    targetId: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'none',
    targetId: ''
  });

  const fetchEssaysData = async () => {
    const res = await fetch('/api/essays');
    if (!res.ok) throw new Error('Failed to load essays');
    const data = await res.json();
    return data.essays || [];
  };

  const fetchStudentsData = async () => {
    const res = await fetch('/api/students');
    if (!res.ok) throw new Error('Failed to load students');
    const data = await res.json();
    return data.students || [];
  };

  const handleSyncData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [essaysList, studentsList] = await Promise.all([
        fetchEssaysData(),
        fetchStudentsData()
      ]);
      setEssays(essaysList);
      setStudents(studentsList);
      toast.success('Dashboard synchronized successfully');
    } catch (err: any) {
      setError(err.message || 'Error syncing dashboard data');
      toast.error('Failed to sync dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSyncData();
    fetch('/api/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  const openDeleteEssayConfirm = (essayId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Essay Submission?',
      description: 'Are you sure you want to permanently delete this student submission? This action cannot be undone.',
      actionType: 'deleteEssay',
      targetId: essayId
    });
  };

  const openDeleteStudentConfirm = (studentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Student Account?',
      description: 'Are you sure you want to permanently delete this student and all of their submissions? This action cannot be undone.',
      actionType: 'deleteStudent',
      targetId: studentId
    });
  };

  const executeModalAction = async () => {
    const { actionType, targetId } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setIsLoading(true);
    try {
      if (actionType === 'deleteEssay') {
        const res = await fetch(`/api/essays?id=${targetId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Deletion failed');
        toast.success('Submission successfully deleted');
      } else if (actionType === 'deleteStudent') {
        const res = await fetch(`/api/students?id=${targetId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Deletion failed');
        toast.success('Student account successfully removed');
      }
      await handleSyncData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
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
        body: JSON.stringify({ id: editingStudent.id, fullName: editName, groupName: editGroup }) 
      });
      if (!res.ok) throw new Error('Failed to update student settings');
      toast.success('Student profile updated');
      setEditingStudent(null);
      await handleSyncData();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getTaskLabel = (type: string) => { 
    if (type === 'task1') return 'Task 1'; 
    if (type === 'task2') return 'Task 2'; 
    return 'Both'; 
  };

  const getEssaysCountByGroup = (groupName: string) => {
    return essays.filter(e => {
      const g = e.group_name || '';
      if (groupName === 'all') return true;
      if (groupName === 'even') return g.toLowerCase().startsWith('even');
      if (groupName === 'odd') return g.toLowerCase().startsWith('odd');
      return g === groupName;
    }).length;
  };

  const filteredEssays = essays.filter(essay => {
    const matchesFilter = filter === 'all' || essay.status === filter;
    let topicText = essay.topic_text;
    try { const parsed = JSON.parse(topicText); topicText = parsed.task2?.text || parsed.task1?.text || topicText; } catch {}
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = topicText.toLowerCase().includes(searchLower) || (essay.full_name || '').toLowerCase().includes(searchLower);
    const matchesGroup = selectedGroup === 'all' || (selectedGroup === 'even' && (essay.group_name || '').toLowerCase().startsWith('even')) || (selectedGroup === 'odd' && (essay.group_name || '').toLowerCase().startsWith('odd')) || essay.group_name === selectedGroup;
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
      <div className="space-y-8 max-w-7xl mx-auto py-4 relative">
        <div className="luxury-grid-overlay opacity-20" />
        
        {/* Banner */}
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-500 block">Teacher Evaluation Panel</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Console Workspace</h1>
          </div>
          <button 
            onClick={handleSyncData} 
            disabled={isLoading}
            className="inline-flex cursor-pointer items-center justify-center px-5 py-2.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-white text-xs font-bold uppercase rounded-full tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            Sync Dashboard
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap border-b border-zinc-900 gap-2">
          <button 
            onClick={() => setViewTab('submissions')} 
            className={`flex items-center space-x-2 py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${viewTab === 'submissions' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span>Essays ({essays.length})</span>
          </button>
          <button 
            onClick={() => setViewTab('students')} 
            className={`flex items-center space-x-2 py-3 px-5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${viewTab === 'students' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            <Users className="w-4.5 h-4.5" />
            <span>Students Directory ({students.length})</span>
          </button>
        </div>

        {/* Group Filter */}
        <div className="p-6 bg-zinc-900/60 border border-zinc-850 rounded-2xl space-y-4">
          <span className="block text-xs uppercase tracking-widest font-bold text-zinc-400">Class Filter</span>
          <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto pr-2">
            {[
              { id: 'all', label: 'All Classes' },
              { id: 'even', label: 'Even Days' },
              { id: 'odd', label: 'Odd Days' },
              ...STUDENT_GROUPS.map(g => ({ id: g, label: g }))
            ].map((grp) => {
              const count = getEssaysCountByGroup(grp.id);
              return (
                <button 
                  type="button" 
                  key={grp.id} 
                  onClick={() => setSelectedGroup(grp.id)} 
                  className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer flex items-center gap-2.5 transition-all ${
                    selectedGroup === grp.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10' 
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{grp.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedGroup === grp.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {viewTab === 'submissions' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Total Submissions</div>
                <div className="text-2xl font-bold text-white font-mono">{totalSubmissions}</div>
              </div>
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Awaiting Assessment</div>
                <div className="text-2xl font-bold text-amber-500 font-mono">{pendingGradings}</div>
              </div>
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Reviewed</div>
                <div className="text-2xl font-bold text-green-500 font-mono">{completedGradings}</div>
              </div>
            </div>

            {/* Filters bar */}
            <div className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-2xl flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search submissions by prompt keyword or student name..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 font-medium" 
                />
              </div>
              <div className="flex bg-black p-0.5 rounded-full border border-zinc-800 gap-1 shrink-0 self-start">
                {[{ id: 'all', label: 'All Tasks' }, { id: 'pending', label: 'Unmarked' }, { id: 'reviewed', label: 'Reviewed' }].map((tab) => (
                  <button 
                    type="button" 
                    key={tab.id} 
                    onClick={() => setFilter(tab.id as any)} 
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase cursor-pointer ${filter === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
              {isLoading ? (
                <div className="p-20 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
              ) : error ? (
                <div className="p-12 text-center text-red-500"><AlertCircle className="w-8 h-8 mb-3 mx-auto" />{error}</div>
              ) : filteredEssays.length === 0 ? (
                <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-xs font-bold">No submissions logged</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-white">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4.5 text-left font-bold uppercase tracking-wider text-zinc-400">Date</th>
                        <th className="px-6 py-4.5 text-left font-bold uppercase tracking-wider text-zinc-400">Student Name</th>
                        <th className="px-6 py-4.5 text-left font-bold uppercase tracking-wider text-zinc-400">Task Form</th>
                        <th className="px-6 py-4.5 text-left font-bold uppercase tracking-wider text-zinc-400">Group Name</th>
                        <th className="px-6 py-4.5 text-left font-bold uppercase tracking-wider text-zinc-400">Status</th>
                        <th className="px-6 py-4.5 text-center font-bold uppercase tracking-wider text-zinc-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {filteredEssays.map((essay) => (
                        <tr key={essay.id} className="hover:bg-zinc-900/10">
                          <td className="px-6 py-4.5 text-zinc-400 font-mono">{format(new Date(essay.created_at), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4.5 font-bold text-white">{essay.full_name || 'Unknown student'}</td>
                          <td className="px-6 py-4.5 uppercase font-bold text-neutral-300">{getTaskLabel(essay.task_type)}</td>
                          <td className="px-6 py-4.5 text-zinc-400">{essay.group_name || 'No Group Assigned'}</td>
                          <td className="px-6 py-4.5">
                            {essay.status === 'reviewed' ? (
                              <span className={`px-3 py-1.5 rounded-full border text-[10px] tracking-wider uppercase font-extrabold ${getBandBadgeStyle(essay.overall_band)}`}>
                                {essay.overall_band ? `Band ${Number(essay.overall_band).toFixed(1)}` : 'Feedback Only'}
                              </span>
                            ) : (
                              <span className="text-amber-500 font-bold uppercase tracking-wider text-[10px] bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">Awaiting Evaluation</span>
                            )}
                          </td>
                          <td className="px-6 py-4.5 text-center space-x-2">
                            <Link href={`/teacher/review/${essay.id}`} className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded-full tracking-wider transition-all">Evaluate</Link>
                            <button onClick={() => openDeleteEssayConfirm(essay.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-all cursor-pointer"><Trash2 className="w-4.5 h-4.5" /></button>
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
            <div className="bg-zinc-900/30 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-zinc-850 bg-zinc-900/40 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h3 className="text-sm uppercase tracking-wider font-bold text-white">Student Roster</h3>
                <input 
                  type="text" 
                  placeholder="Filter student profiles..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full sm:w-72 px-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-700 font-medium" 
                />
              </div>
              {filteredStudentsGrouped.length === 0 ? (
                <div className="p-16 text-center text-zinc-500 uppercase tracking-widest text-xs font-bold">No students registered</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-white">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-zinc-400">Date Joined</th>
                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-zinc-400">Student Profile Name</th>
                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-zinc-400">Class Assignment</th>
                        <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-zinc-400">Total Submissions</th>
                        <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-zinc-400 font-mono">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {filteredStudentsGrouped.map((student) => (
                        <tr key={student.id} className="hover:bg-zinc-900/10">
                          <td className="px-6 py-4.5 text-zinc-400 font-mono">{format(new Date(student.created_at), 'MMM dd, yyyy')}</td>
                          <td className="px-6 py-4.5 font-bold text-white text-sm">{student.full_name}</td>
                          <td className="px-6 py-4.5 uppercase font-bold text-zinc-300">{student.group_name || 'No assignment'}</td>
                          <td className="px-6 py-4.5 text-zinc-400 font-mono font-bold text-sm">{student.essay_count}</td>
                          <td className="px-6 py-4.5 text-center space-x-2">
                            <button onClick={() => { setEditingStudent(student); setEditName(student.full_name); setEditGroup(student.group_name || STUDENT_GROUPS[0]); }} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-full font-bold uppercase tracking-wider transition-all cursor-pointer"><Edit2 className="w-3.5 h-3.5 inline mr-1" />Edit</button>
                            <button onClick={() => openDeleteStudentConfirm(student.id)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full font-bold uppercase tracking-wider transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Delete</button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <h3 className="text-sm uppercase tracking-wider font-bold text-white">Modify Profile Group</h3>
                <button onClick={() => setEditingStudent(null)} className="text-xs text-zinc-500 hover:text-white cursor-pointer">Close</button>
              </div>
              <form onSubmit={handleSaveStudentEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">FullName</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-700" required />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400">Group Name</label>
                  <select value={editGroup} onChange={e => setEditGroup(e.target.value)} className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-700 cursor-pointer">
                    {STUDENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={isSavingEdit} className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer">{isSavingEdit ? 'Saving...' : 'Save Settings'}</button>
              </form>
            </div>
          </div>
        )}

        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{confirmModal.description}</p>
              </div>
              <div className="flex gap-2.5 justify-end">
                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
                <button onClick={executeModalAction} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}