'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatTime, countWords } from '@/lib/utils';
import { Clock, HelpCircle, Save, Infinity, ChevronDown } from 'lucide-react';

interface TestConfig {
  taskType: string;
  topicText: string;
  mode: 'original' | 'customizable';
  noTimer?: boolean;
}

export default function ExamRoom() {
  const router = useRouter();
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Task 1, 1 = Task 2
  const [texts, setTexts] = useState<string[]>(['', '']); // [Task 1 Text, Task 2 Text]
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [topicData, setTopicData] = useState<{ task1: { text: string; image?: string }; task2: { text: string; image?: string } } | null>(null);
  
  const [showPrompt, setShowPrompt] = useState(true); 
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      const res = await fetch('/api/essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: cfg?.taskType,
          topic_text: cfg?.topicText,
          content_task1: fTask1,
          content_task2: fTask2,
        })
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast.dismiss();
      toast.success('Test submitted!');
      sessionStorage.removeItem('ielts_test_config');
      localStorage.removeItem('ielts_test_config_backup');
      localStorage.removeItem(`ielts_draft_${cfg?.taskType}`);
      router.push('/student/dashboard');
    } catch {
      toast.dismiss();
      toast.error('Submission failed. Progress saved locally.', { duration: 8000 });
      setIsSubmitting(false);
    }
  }, [router]);

  const hasLoadedDraft = useRef(false);

  useEffect(() => {
    let saved = sessionStorage.getItem('ielts_test_config');
    if (!saved) {
      saved = localStorage.getItem('ielts_test_config_backup');
    } else {
      localStorage.setItem('ielts_test_config_backup', saved);
    }
    if (!saved) {
      toast.error('No test config found.');
      router.push('/student/dashboard');
      return;
    }
    
    const parsed: TestConfig = JSON.parse(saved);
    setConfig(parsed);
    
    try {
      setTopicData(JSON.parse(parsed.topicText));
    } catch {
      setTopicData({ task1: { text: parsed.topicText }, task2: { text: parsed.topicText } });
    }

    if (parsed.taskType === 'task2') setActiveTab(1);

    // Initialize Timer (60 min for both, 20 for task 1, 40 for task 2)
    if (!parsed.noTimer) {
      const initialTime = parsed.taskType === 'task1' ? 20 * 60 : parsed.taskType === 'task2' ? 40 * 60 : 60 * 60;
      setTimeLeft(initialTime);
    }

    // Load Draft
    const draftStr = localStorage.getItem(`ielts_draft_${parsed.taskType}`);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.texts) {
          setTexts(draft.texts);
          textsRef.current = draft.texts;
        } else if (draft.allTexts) {
          setTexts(draft.allTexts);
          textsRef.current = draft.allTexts;
        }
      } catch (e) {}
    }
    hasLoadedDraft.current = true;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [router]);

  // Timer logic
  useEffect(() => {
    const cfg = configRef.current;
    if (!cfg || cfg.noTimer) return;
    
    if (timeLeft <= 0) {
      handleForceSubmit();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, handleForceSubmit]);

  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const lastSentTextsRef = useRef<[string | null, string | null]>([null, null]);
  const lastSentTabRef = useRef<number>(1);

  // Auto-save
  useEffect(() => {
    if (!config?.taskType) return;
    autoSaveRef.current = setInterval(async () => {
      if (!hasLoadedDraft.current) return;
      localStorage.setItem(`ielts_draft_${config.taskType}`, JSON.stringify({
        texts: textsRef.current
      }));
      setLastSaved(new Date());

      try {
        const curTexts = textsRef.current;
        const task1Val = (config.taskType === 'task1' || config.taskType === 'both') ? curTexts[0] : null;
        const task2Val = (config.taskType === 'task2' || config.taskType === 'both') ? curTexts[1] : null;
        const activeTabNum = activeTabRef.current === 0 ? 1 : 2;

        // Check if anything has actually changed to prevent redundant network spam
        const text1Changed = task1Val !== lastSentTextsRef.current[0];
        const text2Changed = task2Val !== lastSentTextsRef.current[1];
        const tabChanged = activeTabNum !== lastSentTabRef.current;

        if (!text1Changed && !text2Changed && !tabChanged) {
          // No changes, skip request
          return;
        }

        lastSentTextsRef.current = [task1Val, task2Val];
        lastSentTabRef.current = activeTabNum;

        await fetch('/api/test/live-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_type: config.taskType,
            topic_text: config.topicText,
            content_task1: task1Val,
            content_task2: task2Val,
            active_tab: activeTabNum
          })
        });
      } catch (err) {
        console.error('Failed to sync live monitor draft:', err);
      }
    }, 1000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [config?.taskType, config?.topicText]);

  const handleSubmitClick = () => {
    const wc1 = countWords(texts[0]);
    const wc2 = countWords(texts[1]);

    if (config?.taskType === 'both') {
      if (wc1 < 150 || wc2 < 250) {
        if (!window.confirm(`Task 1 has ${wc1}/150 words and Task 2 has ${wc2}/250 words. Are you sure you want to submit?`)) return;
      }
    } else {
      const min = config?.taskType === 'task1' ? 150 : 250;
      const wc = config?.taskType === 'task1' ? wc1 : wc2;
      if (wc < min) {
        if (!window.confirm(`Only ${wc} words (minimum ${min}). Submit anyway?`)) return;
      }
    }
    handleForceSubmit();
  };

  if (!config || !topicData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050507]">
        <p className="text-sm uppercase tracking-widest text-[var(--color-primary)]">Loading cockpit...</p>
      </div>
    );
  }

  const currentTaskNumber = activeTab === 0 ? 1 : 2;
  const minWords = currentTaskNumber === 1 ? 150 : 250;
  const wordCount = countWords(texts[activeTab]);
  const currentTopic = activeTab === 0 ? topicData.task1 : topicData.task2;

  return (
    <div className="h-screen flex flex-col bg-[#050507] overflow-hidden text-[#F5F5F7] animate-luxury-fade relative font-sans">
      <div className="luxury-bg-glow" />
      <div className="luxury-grid-overlay opacity-30" />

      {/* Header */}
      <header className="shrink-0 bg-[#0B0B0E] border-b border-[var(--color-border)]/60 safe-top z-10 relative">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--color-primary)]">IELTS Cockpit</span>
            
            {config.taskType === 'both' ? (
              <div className="flex items-center bg-[#050507] rounded p-0.5 border border-[var(--color-border)]/50">
                <button
                  type="button"
                  onClick={() => setActiveTab(0)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-sm transition-all cursor-pointer ${activeTab === 0 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'}`}
                >
                  Task 1
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(1)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-sm transition-all cursor-pointer ${activeTab === 1 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'}`}
                >
                  Task 2
                </button>
              </div>
            ) : (
              <span className="px-2.5 py-1 bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-[10px] uppercase tracking-widest font-mono font-bold rounded border border-[var(--color-primary)]/10">
                Writing Task {config.taskType === 'task1' ? '1' : '2'}
              </span>
            )}

            {config.mode === 'customizable' && (
              <span className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-[10px] uppercase tracking-widest font-mono font-bold rounded border border-[var(--color-primary)]/10">
                <Infinity className="w-3.5 h-3.5 text-[var(--color-primary)]" /> No Limit
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!config.noTimer && (
              <div className="text-right">
                <div className={`text-lg sm:text-l font-mono font-bold tracking-widest ${timeLeft < 300 ? 'text-[#E06C75]' : 'text-[var(--color-primary)]'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-mono">Chronometer</div>
              </div>
            )}
            {lastSaved && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-[var(--color-text-tertiary)]">
                <Save className="w-3.5 h-3.5 text-[var(--color-primary)]/80" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-0">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* Left Panel: Prompt */}
          <div className={`w-full lg:w-1/2 flex flex-col lg:border-r border-[var(--color-border)]/60 bg-[#08080B] transition-all duration-300 ${showPrompt ? 'h-[40vh] shrink-0 lg:h-auto lg:flex-1' : 'shrink-0 lg:flex-1'}`}>
            {/* Clickable Header for Mobile Devices */}
            <div 
              className="shrink-0 px-4 py-3 border-b border-[var(--color-border)]/50 bg-[#0B0B0E] flex items-center justify-between cursor-pointer lg:cursor-default"
              onClick={() => {
                if (window.innerWidth < 1024) setShowPrompt(!showPrompt);
              }}
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--color-primary)]/70" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#F5F5F7]">Academic Question Paper — Task {currentTaskNumber}</span>
              </div>
              <button 
                type="button" 
                className="lg:hidden p-1.5 hover:bg-[var(--color-surface-hover)] rounded transition-colors text-[var(--color-text-secondary)] cursor-pointer"
              >
                 <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showPrompt ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {/* Prompt Content */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 ${showPrompt ? 'block' : 'hidden lg:block'} space-y-4`}>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-mono">
                {config.noTimer 
                  ? 'Infinite chronometer activated. Focus on lexical variety.' 
                  : (config.taskType === 'both' ? `Suggested metric: Spend approximately ${currentTaskNumber === 1 ? '20' : '40'} minutes.` : `Suggested metric: Spend ${currentTaskNumber === 1 ? '20' : '40'} minutes.`)
                }
              </p>
              
              <div className="p-5 sm:p-6 bg-[#0B0B0E] border-l-2 border-[var(--color-primary)] rounded-r-lg shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--color-primary)]/5 to-transparent pointer-events-none" />
                <p className="text-xs sm:text-sm text-[#F5F5F7] whitespace-pre-wrap leading-relaxed font-serif">
                  {currentTopic?.text}
                </p>
              </div>

              {currentTopic?.image && (
                <div 
                  className="p-3 bg-[#050507] rounded border border-[var(--color-border)]/70 mt-4 relative group cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img 
                    src={currentTopic.image} 
                    alt="Prompt Diagram" 
                    className="max-h-[350px] w-full object-contain mx-auto rounded transition-all duration-300 group-hover:opacity-95" 
                  />
                  <div className="absolute bottom-4 right-4 bg-black/90 text-[9px] uppercase font-bold tracking-widest text-[var(--color-primary)] px-2.5 py-1 rounded border border-[var(--color-border)]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                     Expand Matrix
                  </div>
                </div>
              )}
              
              <p className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-tertiary)]">
                Required benchmark: Write at least <span className="font-bold text-white border-b border-[var(--color-primary)] pb-0.5">{minWords} words</span>.
              </p>
            </div>
          </div>

          {/* Right Panel: Writing Area */}
          <div className="w-full lg:w-1/2 flex flex-col min-h-0 flex-1 relative bg-[#050507]">
            <textarea
              className="flex-1 w-full p-4 sm:p-6 text-xl sm:text-2xl font-bold leading-relaxed bg-[#050507] resize-none focus:outline-none text-white placeholder-[var(--color-text-tertiary)] font-sans focus:bg-[#07070A] transition-colors min-h-[30vh] lg:min-h-0 tracking-wide"
              value={texts[activeTab]}
              onChange={e => {
                const val = e.target.value;
                setTexts(prev => {
                  const next = [...prev];
                  next[activeTab] = val;
                  return next;
                });
              }}
              placeholder={`Commence typing your Task ${currentTaskNumber} academic response here...`}
              disabled={isSubmitting}
              spellCheck={false}
            />
            {/* Status bar */}
            <div className="shrink-0 px-4 py-3 border-t border-[var(--color-border)]/60 bg-[#0B0B0E] flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-tertiary)]">
              <span className={`font-bold ${wordCount < minWords ? 'text-[#E06C75]' : 'text-[var(--color-success)]'}`}>
                {wordCount} / {minWords} Words Logged
              </span>
              {lastSaved && (
                <span className="hidden sm:flex items-center gap-1">
                  <Save className="w-3.5 h-3.5 text-[var(--color-primary)]/80" /> Sync {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-[var(--color-border)]/60 bg-[#0B0B0E] safe-bottom shadow-2xl relative z-10">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-bold">
            Academic Writing Module
          </span>
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="touch-target px-6 sm:px-8 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-extrabold text-[10px] uppercase tracking-[0.2em] rounded border border-[var(--color-primary)] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-black/40 cursor-pointer"
          >
            {isSubmitting ? 'Transmitting...' : 'End and Submit Exam'}
          </button>
        </div>
      </footer>

      {/* Lightbox Zoom Dialog Overlay */}
      {isLightboxOpen && currentTopic?.image && (
        <div 
          className="fixed inset-0 z-50 bg-black/98 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img 
              src={currentTopic.image} 
              alt="Prompt diagram expanded" 
              className="max-w-full max-h-full object-contain rounded select-none"
              onClick={(e) => e.stopPropagation()} 
            />
            <button 
              type="button"
              className="absolute top-4 right-4 bg-neutral-900/90 hover:bg-neutral-800 text-[10px] uppercase tracking-widest font-bold text-[#F5F5F7] px-4 py-2 rounded border border-neutral-800 transition-colors cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            >
              ✕ Close Paper
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
