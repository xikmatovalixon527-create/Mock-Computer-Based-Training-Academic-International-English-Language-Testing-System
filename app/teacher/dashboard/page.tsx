'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Search, RefreshCw, AlertCircle, Trash2, Users, Edit2, Settings, Key, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { Essay } from '@/types';
import { Navbar } from '@/components/navbar';
import { Leaderboard } from '@/components/leaderboard';
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
  const [viewTab, setViewTab] = useState<'submissions' | 'students' | 'control_panel'>('submissions');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Platform session & cleanup control states
  const [testsEnabled, setTestsEnabled] = useState(true);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);

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

  const fetchSettingsData = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setTestsEnabled(data.tests_enabled);
        setAccessCode(data.access_code);
        setCodeExpiresAt(data.code_expires_at);
      }
    } catch (err) {
      console.error('Settings fetch failed', err);
    }
  };

  const handleSyncData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [essaysList, studentsList] = await Promise.all([
        fetchEssaysData(),
        fetchStudentsData(),
        fetchSettingsData()
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
  }, []);

  const [timeLeftStr, setTimeLeftStr] = useState('');

  useEffect(() => {
    handleSyncData();
    fetch('/api/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUser(data.user); })
      .catch(() => {});
  }, [handleSyncData]);

  useEffect(() => {
    if (!codeExpiresAt) {
      setTimeLeftStr('');
      return;
    }
    const updateCountdown = () => {
      const now = new Date();
      const expires = new Date(codeExpiresAt);
      const diff = expires.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeftStr('Expired');
        setAccessCode(null);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s left`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [codeExpiresAt]);

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

  const handleToggleGlobalTesting = async (enabled: boolean) => {
    setIsUpdatingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tests_enabled: enabled })
      });
      if (!res.ok) throw new Error('Settings write failure');
      toast.success(enabled ? 'Global test taking active' : 'Global test taking disabled');
      await fetchSettingsData();
    } catch {
      toast.error('Failed to change global testing requirements');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleGenerateCode = async () => {
    setIsUpdatingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_code: true })
      });
      if (!res.ok) throw new Error('Generation failure');
      toast.success('Active lesson access code refreshed');
      await fetchSettingsData();
    } catch {
      toast.error('Failed to generate session code');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleRevokeCode = async () => {
    setIsUpdatingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoke_code: true })
      });
      if (!res.ok) throw new Error('Revocation failure');
      toast.success('Active lesson code cleared');
      await fetchSettingsData();
    } catch {
      toast.error('Failed to clear session code');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleDeepCleanup = async () => {
    setIsCleaningData(true);
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Cleanup api returned error state');
      const data = await res.json();
      toast.success(data.message || 'Database successfully wiped of practice essays!');
      await handleSyncData();
    } catch (err: any) {
      toast.error('Deep cleanup action failed');
    } finally {
      setIsCleaningData(false);
      setShowCleanupModal(false);
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
          <button 
            onClick={() => setViewTab('control_panel')} 
            className={`flex items-center space-x-2 py-2 px-4 text-xs font-semibold tracking-wider rounded-md cursor-pointer transition-all ${viewTab === 'control_panel' ? 'bg-[#121214] text-[#0071e3]' : 'text-[#8a8a8e] hover:text-white'}`}
          >
            <Settings className="w-4 h-4" />
            <span>Control Panel</span>
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

        {viewTab === 'control_panel' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Session Controls & Access Codes */}
              <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3] block">Safety & Monitoring</span>
                    <h2 className="text-base font-semibold text-white">Lesson Testing Session</h2>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 border border-[#1f1f23] px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-[#8a8a8e]">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#ff9f0a]" />
                    <span>Anti-Cheat Active</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Global TestTaking Toggle */}
                  <div className="flex items-center justify-between p-4 bg-black/20 border border-[#1f1f23] rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-white uppercase tracking-wider">Authorize Writing Submissions</p>
                      <p className="text-[10px] text-[#8a8a8e] leading-relaxed max-w-[200px]">Allow students to view and submit writing tests.</p>
                    </div>
                    
                    <button
                      onClick={() => handleToggleGlobalTesting(!testsEnabled)}
                      disabled={isUpdatingSettings}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        testsEnabled ? 'bg-[#30d158]' : 'bg-[#1f1f23]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          testsEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Access Code Settings Generator */}
                  <div className="p-4 bg-black/40 border border-[#1f1f23] rounded-xl space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-[#1f1f23]/60">
                      <div>
                        <p className="text-xs font-semibold text-white uppercase tracking-wider">Lesson Access Code</p>
                        <p className="text-[10px] text-[#8a8a8e] leading-relaxed">Students must enter this code to enter test room.</p>
                      </div>
                      <Key className="w-4 h-4 text-[#8a8a8e]" />
                    </div>

                    {accessCode ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="p-3 bg-black border border-[#1f1f23] rounded-lg tracking-widest text-center font-mono text-xl font-extrabold text-[#30d158] flex-1 mr-4">
                            {accessCode}
                          </div>
                          <div className="text-right space-y-1 shrink-0">
                            <span className="block text-[8px] font-mono uppercase font-bold tracking-widest text-[#8a8a8e]">Validity Remaining</span>
                            <span className="block text-xs font-mono font-bold text-[#ff9f0a]">{timeLeftStr || 'Calculating...'}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleGenerateCode}
                            disabled={isUpdatingSettings}
                            className="flex-1 py-1.5 border border-[#1f1f23] text-white hover:bg-[#121214] rounded-lg text-[9px] uppercase tracking-widest font-bold font-mono cursor-pointer transition-all disabled:opacity-50"
                          >
                            Regenerate Code
                          </button>
                          <button
                            onClick={handleRevokeCode}
                            disabled={isUpdatingSettings}
                            className="py-1.5 px-3 bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/25 hover:bg-[#ff453a]/20 hover:text-white rounded-lg text-[9px] uppercase tracking-widest font-bold font-mono cursor-pointer transition-all disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-4 bg-black border border-[#1f1f23] rounded-lg text-center">
                          <p className="text-[10px] font-bold text-[#8a8a8e] uppercase tracking-wider">No Active Session Code</p>
                          <p className="text-[9px] text-[#6e6e73] mt-1 leading-relaxed">If no code is generated, students may launch configurations unprompted.</p>
                        </div>
                        <button
                          onClick={handleGenerateCode}
                          disabled={isUpdatingSettings}
                          className="w-full py-2 bg-white text-black hover:bg-[#cfcfcf] rounded-full text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Force Generate Code
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Administrative Reset & Practice Wiping */}
              <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff453a] block">Administrative Reset</span>
                    <h2 className="text-base font-semibold text-white">Platform System Cleanup</h2>
                  </div>
                  <p className="text-xs text-[#8a8a8e] leading-relaxed">
                    Erase all client-submitted documents, mock folders, essays, drafts, teacher evaluation notes, comments, and banding reports. This performs a deep sweep of practice logs to clean the platform to its default, baseline initial condition. All user accounts (both student credentials and instructor credentials) will remain fully intact.
                  </p>
                </div>

                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-3">
                  <div className="flex items-start gap-2 text-xs text-red-500 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>This operation is completely irreversible and wipes all historical records.</span>
                  </div>
                  <button
                    onClick={() => setShowCleanupModal(true)}
                    className="w-full py-2.5 bg-[#ff453a] hover:bg-[#ff453a]/80 text-white font-bold text-[10px] uppercase tracking-widest rounded-full cursor-pointer transition-colors"
                  >
                    Clear Platform Practice Data
                  </button>
                </div>
              </div>
            </div>

            {/* Leaderboard Summary inside Instructor Control Panel */}
            <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1f1f23]">
                <Trophy className="w-4 h-4 text-[#ff9f0a]" />
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Live Student Leaderboard</h3>
              </div>
              <div className="max-w-4xl">
                <Leaderboard />
              </div>
            </div>
          </div>
        )}

        {showCleanupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-[#121214] border border-[#ff453a]/30 rounded-xl p-6 space-y-5 shadow-none text-center">
              <div className="w-12 h-12 rounded-full bg-[#ff453a]/10 border border-[#ff453a]/20 flex items-center justify-center text-[#ff453a] mx-auto animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Confirm Deep Cleanup?</h3>
                <p className="text-xs text-[#8a8a8e] leading-relaxed">
                  Are you entirely sure you want to permanently delete all submitted essays, drafts, evaluation ratings, and teacher feedback comments on this platform? All client and student accounts will be kept untouched.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleDeepCleanup}
                  disabled={isCleaningData}
                  className="w-full py-2.5 bg-[#ff453a] hover:bg-[#ff453a]/80 text-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                >
                  {isCleaningData ? 'Wiping Platform...' : 'Yes, Permanently Clear All'}
                </button>
                <button
                  onClick={() => setShowCleanupModal(false)}
                  disabled={isCleaningData}
                  className="w-full py-2 border border-[#1f1f23] text-[#8a8a8e] hover:text-white rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
              </div>
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