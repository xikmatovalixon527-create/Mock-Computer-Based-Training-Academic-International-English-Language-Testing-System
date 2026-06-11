'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, BookOpen, Trash2, ArrowRight, ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';

export default function TestSetup() {
  const [taskType, setTaskType] = useState('task2');
  const [duration, setDuration] = useState(40); // default value matching Task 2
  const [task1Text, setTask1Text] = useState('');
  const [task1Images, setTask1Images] = useState<string[]>([]);
  const [task2Text, setTask2Text] = useState('');
  const [task2Images, setTask2Images] = useState<string[]>([]);
  const [isMock, setIsMock] = useState(true);
  const router = useRouter();

  // Reset duration to defaults when user switches formats
  const handleTaskTypeChange = (type: string) => {
    setTaskType(type);
    if (type === 'task1') {
      setDuration(20);
    } else if (type === 'task2') {
      setDuration(40);
    } else {
      setDuration(60);
    }
  };

  const handleStart = () => {
    if ((taskType === 'task1' || taskType === 'both') && !task1Text.trim()) {
      toast.error('Please enter the Task 1 prompt.');
      return;
    }
    if ((taskType === 'task2' || taskType === 'both') && !task2Text.trim()) {
      toast.error('Please enter the Task 2 prompt.');
      return;
    }
    sessionStorage.setItem('ielts_test_config', JSON.stringify({
      taskType,
      topicText: JSON.stringify({
        task1: { text: task1Text, images: task1Images },
        task2: { text: task2Text, images: task2Images },
        isMock
      }),
      mode: 'original',
      duration: duration // save custom duration
    }));
    router.push('/test-room');
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

  // Dynamic helper to return updated timer options
  const getDurationOptions = () => {
    if (taskType === 'task1') return [20, 30]; // Updated to 30 minutes
    if (taskType === 'task2') return [40, 60];
    return [60, 120];
  };

  return (
    <Navbar>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[#121214] border border-[#1f1f23] text-[#8a8a8e] hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-medium text-white uppercase tracking-wider">Exam Configuration</h1>
            <p className="text-xs text-[#8a8a8e] uppercase tracking-wider mt-0.5">Standard Academic IELTS timed writing test</p>
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
            <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Select Exam Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'task1', title: 'Task 1 Only', info: '20 or 30 min', min: '150 words' },
                { id: 'task2', title: 'Task 2 Only', info: '40 or 60 min', min: '250 words' },
                { id: 'both', title: 'Full Exam', info: '60 or 120 min', min: 'Both tasks' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleTaskTypeChange(opt.id)}
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
                  <div className="space-y-1 text-xs text-[#8a8a8e] font-semibold font-mono">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#8a8a8e]" /> {opt.info}</div>
                    <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-[#8a8a8e]" /> {opt.min}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Timer Selection Row */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Select Timer Duration</label>
            <div className="flex gap-3">
              {getDurationOptions().map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={`flex-1 py-3 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    duration === mins
                      ? 'border-white bg-black text-white'
                      : 'border-[#1f1f23] bg-[#121214] text-[#8a8a8e] hover:border-[#374151]'
                  }`}
                >
                  {mins} Minutes {mins === (taskType === 'task1' ? 20 : taskType === 'task2' ? 40 : 60) && (
                    <span className="text-[10px] text-[#6e6e73] lowercase font-normal italic ml-1">(default)</span>
                  )}
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
            <button onClick={handleStart} className="px-5 py-2.5 bg-white hover:bg-[#cfcfcf] text-black font-semibold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              Start Exam <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Navbar>
  );
}