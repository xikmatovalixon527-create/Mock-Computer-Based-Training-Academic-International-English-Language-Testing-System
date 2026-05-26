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
      <div className="max-w-3xl mx-auto space-y-8 animate-luxury-fade">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.back()} className="touch-target p-2 rounded hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[#FFFFFF] transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-h1 uppercase tracking-widest text-[#F5F5F7]">Academic Console</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-tertiary)] mt-1">Standard IELTS timed writing test setup</p>
          </div>
        </div>

        <div className="smoked-glass border border-[var(--color-border)]/60 rounded-lg p-6 sm:p-8 shadow-2xl space-y-8 relative">
          <div className="absolute top-0 left-10 w-20 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent" />

          {/* Format Selection */}
          <div className="space-y-4">
            <label className="block text-xs uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">Chronometer Matrix (Select Format)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'task1', title: 'Task 1 Only', time: '20 min', min: '150 words' },
                { id: 'task2', title: 'Task 2 Only', time: '40 min', min: '250 words' },
                { id: 'both', title: 'Full Composite', time: '60 min', min: 'Both tasks' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTaskType(opt.id)}
                  className={`p-5 rounded border text-left transition-all duration-300 cursor-pointer ${
                    taskType === opt.id
                      ? 'border-[var(--color-primary)] bg-[#0B0B0E] shadow-[0_4px_30px_rgba(197,168,128,0.04)] ring-1 ring-[var(--color-primary)]/20'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[#0B0B0E]/30'
                  }`}
                >
                  <h3 className={`text-xs uppercase tracking-[0.15em] font-extrabold mb-3 flex items-center justify-between ${taskType === opt.id ? 'text-[var(--color-primary)]' : 'text-[#F5F5F7]'}`}>
                    <span>{opt.title}</span>
                    {taskType === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(197,168,128,0.8)]" />}
                  </h3>
                  <div className="space-y-2 text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold font-mono">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" /> {opt.time}</div>
                    <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-[var(--color-primary)]" /> {opt.min}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Task 1 */}
          {(taskType === 'task1' || taskType === 'both') && (
            <div className="space-y-4 p-5 sm:p-6 bg-[#0B0B0E] rounded border border-[var(--color-border)]/70">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--color-primary)]">Academic Task 1</h3>
                <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Descriptive Report</span>
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-[var(--color-text-tertiary)] mb-2.5">Visual Asset (Optional)</label>
                <div className="flex items-center gap-3">
                  {task1Img ? (
                    <>
                      <img src={task1Img} alt="" className="w-16 h-16 rounded object-cover border border-[var(--color-border)]" />
                      <button onClick={() => setTask1Img('')} className="text-[10px] uppercase font-bold tracking-widest text-[#E06C75] hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove Asset
                      </button>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[var(--color-border-strong)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] transition-all text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setTask1Img)} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-[var(--color-text-tertiary)] mb-2.5">Academic Prompt Details</label>
                <textarea
                  value={task1Text}
                  onChange={e => setTask1Text(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-[#050507] border border-[var(--color-border)] rounded text-xs leading-relaxed text-[#F5F5F7] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  placeholder="Summarise the information by selecting and reporting the main features..."
                />
              </div>
            </div>
          )}

          {/* Task 2 */}
          {(taskType === 'task2' || taskType === 'both') && (
            <div className="space-y-4 p-5 sm:p-6 bg-[#0B0B0E] rounded border border-[var(--color-border)]/70">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest font-bold text-[var(--color-primary)]">Academic Task 2</h3>
                <span className="text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase tracking-wider">Argumentative Essay</span>
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-[var(--color-text-tertiary)] mb-2.5">Visual Asset (Optional)</label>
                <div className="flex items-center gap-3">
                  {task2Img ? (
                    <>
                      <img src={task2Img} alt="" className="w-16 h-16 rounded object-cover border border-[var(--color-border)]" />
                      <button onClick={() => setTask2Img('')} className="text-[10px] uppercase font-bold tracking-widest text-[#E06C75] hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove Asset
                      </button>
                    </>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[var(--color-border-strong)] rounded cursor-pointer hover:bg-[var(--color-surface-hover)] transition-all text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider">
                      <Upload className="w-3.5 h-3.5 text-[var(--color-primary)]" /> Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload(setTask2Img)} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-[var(--color-text-tertiary)] mb-2.5">Academic Prompt Details</label>
                <textarea
                  value={task2Text}
                  onChange={e => setTask2Text(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-[#050507] border border-[var(--color-border)] rounded text-xs leading-relaxed text-[#F5F5F7] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  placeholder="Discuss both views and give your opinion..."
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-[var(--color-border)]/50">
            <button onClick={() => router.back()} className="touch-target px-6 py-2.5 border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:text-[#FFFFFF] hover:bg-[#111114] font-extrabold uppercase tracking-widest rounded cursor-pointer transition-colors">
              Cancel
            </button>
            <button onClick={handleStart} className="touch-target px-8 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-extrabold text-[#000000] text-xs uppercase tracking-[0.2em] rounded border border-[var(--color-primary)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-black/40 cursor-pointer">
              Start Exam <ArrowRight className="w-4 h-4 text-black stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </Navbar>
  );
}