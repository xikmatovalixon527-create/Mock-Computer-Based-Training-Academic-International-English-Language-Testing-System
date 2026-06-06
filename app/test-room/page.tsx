'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatTime, countWords } from '@/lib/utils';
import { HelpCircle, Infinity, ChevronDown } from 'lucide-react';

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
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textsRef = useRef(texts);
  const configRef = useRef(config);

  useEffect(() => { textsRef.current = texts; }, [texts]);
  useEffect(() => { configRef.current = config; }, [config]);

  const handleForceSubmit = useCallback(async () => {
    setIsSubmitting(true);
    toast.loading('Submitting...');
    if (timerRef.current) clearTimeout(timerRef.current);
    const cfg = configRef.current;
    const curTexts = textsRef.current;
    const fTask1 = (cfg?.taskType === 'task1' || cfg?.taskType === 'both') ? curTexts[0] : null;
    const fTask2 = (cfg?.taskType === 'task2' || cfg?.taskType === 'both') ? curTexts[1] : null;

    try {
      const res = await fetch('/api/essays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task_type: cfg?.taskType, topic_text: cfg?.topicText, content_task1: fTask1, content_task2: fTask2 }) });
      if (!res.ok) throw new Error('Failed to submit');
      toast.dismiss(); toast.success('Test submitted!');
      sessionStorage.removeItem('ielts_test_config');
      localStorage.removeItem('ielts_test_config_backup');
      localStorage.removeItem(`ielts_draft_${cfg?.taskType}`);
      router.push('/student/dashboard');
    } catch {
      toast.dismiss(); toast.error('Submission failed.'); setIsSubmitting(false);
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

  if (!config || !topicData) return <div className="min-h-screen bg-[#050507]" />;

  const minWords = activeTab === 0 ? 150 : 250;
  const wordCount = countWords(texts[activeTab]);
  const currentTopic = activeTab === 0 ? topicData.task1 : topicData.task2;

  return (
    <div className="h-screen flex flex-col bg-[#050507] overflow-hidden text-[#F5F5F7] relative font-sans">
      <header className="shrink-0 bg-[#0B0B0E] border-b border-[var(--color-border)]/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase font-bold text-[var(--color-primary)]">IELTS Cockpit</span>
          {config.taskType === 'both' ? (
            <div className="flex bg-[#050507] rounded border border-[var(--color-border)]/50 p-0.5">
              <button onClick={() => setActiveTab(0)} className={`px-3 py-1.5 text-[10px] uppercase font-bold ${activeTab === 0 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-neutral-500'}`}>Task 1</button>
              <button onClick={() => setActiveTab(1)} className={`px-3 py-1.5 text-[10px] uppercase font-bold ${activeTab === 1 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-neutral-500'}`}>Task 2</button>
            </div>
          ) : <span className="text-[10px] text-[var(--color-primary)]">Task {config.taskType === 'task1' ? '1' : '2'}</span>}
        </div>
        {!config.noTimer && <div className="text-lg font-mono text-[var(--color-primary)]">{formatTime(timeLeft)}</div>}
      </header>
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className={`w-full lg:w-1/2 flex flex-col bg-[#08080B] lg:border-r border-[var(--color-border)]/60 ${showPrompt ? 'h-[40vh] lg:h-auto' : ''}`}>
          <div className="px-4 py-3 bg-[#0B0B0E] flex justify-between" onClick={() => { if (window.innerWidth < 1024) setShowPrompt(!showPrompt); }}>
            <span className="text-[10px] font-bold">Prompt Task {activeTab + 1}</span>
            <ChevronDown className={`lg:hidden w-4 h-4 ${showPrompt ? 'rotate-180' : ''}`} />
          </div>
          {showPrompt && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="p-5 bg-[#0B0B0E] border-l-2 border-[var(--color-primary)] rounded-r-lg"><p className="text-sm font-serif whitespace-pre-wrap">{currentTopic?.text}</p></div>
              {currentTopic?.image && <img src={currentTopic.image} alt="Diagram" onClick={() => setIsLightboxOpen(true)} className="max-h-[350px] mx-auto cursor-zoom-in rounded" />}
            </div>
          )}
        </div>
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 flex-1 relative bg-[#050507]">
          <textarea className="flex-1 w-full p-4 sm:p-6 text-xl bg-transparent resize-none focus:outline-none text-white font-sans" value={texts[activeTab]} onChange={e => handleTextChange(e.target.value)} disabled={isSubmitting} spellCheck={false} placeholder="Start typing..." />
          <div className="px-4 py-3 bg-[#0B0B0E] text-[10px] flex justify-between font-mono">
            <span className={wordCount < minWords ? 'text-[#E06C75]' : 'text-[var(--color-success)]'}>{wordCount} / {minWords} Words</span>
          </div>
        </div>
      </main>
      <footer className="shrink-0 border-t border-[var(--color-border)]/60 bg-[#0B0B0E] px-4 h-16 flex items-center justify-between">
        <span className="text-[10px]">Academic Module</span>
        <button onClick={() => { if(window.confirm('Submit?')) handleForceSubmit(); }} disabled={isSubmitting} className="bg-[var(--color-primary)] text-black px-6 py-2.5 text-[10px] font-extrabold uppercase rounded">{isSubmitting ? 'Sending...' : 'Submit'}</button>
      </footer>
      {isLightboxOpen && currentTopic?.image && (<div className="fixed inset-0 z-50 bg-black/98 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}><img src={currentTopic.image} alt="Zoom" className="max-w-full max-h-full object-contain rounded" /></div>)}
    </div>
  );
}