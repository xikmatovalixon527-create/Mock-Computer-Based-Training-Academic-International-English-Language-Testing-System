'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Search, RefreshCw, AlertCircle, Trash2, Users, Edit2 } from 'lucide-react';
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
  const [mockFilter, setMockFilter] = useState<'all' | 'mock' | 'practice'>('all');
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

  const getIsMock = (topic: string) => {
    try {
      const p = JSON.parse(topic);
      return p.isMock === true;
    } catch { return false; }
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
    let isMock = false;
    try { 
      const parsed = JSON.parse(topicText); 
      topicText = parsed.task2?.text || parsed.task1?.text || topicText; 
      isMock = parsed.isMock === true;
    } catch {}
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = topicText.toLowerCase().includes(searchLower) || (essay.full_name || '').toLowerCase().includes(searchLower);
    const matchesGroup = selectedGroup === 'all' || (selectedGroup === 'even' && (essay.group_name || '').toLowerCase().startsWith('even')) || (selectedGroup === 'odd' && (essay.group_name || '').toLowerCase().startsWith('odd')) || essay.group_name === selectedGroup;
    const matchesMock = mockFilter === 'all' || (mockFilter === 'mock' ? isMock : !isMock);

    return matchesFilter && matchesSearch && matchesGroup && matchesMock;
  });

  const filteredStudentsGrouped = students.filter(student => student.full_name.toLowerCase().includes(searchQuery.toLowerCase())).filter(student => {
    if (selectedGroup === 'all') return true;
    if (selectedGroup === 'even') return (student.group_name || '').toLowerCase().startsWith('even');
    if (selectedGroup === 'odd') return (student.group_name || '').toLowerCase().startsWith('odd');
    return student.group_name === selectedGroup;
  });

  return (
    <Navbar>
      <div className="space-y-6 max-w-7xl mx-auto relative">
        <div className="luxury-grid-overlay" />
        
        <div className="p-6 bg-[#121214] border border-[#1f1f23] rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0071e3] block">Teacher Evaluation Panel</span>
            <h1 className="text-xl font-medium text-white tracking-tight">Console Workspace</h1>
          </div>
          <button 
            onClick={handleSyncData} 
            disabled={isLoading}
            className="inline-flex cursor-pointer items-center justify-center px-4 py-2 border border-[#1f1f23] bg-black hover:bg-[#121214] text-white text-xs font-semibold rounded-full tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin text-[#0071e3]' : ''}`} />
            Sync Dashboard
          </button>
        </div>

        <div className="flex flex-wrap border-b border-[#1f1f23] gap-1 bg-black/40 p-1 rounded-lg">
          <button 
            onClick={() => setViewTab('submissions')} 
            className={`flex items-center space-x-2 py-2 px-4 text-xs font-semibold tracking-wider rounded-md cursor-pointer transition-all ${viewTab === 'submissions' ? 'bg-[#121214] text-[#0071e3]' : 'text-[#8a8a8e] hover:text-white'}`}
          >
            <FileText className="w-4 h-4" />
            <span>Essays ({essays.length})</span>
          </button>
          <button 
            onClick={() => setViewTab('students')} 
            className={`flex items-center space-x-2 py-2 px-4 text-xs font-semibold tracking-wider rounded-md cursor-pointer transition-all ${viewTab === 'students' ? 'bg-[#121214] text-[#0071e3]' : 'text-[#8a8a8e] hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({students.length})</span>
          </button>
        </div>

        <div className="p-5 bg-[#121214] border border-[#1f1f23] rounded-xl space-y-3">
          <span className="block text-[10px] uppercase tracking-widest font-bold text-[#8a8a8e]">Class Filter</span>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer flex items-center gap-2 transition-all ${
                    selectedGroup === grp.id 
                      ? 'bg-[#0071e3] text-white border-[#0071e3]' 
                      : 'bg-black border-[#1f1f23] hover:border-[#374151] text-[#8a8a8e] hover:text-white'
                  }`}
                >
                  <span>{grp.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${selectedGroup === grp.id ? 'bg-white/20 text-white' : 'bg-[#121214] text-[#6e6e73]'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {viewTab === 'submissions' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#121214] border border-[#1f1f23] rounded-xl">
                <div className="text-[10px] text-[#8a8a8e] uppercase tracking-widest font-bold mb-1">Total Submissions</div>
                <div className="text-xl font-medium text-white font-mono">{essays.length}</div>
              </div>
              <div className="p-4 bg-[#121214] border border-[#1f1f23] rounded-xl">
                <div className="text-[10px] text-[#8a8a8e] uppercase tracking-widest font-bold mb-1">Awaiting Assessment</div>
                <div className="text-xl font-medium text-[#ff9f0a] font-mono">{essays.filter(e => e.status !== 'reviewed').length}</div>
              </div>
              <div className="p-4 bg-[#121214] border border-[#1f1f23] rounded-xl">
                <div className="text-[10px] text-[#8a8a8e] uppercase tracking-widest font-bold mb-1">Reviewed</div>
                <div className="text-xl font-medium text-[#30d158] font-mono">{essays.filter(e => e.status === 'reviewed').length}</div>
              </div>
            </div>

            <div className="bg-[#121214] p-3 border border-[#1f1f23] rounded-xl flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search submissions by prompt or student..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full px-4 py-2 bg-black border border-[#1f1f23] rounded-lg text-xs text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0071e3] font-medium" 
                />
              </div>
              <div className="flex bg-black p-0.5 rounded-lg border border-[#1f1f23] gap-1">
                {[{ id: 'all', label: 'All Modes' }, { id: 'mock', label: 'Mock' }, { id: 'practice', label: 'Practice' }].map((tab) => (
                  <button 
                    type="button" 
                    key={tab.id} 
                    onClick={() => setMockFilter(tab.id as any)} 
                    className={`px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase cursor-pointer ${mockFilter === tab.id ? 'bg-[#121214] text-white' : 'text-[#8a8a8e] hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex bg-black p-0.5 rounded-lg border border-[#1f1f23] gap-1">
                {[{ id: 'all', label: 'All Status' }, { id: 'pending', label: 'Unmarked' }, { id: 'reviewed', label: 'Reviewed' }].map((tab) => (
                  <button 
                    type="button" 
                    key={tab.id} 
                    onClick={() => setFilter(tab.id as any)} 
                    className={`px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase cursor-pointer ${filter === tab.id ? 'bg-[#121214] text-white' : 'text-[#8a8a8e] hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#121214]/50 border border-[#1f1f23] rounded-xl overflow-hidden">
              {isLoading ? (
                <div className="p-16 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0071e3]" /></div>
              ) : error ? (
                <div className="p-12 text-center text-[#ff453a]"><AlertCircle className="w-6 h-6 mb-2 mx-auto" />{error}</div>
              ) : filteredEssays.length === 0 ? (
                <div className="p-12 text-center text-[#8a8a8e] uppercase tracking-widest text-[10px] font-bold">No submissions logged</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-white">
                    <thead className="bg-[#121214] border-b border-[#1f1f23]">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Date</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Student</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Mode</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Task</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Group</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Status</th>
                        <th className="px-5 py-3 text-center font-bold uppercase tracking-wider text-[#8a8a8e]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f23]">
                      {filteredEssays.map((essay) => (
                        <tr key={essay.id} className="hover:bg-[#121214]/30">
                          <td className="px-5 py-3.5 text-[#8a8a8e] font-mono">{format(new Date(essay.created_at), 'MMM dd, yyyy')}</td>
                          <td className="px-5 py-3.5 font-semibold text-white">{essay.full_name || 'Unknown'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getIsMock(essay.topic_text) ? 'bg-[#bf5af2]/15 text-[#bf5af2] border border-[#bf5af2]/30' : 'bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30'}`}>
                              {getIsMock(essay.topic_text) ? 'Mock' : 'Practice'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 uppercase text-[#8a8a8e]">{getTaskLabel(essay.task_type)}</td>
                          <td className="px-5 py-3.5 text-[#8a8a8e]">{essay.group_name || 'No Group'}</td>
                          <td className="px-5 py-3.5">
                            {essay.status === 'reviewed' ? (
                              <span className={`px-2.5 py-1 rounded-full border text-[9px] tracking-wider uppercase font-bold ${getBandBadgeStyle(essay.overall_band)}`}>
                                {essay.overall_band ? `Band ${Number(essay.overall_band).toFixed(1)}` : 'Feedback'}
                              </span>
                            ) : (
                              <span className="text-[#ff9f0a] font-bold uppercase tracking-wider text-[9px] bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 px-2.5 py-1 rounded-full">Awaiting Mark</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center space-x-2">
                            <Link href={`/teacher/review/${essay.id}`} className="inline-flex px-3 py-1.5 bg-[#0071e3] hover:bg-[#2997ff] text-white font-medium uppercase text-[10px] rounded-full transition-all">Evaluate</Link>
                            <button onClick={() => openDeleteEssayConfirm(essay.id)} className="p-1.5 text-[#8a8a8e] hover:text-[#ff453a] transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
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
          <div className="space-y-4">
            <div className="bg-[#121214]/50 border border-[#1f1f23] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#1f1f23] bg-[#121214] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Student Roster</h3>
                <input 
                  type="text" 
                  placeholder="Filter student profiles..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full sm:w-64 px-4 py-2 bg-black border border-[#1f1f23] rounded-lg text-xs text-white focus:outline-none focus:border-[#0071e3] font-medium" 
                />
              </div>
              {filteredStudentsGrouped.length === 0 ? (
                <div className="p-12 text-center text-[#8a8a8e] uppercase tracking-widest text-[10px] font-bold">No students registered</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-white">
                    <thead className="bg-[#121214] border-b border-[#1f1f23]">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Date Joined</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Name</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Class</th>
                        <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[#8a8a8e]">Essays</th>
                        <th className="px-5 py-3 text-center font-bold uppercase tracking-wider text-[#8a8a8e]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f23]">
                      {filteredStudentsGrouped.map((student) => (
                        <tr key={student.id} className="hover:bg-[#121214]/30">
                          <td className="px-5 py-3.5 text-[#8a8a8e] font-mono">{format(new Date(student.created_at), 'MMM dd, yyyy')}</td>
                          <td className="px-5 py-3.5 font-semibold text-white">{student.full_name}</td>
                          <td className="px-5 py-3.5 uppercase text-[#8a8a8e]">{student.group_name || 'No assignment'}</td>
                          <td className="px-5 py-3.5 text-[#8a8a8e] font-mono font-bold">{student.essay_count}</td>
                          <td className="px-5 py-3.5 text-center space-x-2">
                            <button onClick={() => { setEditingStudent(student); setEditName(student.full_name); setEditGroup(student.group_name || STUDENT_GROUPS[0]); }} className="px-3.5 py-1.5 bg-black hover:bg-[#121214] border border-[#1f1f23] text-white rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer"><Edit2 className="w-3.5 h-3.5 inline mr-1" />Edit</button>
                            <button onClick={() => openDeleteStudentConfirm(student.id)} className="px-3.5 py-1.5 bg-[#ff453a]/10 hover:bg-[#ff453a]/20 text-[#ff453a] rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5 inline mr-1" />Delete</button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#121214] border border-[#1f1f23] rounded-xl p-6 space-y-4 shadow-none">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f23]">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Modify Profile Group</h3>
                <button onClick={() => setEditingStudent(null)} className="text-xs text-[#8a8a8e] hover:text-white cursor-pointer">Close</button>
              </div>
              <form onSubmit={handleSaveStudentEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8a8a8e]">Full Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 bg-black border border-[#1f1f23] rounded-lg text-xs text-white focus:outline-none focus:border-[#0071e3]" required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8a8a8e]">Group Name</label>
                  <select value={editGroup} onChange={e => setEditGroup(e.target.value)} className="w-full px-3 py-2 bg-black border border-[#1f1f23] rounded-lg text-xs text-white focus:outline-none focus:border-[#0071e3] cursor-pointer">
                    {STUDENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={isSavingEdit} className="w-full py-2 bg-[#0071e3] hover:bg-[#2997ff] text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer">{isSavingEdit ? 'Saving...' : 'Save Settings'}</button>
              </form>
            </div>
          </div>
        )}

        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-xs bg-[#121214] border border-[#1f1f23] rounded-xl p-5 space-y-4 shadow-none">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white">{confirmModal.title}</h3>
                <p className="text-xs text-[#8a8a8e] leading-relaxed">{confirmModal.description}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-3.5 py-1.5 border border-[#1f1f23] text-[#8a8a8e] hover:text-white rounded-full text-[10px] uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
                <button onClick={executeModalAction} className="px-3.5 py-1.5 bg-[#ff453a] hover:bg-[#ff453a]/80 text-white rounded-full text-[10px] uppercase tracking-wider font-semibold cursor-pointer">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navbar>
  );
}