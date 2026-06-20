// File: app/student/test/setup-customizable/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Trash2, ArrowRight, ArrowLeft, Upload, Infinity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';
import { AccessCodeModal } from '@/components/access-code-modal';

export default function CustomizableTestSetup() {
  const [taskType, setTaskType] = useState('task2');
  const [task1Text, setTask1Text] = useState('');
  const [task1Images, setTask1Images] = useState<string[]>([]);
  const [task2Text, setTask2Text] = useState('');
  const [task2Images, setTask2Images] = useState<string[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isCheckingSettings, setIsCheckingSettings] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    if ((taskType === 'task1' || taskType === 'both') && !task1Text.trim()) {
      toast.error('Please enter the Task 1 prompt.');
      return;
    }
    if ((taskType === 'task2' || taskType === 'both') && !task2Text.trim()) {
      toast.error('Please enter the Task 2 prompt.');
      return;
    }

    setIsCheckingSettings(true);
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();

      if (settings.tests_enabled === false) {
        toast.error('Practice sessions are currently disabled globally by the instructor.');
        setIsCheckingSettings(false);
        return;
      }

      if (settings.code_required === true) {
        setShowCodeModal(true);
        setIsCheckingSettings(false);
        return;
      }

      // Start testing immediately if code is not required
      proceedToTest();
    } catch (err) {
      toast.error('Syncing requirements with server failed, please retry.');
      setIsCheckingSettings(false);
    }
  };

  const proceedToTest = async () => {
    setIsCheckingSettings(true);
    try {
      const serializedConfig = JSON.stringify({
        mode: 'customizable',
        duration: null,
        isMock: isMock,
        noTimer: true,
        timerEndTime: null,
        task1: { text: task1Text, images: task1Images },
        task2: { text: task2Text, images: task2Images }
      });

      const response = await fetch('/api/essays/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: taskType,
          topic_text: serializedConfig,
          content_task1: '',
          content_task2: '',
          is_new: true
        })
      });

      if (!response.ok) {
        throw new Error('Could not create writing session on server');
      }

      router.push('/test-room');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start practice session. Please try again.');
    } finally {
      setIsCheckingSettings(false);
    }
  };

  const handleImageUpload = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setter(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Navbar>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[#121214] border border-[#1f1f23] text-[#8a8a8e] hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-medium text-white uppercase tracking-wider">Custom Practice Setup</h1>
            <p className="text-xs text-[#8a8a8e] uppercase tracking-wider mt-0.5">Untimed writing practice session</p>
          </div>
        </div>

        {/* Orange Classroom Reminder Banner */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-amber-500">Classroom Writing Only</h4>
            <p className="text-xs leading-relaxed text-[#f5f5f7]/80">
              Please write all essays only during class! Do not complete practice assignments from home without direct teacher instruction.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-[#121214]/40 border border-[#1f1f23] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <Infinity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-white">No Time Limit Mode</p>
            <p className="text-xs text-[#8a8a8e] mt-0.5">Write without a countdown. Perfect for focused drafting and structure refinement.</p>
          </div>
        </div>

        <div className="bg-[#121214] border border-[#1f1f23] rounded-xl p-5 sm:p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Test Mode</label>
            <div className="flex gap-3">
              <button onClick={() => setIsMock(true)} className={`flex-1 py-3 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${isMock ? 'border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]' : 'border-[#1f1f23] bg-[#121214] text-[#8a8a8e] hover:border-[#374151]'}`}>Mock Exam</button>
              <button onClick={() => setIsMock(false)} className={`flex-1 py-3 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${!isMock ? 'border-[#30d158] bg-[#30d158]/10 text-[#30d158]' : 'border-[#1f1f23] bg-[#121214] text-[#8a8a8e] hover:border-[#374151]'}`}>Practice (Unmock)</button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Select Practice Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'task1', title: 'Task 1 Only', min: '150 words' },
                { id: 'task2', title: 'Task 2 Only', min: '250 words' },
                { id: 'both', title: 'Both Tasks', min: '150 + 250 words' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTaskType(opt.id)}
                  className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    taskType === opt.id
                      ? 'border-white bg-black'
                      : 'border-[#1f1f23] hover:border-[#374151] bg-[#121214]'
                  }`}
                >
                  <h3 className="text-xs uppercase tracking-wider font-bold text-white mb-2 flex items-center justify-between">
                    <span>{opt.title}</span>
                    {taskType === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </h3>
                  <div className="text-[10px] text-[#8a8a8e] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> {opt.min}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(taskType === 'task1' || taskType === 'both') && (
            <div className="space-y-4 p-4 bg-black/40 rounded-lg border border-[#1f1f23]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Academic Task 1</h3>
                <span className="text-[10px] font-mono text-[#8a8a8e] uppercase tracking-wider">Report</span>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Diagrams (Optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  {task1Images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 rounded object-cover border border-[#1f1f23]" />
                      <button onClick={() => removeImage(setTask1Images, i)} className="absolute -top-2 -right-2 bg-[#ff453a] text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#1f1f23] rounded-lg cursor-pointer hover:bg-black transition-all text-xs text-[#f5f5f7] font-medium uppercase tracking-wider">
                    <Upload className="w-3.5 h-3.5" /> Add photo(s)
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload(setTask1Images)} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Prompt Details</label>
                <textarea
                  value={task1Text}
                  onChange={e => setTask1Text(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-black border border-[#1f1f23] rounded-lg text-sm leading-relaxed text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0071e3] resize-none"
                  placeholder="Paste or write Task 1 prompt here..."
                />
              </div>
            </div>
          )}

          {(taskType === 'task2' || taskType === 'both') && (
            <div className="space-y-4 p-4 bg-black/40 rounded-lg border border-[#1f1f23]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Academic Task 2</h3>
                <span className="text-[10px] font-mono text-[#8a8a8e] uppercase tracking-wider">Essay</span>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Images (Optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  {task2Images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 rounded object-cover border border-[#1f1f23]" />
                      <button onClick={() => removeImage(setTask2Images, i)} className="absolute -top-2 -right-2 bg-[#ff453a] text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#1f1f23] rounded-lg cursor-pointer hover:bg-black transition-all text-xs text-[#f5f5f7] font-medium uppercase tracking-wider">
                    <Upload className="w-3.5 h-3.5" /> Add photo(s)
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload(setTask2Images)} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Prompt Details</label>
                <textarea
                  value={task2Text}
                  onChange={e => setTask2Text(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-black border border-[#1f1f23] rounded-lg text-sm leading-relaxed text-white placeholder-[#6e6e73] focus:outline-none focus:border-[#0071e3] resize-none"
                  placeholder="Paste or write Task 2 prompt here..."
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-[#1f1f23]">
            <button onClick={() => router.back()} className="px-4 py-2 border border-[#1f1f23] text-[#8a8a8e] hover:text-white hover:bg-black font-semibold text-xs uppercase tracking-wider rounded-full cursor-pointer transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleStart} 
              disabled={isCheckingSettings}
              className="px-5 py-2.5 bg-white hover:bg-[#cfcfcf] text-black font-semibold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCheckingSettings ? 'Configuring...' : 'Start Practice'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <AccessCodeModal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} onSuccess={proceedToTest} />
    </Navbar>
  );
}