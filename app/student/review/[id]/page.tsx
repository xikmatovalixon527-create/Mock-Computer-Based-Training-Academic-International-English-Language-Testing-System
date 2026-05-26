'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Clock, MessageSquare, Award, Star } from 'lucide-react';
import { Essay } from '@/types';
import { getBandBadgeStyle, getBandTextColor } from '@/lib/utils';

function renderHighlightedText(
  text: string, 
  comments: any[], 
  taskIndex: number,
  focusedCommentIndex: number | null,
  setFocusedCommentIndex: (idx: number | null) => void
) {
  if (!text) return <p className="whitespace-pre-wrap leading-relaxed font-sans text-xl sm:text-2xl font-bold text-white">{text}</p>;
  if (!comments || comments.length === 0) return <p className="whitespace-pre-wrap leading-relaxed font-sans text-xl sm:text-2xl font-bold text-white tracking-wide">{text}</p>;
  
  const relevantCommentsWithIndex = (comments || [])
    .map((c, originalIndex) => ({ ...c, originalIndex }))
    .filter(c => c.task_number === taskIndex + 1);
    
  // 1. Align comment indices dynamically if the substring has shifted or changed
  const alignedComments = relevantCommentsWithIndex.map(c => {
    // If indices are perfectly valid and match the expected text, use them directly
    if (
      c.start_index >= 0 && 
      c.end_index <= text.length && 
      c.start_index < c.end_index &&
      text.substring(c.start_index, c.end_index) === c.selected_text
    ) {
      return c;
    }
    
    // Otherwise, try to find the selected_text in the main body text (case-sensitive)
    if (c.selected_text && c.selected_text.trim()) {
      const idx = text.indexOf(c.selected_text);
      if (idx !== -1) {
        return {
          ...c,
          start_index: idx,
          end_index: idx + c.selected_text.length
        };
      }
    }
    
    // Mark as invalid if clean text chunk can't be mapped
    return {
      ...c,
      invalid: true
    };
  }).filter(c => !c.invalid && c.start_index >= 0 && c.end_index <= text.length && c.start_index < c.end_index);

  // 2. Resolve duplicates and overlapping annotations
  const nonOverlappingComments: typeof alignedComments = [];
  let currentLast = 0;
  
  const sortedAligned = [...alignedComments].sort((a, b) => a.start_index - b.start_index);
  
  sortedAligned.forEach(c => {
    if (c.start_index >= currentLast) {
      nonOverlappingComments.push(c);
      currentLast = c.end_index;
    }
  });

  // 3. Render spans cleanly without trailing/empty capsules
  let lastIndex = 0;
  const elements = [];
  
  nonOverlappingComments.forEach((c, i) => {
    if (c.start_index > lastIndex) {
      elements.push(<span key={`text-${i}`}>{text.substring(lastIndex, c.start_index)}</span>);
    }
    const isFocused = focusedCommentIndex === c.originalIndex;
    elements.push(
      <span 
        key={`mark-${i}`} 
        onClick={() => setFocusedCommentIndex(isFocused ? null : c.originalIndex)}
        className={`relative transition-all duration-200 cursor-pointer inline px-1.5 py-0.5 rounded-sm border-b-2 border-dashed ${
          isFocused 
            ? 'bg-[#D4AF37] text-black font-extrabold border-solid scale-105 shadow-md ring-2 ring-[#D4AF37]' 
            : 'bg-[#D4AF37]/15 text-[#FFEAA7] border-[#D4AF37] hover:bg-[#D4AF37]/35'
        }`}
      >
        {text.substring(c.start_index, c.end_index)}
      </span>
    );
    lastIndex = c.end_index;
  });

  if (lastIndex < text.length) {
    elements.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
  }
  
  return <div className="whitespace-pre-wrap leading-relaxed tracking-wide font-sans text-xl sm:text-2xl font-bold text-white select-text">{elements}</div>;
}

