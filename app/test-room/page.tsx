'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatTime, countWords } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface TestConfig { taskType: string; topicText: string; mode: 'original' | 'customizable'; noTimer?: boolean; isMock?: boolean; }

export default function ExamRoom() {
  const router = useRouter();
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [texts, setTexts] = useState<string[]>(['', '']);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topicData, setTopicData] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(true); 
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
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
    <div className="h-screen flex flex-col bg-black overflow-hidden text-white relative font-sans">
      <header className="shrink-0 bg-[#121214] border-b border-[#1f1f23] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest font-bold text-[#8a8a8e]">Exam Cockpit</span>
          {config.taskType === 'both' ? (
            <div className="flex bg-black rounded-full border border-[#1f1f23] p-1">
              <button onClick={() => setActiveTab(0)} className={`px-4 py-1.5 text-xs uppercase font-bold rounded-full cursor-pointer transition-all ${activeTab === 0 ? 'bg-[#121214] text-white' : 'text-[#8a8a8e]'}`}>Task 1</button>
              <button onClick={() => setActiveTab(1)} className={`px-4 py-1.5 text-xs uppercase font-bold rounded-full cursor-pointer transition-all ${activeTab === 1 ? 'bg-[#121214] text-white' : 'text-[#8a8a8e]'}`}>Task 2</button>
            </div>
          ) : <span className="text-xs font-bold uppercase tracking-wider text-[#0071e3]">Task {config.taskType === 'task1' ? '1' : '2'}</span>}
        </div>
        {!config.noTimer && <div className="text-sm font-bold font-mono text-[#0071e3] bg-black px-4 py-1.5 border border-[#1f1f23] rounded-full">{formatTime(timeLeft)}</div>}
      </header>
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className={`w-full lg:w-1/2 flex flex-col bg-[#121214]/50 lg:border-r border-[#1f1f23] ${showPrompt ? 'h-[40vh] lg:h-auto' : ''}`}>
          <div className="px-4 py-3 bg-[#121214] flex justify-between" onClick={() => { if (window.innerWidth < 1024) setShowPrompt(!showPrompt); }}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8a8e]">Prompt Instructions</span>
            <ChevronDown className={`lg:hidden w-4 h-4 ${showPrompt ? 'rotate-180' : ''}`} />
          </div>
          {showPrompt && (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <div className="p-6 bg-black border border-[#1f1f23] rounded-xl"><p className="text-base sm:text-lg leading-relaxed text-[#f5f5f7] whitespace-pre-wrap">{currentTopic?.text}</p></div>
              
              {currentTopic?.images?.length > 0 ? (
                <div className="flex flex-col gap-4 mt-4">
                  {currentTopic.images.map((img: string, i: number) => (
                    <img key={i} src={img} alt={`Diagram ${i+1}`} onClick={() => setLightboxImg(img)} className="max-h-[350px] mx-auto cursor-zoom-in rounded border border-[#1f1f23]" />
                  ))}
                </div>
              ) : currentTopic?.image ? (
                <img src={currentTopic.image} alt="Expanded prompt diagram" onClick={() => setLightboxImg(currentTopic.image)} className="max-h-[350px] mx-auto cursor-zoom-in rounded border border-[#1f1f23] mt-4" />
              ) : null}
            </div>
          )}
        </div>
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 flex-1 relative bg-black">
          <textarea className="flex-1 w-full p-6 sm:p-8 text-lg bg-transparent resize-none focus:outline-none text-white font-sans leading-relaxed selection:bg-[#0071e3]/20" value={texts[activeTab]} onChange={e => handleTextChange(e.target.value)} disabled={isSubmitting} spellCheck={false} placeholder="Start typing your response document here..." />
          <div className="px-6 py-4 bg-[#121214] text-xs flex justify-between font-mono border-t border-[#1f1f23]">
            <span className={wordCount < minWords ? 'text-[#ff9f0a]' : 'text-[#30d158]'}>{wordCount} / {minWords} Words</span>
          </div>
        </div>
      </main>
      <footer className="shrink-0 border-t border-[#1f1f23] bg-[#121214] px-6 h-16 flex items-center justify-between">
        <span className="text-xs uppercase font-bold tracking-widest text-[#8a8a8e]">IELTS Academic Module Practice</span>
        <button onClick={() => setIsConfirmOpen(true)} disabled={isSubmitting} className="bg-white hover:bg-[#cfcfcf] text-black px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full cursor-pointer transition-colors">Submit Evaluation</button>
      </footer>
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Expanded diagram" className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#121214] border border-[#1f1f23] rounded-xl p-5 space-y-4 shadow-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Confirm Final Submission</h3>
            <p className="text-xs text-[#8a8a8e] leading-relaxed">Please make sure you have fully checked all criterion points and spelling elements. You cannot modify your answers after final submission.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsConfirmOpen(false)} className="px-3.5 py-1.5 border border-[#1f1f23] text-[#8a8a8e] hover:text-white rounded-full text-[10px] uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
              <button onClick={handleForceSubmit} className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#2997ff] text-white rounded-full text-[10px] uppercase tracking-wider font-semibold cursor-pointer">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}