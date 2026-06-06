'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatTime, countWords } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface TestConfig { taskType: string; topicText: string; mode: 'original' | 'customizable'; noTimer?: boolean; }

export default function ExamRoom() {
  const router = useRouter();
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [texts, setTexts] = useState<string[]>(['', '']);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topicData, setTopicData] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(true); 
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textsRef = useRef(texts);
  const configRef = useRef(config);

  useEffect(() => { textsRef.current = texts; }, [texts]);
  useEffect(() => { configRef.current = config; }, [config]);

  const handleForceSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setIsConfirmOpen(false);
    toast.loading('Submitting practice exam documents...');
    if (timerRef.current) clearTimeout(timerRef.current);
    const cfg = configRef.current;
    const curTexts = textsRef.current;
    const fTask1 = (cfg?.taskType === 'task1' || cfg?.taskType === 'both') ? curTexts[0] : null;
    const fTask2 = (cfg?.taskType === 'task2' || cfg?.taskType === 'both') ? curTexts[1] : null;

    try {
      const res = await fetch('/api/essays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_type: cfg?.taskType, topic_text: cfg?.topicText, content_task1: fTask1, content_task2: fTask2 }) });
      if (!res.ok) throw new Error('Submission failed');
      toast.dismiss(); 
      toast.success('Exam session uploaded successfully!');
      sessionStorage.removeItem('ielts_test_config');
      localStorage.removeItem('ielts_test_config_backup');
      localStorage.removeItem(`ielts_draft_${cfg?.taskType}`);
      router.push('/student/dashboard');
    } catch {
      toast.dismiss(); 
      toast.error('Submission failed. Please check your parameters.');
      setIsSubmitting(false);
    }
  }, [router]);

  useEffect(() => {
    let saved = sessionStorage.getItem('ielts_test_config') || localStorage.getItem('ielts_test_config_backup');
    if (!saved) { router.push('/student/dashboard'); return; }
    localStorage.setItem('ielts_test_config_backup', saved);
    const parsed: TestConfig = JSON.parse(saved);
    setConfig(parsed);
    try { setTopicData(JSON.parse(parsed.topicText)); } catch { setTopicData({ task1: { text: parsed.topicText }, task2: { text: parsed.topicText } }); }
    if (parsed.taskType === 'task2') setActiveTab(1);
    if (!parsed.noTimer) setTimeLeft(parsed.taskType === 'task1' ? 20 * 60 : parsed.taskType === 'task2' ? 40 * 60 : 60 * 60);

    const draftStr = localStorage.getItem(`ielts_draft_${parsed.taskType}`);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.texts) setTexts(draft.texts);
      } catch {}
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [router]);

  useEffect(() => {
    if (!config || config.noTimer || timeLeft <= 0) { if(timeLeft <= 0 && config && !config.noTimer) handleForceSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, config, handleForceSubmit]);

  const handleTextChange = (val: string) => {
    setTexts(prev => {
      const next = [...prev]; 
      next[activeTab] = val;
      if (config?.taskType) localStorage.setItem(`ielts_draft_${config.taskType}`, JSON.stringify({ texts: next }));
      return next;
    });
  };

  if (!config || !topicData) return <div className="min-h-screen bg-black" />;

  const minWords = activeTab === 0 ? 150 : 250;
  const wordCount = countWords(texts[activeTab]);
  const currentTopic = activeTab === 0 ? topicData.task1 : topicData.task2;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden text-white relative font-sans">
      <header className="shrink-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest font-bold text-zinc-400">Exam Cockpit</span>
          {config.taskType === 'both' ? (
            <div className="flex bg-black rounded-full border border-zinc-850 p-1">
              <button onClick={() => setActiveTab(0)} className={`px-4 py-1.5 text-xs uppercase font-bold rounded-full cursor-pointer transition-all ${activeTab === 0 ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Task 1</button>
              <button onClick={() => setActiveTab(1)} className={`px-4 py-1.5 text-xs uppercase font-bold rounded-full cursor-pointer transition-all ${activeTab === 1 ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>Task 2</button>
            </div>
          ) : <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Task {config.taskType === 'task1' ? '1' : '2'}</span>}
        </div>
        {!config.noTimer && <div className="text-lg font-bold font-mono text-blue-500 bg-black px-4 py-2 border border-zinc-800 rounded-full">{formatTime(timeLeft)}</div>}
      </header>
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className={`w-full lg:w-1/2 flex flex-col bg-zinc-900/60 lg:border-r border-zinc-850 ${showPrompt ? 'h-[40vh] lg:h-auto' : ''}`}>
          <div className="px-4 py-3 bg-zinc-900 flex justify-between" onClick={() => { if (window.innerWidth < 1024) setShowPrompt(!showPrompt); }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Prompt Instructions</span>
            <ChevronDown className={`lg:hidden w-4 h-4 ${showPrompt ? 'rotate-180' : ''}`} />
          </div>
          {showPrompt && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl"><p className="text-base sm:text-lg leading-relaxed text-zinc-200 whitespace-pre-wrap">{currentTopic?.text}</p></div>
              {currentTopic?.image && <img src={currentTopic.image} alt="Expanded prompt diagram" onClick={() => setIsLightboxOpen(true)} className="max-h-[350px] mx-auto cursor-zoom-in rounded border border-zinc-850" />}
            </div>
          )}
        </div>
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 flex-1 relative bg-black">
          <textarea className="flex-1 w-full p-6 sm:p-8 text-xl bg-transparent resize-none focus:outline-none text-white font-sans leading-relaxed selection:bg-blue-600/30" value={texts[activeTab]} onChange={e => handleTextChange(e.target.value)} disabled={isSubmitting} spellCheck={false} placeholder="Start typing your response document here..." />
          <div className="px-6 py-4 bg-zinc-950 text-xs flex justify-between font-mono border-t border-zinc-900">
            <span className={wordCount < minWords ? 'text-amber-500' : 'text-green-500'}>{wordCount} / {minWords} Words</span>
          </div>
        </div>
      </main>
      <footer className="shrink-0 border-t border-zinc-900 bg-zinc-950 px-6 h-20 flex items-center justify-between">
        <span className="text-xs uppercase font-bold tracking-widest text-zinc-500">IELTS Academic Module Practice</span>
        <button onClick={() => setIsConfirmOpen(true)} disabled={isSubmitting} className="bg-white hover:bg-zinc-200 text-black px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer active:scale-95 transition-all">Submit Evaluation</button>
      </footer>
      {isLightboxOpen && currentTopic?.image && (<div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}><img src={currentTopic.image} alt="Expanded diagram" className="max-w-full max-h-full object-contain rounded" /></div>)}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Confirm Final Submission</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Please make sure you have fully checked all criterion points and spelling elements. You cannot modify your answers after final submission.</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setIsConfirmOpen(false)} className="px-4 py-2 border border-zinc-800 text-neutral-400 hover:text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
              <button onClick={handleForceSubmit} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}