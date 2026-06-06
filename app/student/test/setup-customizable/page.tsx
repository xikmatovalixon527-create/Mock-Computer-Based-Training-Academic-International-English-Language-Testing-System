'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Trash2, ArrowRight, ArrowLeft, Upload, Infinity } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/navbar';

export default function CustomizableTestSetup() {
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
      mode: 'customizable',
      noTimer: true
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wider">Custom Practice Setup</h1>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mt-0.5">Untimed writing practice session</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 bg-neutral-900/40 border border-neutral-900 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Infinity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-white">No Time Limit Mode</p>
            <p className="text-xs text-neutral-400 mt-0.5">Write without a countdown. Perfect for focused drafting and structure refinement.</p>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-400">Select Practice Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'task1', title: 'Task 1 Only', min: '150 words' },
                { id: 'task2', title: 'Task 2 Only', min: '250 words' },
                { id: 'both', title: 'Both Tasks', min: '150 + 250 words' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTaskType(opt.id)}
                  className={`p-4 rounded border text-left transition-all cursor-pointer ${
                    taskType === opt.id
                      ? 'border-white bg-neutral-900'
                      : 'border-neutral-900 hover:border-neutral-800 bg-neutral-950'
                  }`}
                >
                  <h3 className="text-xs uppercase tracking-wider font-bold text-white mb-2 flex items-center justify-between">
                    <span>{opt.title}</span>
                    {taskType === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                  </h3>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> {opt.min}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(taskType === 'task1' || taskType === 'both') && (
            <div className="space-y-4 p-5 bg-neutral-900/40 rounded border border-neutral-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Academic Task 1</h3>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Report</span>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-400">Diagram (Optional)</label>
                <div className="flex items-center gap-3">
                  {task1Img ? (
                    <>
                      <img src={task1Img} alt="" className="w-16 h-16 rounded object-cover border border-neutral-800" />
                      <button onClick={() => setTask1Img('')} className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:underline flex items-center gap-1 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Remove image
                      </button>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-neutral-800 rounded cursor-pointer hover:bg-neutral-900 transition-all text-xs text-neutral-300 font-medium uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5" /> Upload diagram
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setTask1Img)} />
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-400">Prompt Details</label>
                <textarea
                  value={task1Text}
                  onChange={e => setTask1Text(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-black border border-neutral-900 rounded text-sm leading-relaxed text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
                  placeholder="Paste or write Task 1 prompt here..."
                />
              </div>
            </div>
          )}

          {(taskType === 'task2' || taskType === 'both') && (
            <div className="space-y-4 p-5 bg-neutral-900/40 rounded border border-neutral-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-white">Academic Task 2</h3>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Essay</span>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-400">Image (Optional)</label>
                <div className="flex items-center gap-3">
                  {task2Img ? (
                    <>
                      <img src={task2Img} alt="" className="w-16 h-16 rounded object-cover border border-neutral-800" />
                      <button onClick={() => setTask2Img('')} className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:underline flex items-center gap-1 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Remove image
                      </button>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-neutral-800 rounded cursor-pointer hover:bg-neutral-900 transition-all text-xs text-neutral-300 font-medium uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5" /> Upload image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setTask2Img)} />
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-400">Prompt Details</label>
                <textarea
                  value={task2Text}
                  onChange={e => setTask2Text(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-black border border-neutral-900 rounded text-sm leading-relaxed text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
                  placeholder="Paste or write Task 2 prompt here..."
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-neutral-900">
            <button onClick={() => router.back()} className="px-5 py-2 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 font-semibold text-xs uppercase tracking-wider rounded cursor-pointer transition-colors">
              Cancel
            </button>
            <button onClick={handleStart} className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 cursor-pointer">
              Start Practice <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Navbar>
  );
}