export default function StudentReviewResult() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [essay, setEssay] = useState<Essay | null>(null);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topicData, setTopicData] = useState<any>(null);
  const [activeTaskTab, setActiveTaskTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [focusedCommentIndex, setFocusedCommentIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/essays?id=${id}`).then(res => {
        if (!res.ok) throw new Error('Failed to load essay');
        return res.json();
      }),
      fetch(`/api/reviews?essay_id=${id}`).then(res => {
        if (!res.ok) throw new Error('Failed to load review');
        return res.json();
      })
    ]).then(([essayData, reviewData]) => {
      if (essayData.essay) {
        setEssay(essayData.essay);
        try {
          setTopicData(JSON.parse(essayData.essay.topic_text));
        } catch (e) {
          setTopicData({ task1: { text: essayData.essay.topic_text }, task2: { text: essayData.essay.topic_text } });
        }
        if (essayData.essay.task_type === 'task2') setActiveTaskTab(1);
      }
      if (reviewData.review) setReview(reviewData.review);
      setLoading(false);
    }).catch(err => {
      setError(err.message || 'An error occurred while loading feedback');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-t-2 border-[var(--color-primary)] animate-spin mx-auto" />
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-primary)]">Retrieving appraisal profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050507] p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold tracking-widest uppercase text-red-400 mb-2">Error Retrieving Appraisal</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => router.push('/student/dashboard')} 
          className="px-5 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[#D4AF37] text-black font-bold text-xs uppercase tracking-widest rounded-lg flex items-center transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Dashboard Flightdeck
        </button>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-center">
        <p className="text-sm text-red-400 uppercase tracking-widest font-mono">Appraisal Ledger Entry Not Found</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-[#050507] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] mb-6 border border-[#D4AF37]/35 animate-pulse">
          <Clock className="w-7 h-7" />
        </div>
        <h3 className="text-md font-bold text-[#F5F5F7] uppercase tracking-wider mb-2">Evaluation is Pending</h3>
        <p className="text-xs text-[var(--color-text-tertiary)] max-w-md mb-6 leading-relaxed">
          The certified academic assessor has received your prompt transcript and has not yet published the finalized grading index.
        </p>
        <button 
          onClick={() => router.back()} 
          className="text-xs uppercase tracking-widest font-bold text-[var(--color-primary)] border-b border-[var(--color-primary)] pb-0.5 hover:brightness-115 transition-all cursor-pointer"
        >
          ← Return to hangar
        </button>
      </div>
    );
  }

  const showTabs = essay.task_type === 'both';
  const textContent = activeTaskTab === 0 ? (essay.content_task1 || '') : (essay.content_task2 || '');
  const activeTopic = activeTaskTab === 0 ? topicData?.task1 : topicData?.task2;
  const currentComments = (review.comments || []).filter((c: any) => c.task_number === activeTaskTab + 1);
  
  let activeScores = {
    ta_band: review.ta_band, ta_feedback: review.ta_feedback,
    cc_band: review.cc_band, cc_feedback: review.cc_feedback,
    lr_band: review.lr_band, lr_feedback: review.lr_feedback,
    gra_band: review.gra_band, gra_feedback: review.gra_feedback
  };
  let generalFeedbackText = review.overall_feedback;

  try {
    if (review.overall_feedback?.startsWith('{')) {
      const parsed = JSON.parse(review.overall_feedback);
      if (parsed.task1 && parsed.task2) {
        const activeStats = activeTaskTab === 0 ? parsed.task1 : parsed.task2;
        activeScores = {
          ta_band: activeStats.scores.ta, ta_feedback: activeStats.feedbacks.ta,
          cc_band: activeStats.scores.cc, cc_feedback: activeStats.feedbacks.cc,
          lr_band: activeStats.scores.lr, lr_feedback: activeStats.feedbacks.lr,
          gra_band: activeStats.scores.gra, gra_feedback: activeStats.feedbacks.gra
        };
        generalFeedbackText = parsed.general_comment;
      }
    }
  } catch (e) {}

  return (
    <div className="max-w-7xl mx-auto space-y-8 bg-[#050507] min-h-screen text-[#F5F5F7] p-4 sm:p-6 lg:p-8 animate-luxury-fade relative font-sans">
      <div className="luxury-bg-glow" />
      <div className="luxury-grid-overlay opacity-30" />

      {/* Nav breadcrumb */}
      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
        <button onClick={() => router.push('/student/dashboard')} className="hover:text-white transition-colors cursor-pointer flex items-center">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Core
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className="font-bold text-[var(--color-primary)]">Diagnostic Summary</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
        {/* Main Left Columns */}
        <div className="lg:col-span-2 space-y-8">
          {showTabs && (
            <div className="flex border-b border-[var(--color-border)]/55 bg-[#0B0B0E] p-1 rounded-t-lg">
              <button 
                onClick={() => setActiveTaskTab(0)}
                className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${activeTaskTab === 0 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'}`}
              >
                Writing Task 1
              </button>
              <button 
                onClick={() => setActiveTaskTab(1)}
                className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${activeTaskTab === 1 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'}`}
              >
                Writing Task 2
              </button>
            </div>
          )}

          {/* Topic paper */}
          <div className="bg-[#0B0B0E] p-6 rounded-lg border border-[var(--color-border)]/55 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--color-primary)]/5 to-transparent pointer-events-none" />
            <h4 className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-3">Academic Context / Requirement</h4>
            {activeTopic?.image && (
              <div 
                className="relative group cursor-zoom-in mb-4 border border-[var(--color-border)]/45 bg-[#050507] p-2 rounded"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img 
                  src={activeTopic.image} 
                  alt="Topic attachment" 
                  className="max-h-[350px] w-full object-contain rounded opacity-95 group-hover:opacity-100 transition-all duration-300" 
                />
                <div className="absolute bottom-4 right-4 bg-black/90 text-[#F5F5F7] text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded border border-[var(--color-border)]/45 opacity-0 group-hover:opacity-100 transition-opacity">
                   Expand Image Matrix
                </div>
              </div>
            )}
            <p className="text-[#F5F5F7]/90 text-sm sm:text-base leading-relaxed italic font-serif">
              {activeTopic?.text}
            </p>
          </div>
          
          {/* Submission content */}
          <div className="bg-[#0B0B0E] rounded-lg border border-[var(--color-border)]/55 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-[#08080B]">
              <h4 className="font-bold text-xs uppercase tracking-widest text-[#F5F5F7]">Essay Transcript</h4>
              <span className="text-[9px] uppercase tracking-widest bg-[#D4AF37]/10 text-[#FFEAA7] border border-[#D4AF37]/20 px-2 py-1 rounded font-mono">
                  Dashed indices highlight active review commentary
              </span>
            </div>
            <div className="p-6 sm:p-8 text-base text-[#F5F5F7] leading-relaxed font-sans bg-[#050507]/60">
              {renderHighlightedText(textContent, review.comments || [], activeTaskTab, focusedCommentIndex, setFocusedCommentIndex)}
            </div>
          </div>

          {/* Table of Comments */}
          {currentComments.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-[var(--color-primary)] uppercase tracking-wider text-[10px] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
                Index of Local Assessment Observations ({currentComments.length})
              </h4>
              <div className="space-y-3">
                {(review.comments || []).map((c: any, i: number) => {
                  if (c.task_number !== activeTaskTab + 1) return null;
                  const isFocused = focusedCommentIndex === i;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setFocusedCommentIndex(isFocused ? null : i)}
                      className={`p-5 rounded-lg border text-sm transition-all duration-200 cursor-pointer ${
                        isFocused 
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' 
                          : 'bg-[#0B0B0E] border-[var(--color-border)]/55 hover:bg-[#0E0E14]'
                      }`}
                    >
                      <div className="text-[var(--color-text-tertiary)] italic text-xs mb-2 border-l-2 border-[#D4AF37] pl-3">
                        &quot;{c.selected_text}&quot;
                      </div>
                      <div className="text-[#F5F5F7] font-bold text-sm leading-relaxed">{c.comment_text}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-6">
          {/* Main Band score block */}
          <div className="bg-[#0B0B0E] p-6 sm:p-8 rounded-lg border border-[var(--color-border)]/55 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--color-primary)]/10 to-transparent pointer-events-none animate-pulse" />
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-bold mb-2">Overall Evaluated Score</div>
            
            <div className="relative inline-flex items-center justify-center p-4 mb-4">
              <span className={`text-9xl font-black font-sans tracking-tight select-none hover:scale-110 transition-transform duration-300 ${getBandTextColor(essay.overall_band)}`}>
                {essay.overall_band != null ? Number(essay.overall_band).toFixed(1) : '—'}
              </span>
            </div>

            <div className="block">
              <span className={`inline-flex items-center px-5 py-2 rounded-md text-xs tracking-widest font-sans font-extrabold uppercase border shadow-inner ${getBandBadgeStyle(essay.overall_band)}`}>
                Assess Verdict Complete
              </span>
            </div>
          </div>

          {/* Score matrix card */}
          <div className="bg-[#0B0B0E] rounded-lg border border-[var(--color-border)]/55 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)]/50 bg-[#08080B]">
              <h4 className="font-bold text-xs uppercase tracking-widest text-[#F5F5F7]">Assessment Criteria Matrix</h4>
            </div>
            <div className="divide-y divide-[var(--color-border)]/55 bg-[#050507]/45">
              {[
                { name: 'Task Achievement', score: activeScores.ta_band != null ? Number(activeScores.ta_band) : null, fb: activeScores.ta_feedback },
                { name: 'Coherence & Cohesion', score: activeScores.cc_band != null ? Number(activeScores.cc_band) : null, fb: activeScores.cc_feedback },
                { name: 'Lexical Resource', score: activeScores.lr_band != null ? Number(activeScores.lr_band) : null, fb: activeScores.lr_feedback },
                { name: 'Grammatical Accuracy', score: activeScores.gra_band != null ? Number(activeScores.gra_band) : null, fb: activeScores.gra_feedback },
              ].map((crit, idx) => (
                <div key={idx} className="p-4 space-y-2 hover:bg-[#0B0B0E] transition-all">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-xs uppercase tracking-wider text-[#F5F5F7]">{crit.name}</div>
                    <div className={`font-sans font-extrabold text-base leading-none border px-3.5 py-2 rounded shadow-sm ${getBandBadgeStyle(crit.score)}`}>
                      Band {crit.score != null ? crit.score.toFixed(1) : '-'}
                    </div>
                  </div>
                  {crit.fb && (
                    <div className="text-xs text-[var(--color-text-secondary)] bg-[#050507] p-3 rounded border border-[var(--color-border)]/35 italic leading-relaxed">
                      {crit.fb}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall verdict narrative text */}
          {generalFeedbackText && (
            <div className="bg-[#0B0B0E] p-5 sm:p-6 rounded-lg border border-[var(--color-border)]/55 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]" />
              <h4 className="font-bold text-xs uppercase tracking-widest text-[#F5F5F7] mb-3">Overall Evaluator narrative</h4>
              <p className="text-[var(--color-text-secondary)] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-serif">
                {generalFeedbackText}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Zoom Dialog Overlay */}
      {isLightboxOpen && activeTopic?.image && (
        <div 
          className="fixed inset-0 z-50 bg-black/98 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img 
              src={activeTopic.image} 
              alt="Topic expanded" 
              className="max-w-full max-h-full object-contain rounded select-none animate-scale-in"
              onClick={(e) => e.stopPropagation()} 
            />
            <button 
              type="button"
              className="absolute top-4 right-4 bg-neutral-900/90 hover:bg-neutral-800 text-[10px] uppercase tracking-widest font-mono font-bold text-[#F5F5F7] px-4 py-2 rounded border border-neutral-800 transition-colors cursor-pointer"
              onClick={() => setIsLightboxOpen(false)}
            >
              ✕ Close Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
