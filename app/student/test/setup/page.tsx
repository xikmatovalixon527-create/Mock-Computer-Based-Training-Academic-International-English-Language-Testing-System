'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, BookOpen, Trash2, ArrowRight, ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';

export default function TestSetup() {
  const [taskType, setTaskType] = useState('task2');
  const [task1Text, setTask1Text] = useState('');
  const [task1Img, setTask1Img] = useState('');
  const [task2Text, setTask2Text] = useState('');
  const [task2Img, setTask2Img] = useState('');
  const router = useRouter();

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
        task1: { text: task1Text, image: task1Img },
        task2: { text: task2Text, image: task2Img }
      }),
      mode: 'original'
    }));
    router.push('/test-room');
  };

  const handleImageUpload = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
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
            <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Select Exam Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'task1', title: 'Task 1 Only', time: '20 min', min: '150 words' },
                { id: 'task2', title: 'Task 2 Only', time: '40 min', min: '250 words' },
                { id: 'both', title: 'Full Exam', time: '60 min', min: 'Both tasks' }
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
                  <div className="space-y-1 text-xs text-[#8a8a8e] font-semibold font-mono">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#8a8a8e]" /> {opt.time}</div>
                    <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-[#8a8a8e]" /> {opt.min}</div>
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
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Diagram (Optional)</label>
                <div className="flex items-center gap-3">
                  {task1Img ? (
                    <>
                      <img src={task1Img} alt="" className="w-16 h-16 rounded object-cover border border-[#1f1f23]" />
                      <button onClick={() => setTask1Img('')} className="text-[10px] uppercase font-bold tracking-wider text-[#ff453a] hover:underline flex items-center gap-1 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#1f1f23] rounded-lg cursor-pointer hover:bg-black transition-all text-xs text-[#f5f5f7] font-medium uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5" /> Upload diagram
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setTask1Img)} />
                    </label>
                  )}
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
                <label className="block text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Image (Optional)</label>
                <div className="flex items-center gap-3">
                  {task2Img ? (
                    <>
                      <img src={task2Img} alt="" className="w-16 h-16 rounded object-cover border border-[#1f1f23]" />
                      <button onClick={() => setTask2Img('')} className="text-[10px] uppercase font-bold tracking-wider text-[#ff453a] hover:underline flex items-center gap-1 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-[#1f1f23] rounded-lg cursor-pointer hover:bg-black transition-all text-xs text-[#f5f5f7] font-medium uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5" /> Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setTask2Img)} />
                    </label>
                  )}
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