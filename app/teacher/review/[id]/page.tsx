'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { calculateOverallBand, countWords } from '@/lib/utils';
import { AlertCircle, MessageSquare, ArrowLeft, Clock } from 'lucide-react';
import { Essay } from '@/types';
import { getBandTextColor } from '@/lib/utils';

function generateHighlightedText(
  text: string, 
  comments: any[], 
  taskIndex: number,
  focusedCommentIndex: number | null,
  setFocusedCommentIndex: (idx: number | null) => void
) {
  if (!text) return <span>{text}</span>;
  
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
  
  return <div className="whitespace-pre-wrap font-sans text-xl sm:text-2xl font-bold text-white leading-relaxed tracking-wide select-text">{elements}</div>;
}

export default function TeacherReview() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topicData, setTopicData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [task1Scores, setTask1Scores] = useState({ ta: 0, cc: 0, lr: 0, gra: 0 });
  const [task1Feedbacks, setTask1Feedbacks] = useState({ ta: '', cc: '', lr: '', gra: '' });
  
  const [task2Scores, setTask2Scores] = useState({ ta: 0, cc: 0, lr: 0, gra: 0 });
  const [task2Feedbacks, setTask2Feedbacks] = useState({ ta: '', cc: '', lr: '', gra: '' });
  
  const [overallFeedback, setOverallFeedback] = useState('');
  
  const textRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [pendingComment, setPendingComment] = useState<any | null>(null);
  const [commentInput, setCommentInput] = useState('');
  
  const [activeTaskTab, setActiveTaskTab] = useState(0); 
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [focusedCommentIndex, setFocusedCommentIndex] = useState<number | null>(null);
  const [skipScoring, setSkipScoring] = useState(false);

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
      
      if (reviewData.review) {
        let isJson = false;
        let parsedOverall = null;
        try {
          if (reviewData.review.overall_feedback?.startsWith('{')) {
            parsedOverall = JSON.parse(reviewData.review.overall_feedback);
            isJson = true;
          }
        } catch (e) {}

        if (isJson && parsedOverall) {
          const t1s = parsedOverall.task1?.scores || { ta: 0, cc: 0, lr: 0, gra: 0 };
          const t2s = parsedOverall.task2?.scores || { ta: 0, cc: 0, lr: 0, gra: 0 };
          setTask1Scores(t1s);
          setTask1Feedbacks(parsedOverall.task1?.feedbacks || { ta: '', cc: '', lr: '', gra: '' });
          setTask2Scores(t2s);
          setTask2Feedbacks(parsedOverall.task2?.feedbacks || { ta: '', cc: '', lr: '', gra: '' });
          setOverallFeedback(parsedOverall.general_comment || '');

          const t1_no_score = Object.values(t1s).every(s => !s || s === 0);
          const t2_no_score = Object.values(t2s).every(s => !s || s === 0);
          if (t1_no_score && t2_no_score) {
            setSkipScoring(true);
          }
        } else {
          const theScores = {
            ta: reviewData.review.ta_band ? parseFloat(reviewData.review.ta_band) : 0,
            cc: reviewData.review.cc_band ? parseFloat(reviewData.review.cc_band) : 0,
            lr: reviewData.review.lr_band ? parseFloat(reviewData.review.lr_band) : 0,
            gra: reviewData.review.gra_band ? parseFloat(reviewData.review.gra_band) : 0
          };
          const theFeedbacks = {
            ta: reviewData.review.ta_feedback || '',
            cc: reviewData.review.cc_feedback || '',
            lr: reviewData.review.lr_feedback || '',
            gra: reviewData.review.gra_feedback || ''
          };
          
          if (essayData.essay?.task_type === 'task1') {
            setTask1Scores(theScores);
            setTask1Feedbacks(theFeedbacks);
          } else {
            setTask2Scores(theScores);
            setTask2Feedbacks(theFeedbacks);
          }
          setOverallFeedback(reviewData.review.overall_feedback || '');

          if (Object.values(theScores).every(s => !s || s === 0)) {
            setSkipScoring(true);
          }
        }

        if (reviewData.review.comments) {
          setComments(reviewData.review.comments);
        }
      }
      setLoading(false);
    }).catch(err => {
      setError(err.message || 'An error occurred while loading review details');
      setLoading(false);
    });
  }, [id]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) return;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(textRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    
    const startOffset = preSelectionRange.toString().length;
    const text = selection.toString();
    const endOffset = startOffset + text.length;

    const relevantComments = comments.filter(c => c.task_number === activeTaskTab + 1);
    const overlap = relevantComments.some(c => 
      (startOffset >= c.start_index && startOffset < c.end_index) ||
      (endOffset > c.start_index && endOffset <= c.end_index)
    );

    if (overlap) {
      toast.error('Overlapping comments are not supported.');
      selection.removeAllRanges();
      return;
    }

    setPendingComment({
      task_number: activeTaskTab + 1,
      start_index: startOffset,
      end_index: endOffset,
      selected_text: text
    });
  };

  const saveComment = () => {
    if (!commentInput.trim() || !pendingComment) return;
    setComments([...comments, { ...pendingComment, comment_text: commentInput }]);
    setPendingComment(null);
    setCommentInput('');
    window.getSelection()?.removeAllRanges();
  };

  const cancelComment = () => {
    setPendingComment(null);
    setCommentInput('');
    window.getSelection()?.removeAllRanges();
  };
  
  const removeComment = (index: number) => {
    setComments(c => c.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!essay) return;
    
    if (!skipScoring) {
        if (essay.task_type === 'both') {
           if (Object.values(task1Scores).some(s => s === 0) || Object.values(task2Scores).some(s => s === 0)) {
               toast.error('Assign a grade parameter criteria across both tasks.');
               return;
           }
        } else {
            const checkScores = essay.task_type === 'task1' ? task1Scores : task2Scores;
            if (Object.values(checkScores).some(s => s === 0)) {
                toast.error('Assign score metrics across all criteria.');
                return;
            }
        }
    }

    setSubmitting(true);
    toast.loading('Saving review...');
    
    try {
        let payload: any = { essay_id: id, comments };
        
        if (skipScoring) {
            if (essay.task_type === 'both') {
                payload.ta_band = 0; 
                payload.cc_band = 0;
                payload.lr_band = 0;
                payload.gra_band = 0;
                
                payload.overall_feedback = JSON.stringify({
                    task1: { scores: { ta: 0, cc: 0, lr: 0, gra: 0 }, feedbacks: task1Feedbacks },
                    task2: { scores: { ta: 0, cc: 0, lr: 0, gra: 0 }, feedbacks: task2Feedbacks },
                    general_comment: overallFeedback
                });
            } else {
                const finalFeedbacks = essay.task_type === 'task1' ? task1Feedbacks : task2Feedbacks;
                payload.ta_band = 0;
                payload.ta_feedback = finalFeedbacks.ta;
                payload.cc_band = 0;
                payload.cc_feedback = finalFeedbacks.cc;
                payload.lr_band = 0;
                payload.lr_feedback = finalFeedbacks.lr;
                payload.gra_band = 0;
                payload.gra_feedback = finalFeedbacks.gra;
                payload.overall_feedback = overallFeedback;
            }
        } else {
            if (essay.task_type === 'both') {
                const t1 = calculateOverallBand(task1Scores.ta, task1Scores.cc, task1Scores.lr, task1Scores.gra);
                const t2 = calculateOverallBand(task2Scores.ta, task2Scores.cc, task2Scores.lr, task2Scores.gra);
                const overallWeighted = Math.round(((t1 + t2 * 2) / 3) * 2) / 2;
                
                payload.ta_band = overallWeighted; 
                payload.cc_band = overallWeighted;
                payload.lr_band = overallWeighted;
                payload.gra_band = overallWeighted;
                
                payload.overall_feedback = JSON.stringify({
                    task1: { scores: task1Scores, feedbacks: task1Feedbacks },
                    task2: { scores: task2Scores, feedbacks: task2Feedbacks },
                    general_comment: overallFeedback
                });
            } else {
                const finalScores = essay.task_type === 'task1' ? task1Scores : task2Scores;
                const finalFeedbacks = essay.task_type === 'task1' ? task1Feedbacks : task2Feedbacks;
                
                payload.ta_band = finalScores.ta;
                payload.ta_feedback = finalFeedbacks.ta;
                payload.cc_band = finalScores.cc;
                payload.cc_feedback = finalFeedbacks.cc;
                payload.lr_band = finalScores.lr;
                payload.lr_feedback = finalFeedbacks.lr;
                payload.gra_band = finalScores.gra;
                payload.gra_feedback = finalFeedbacks.gra;
                payload.overall_feedback = overallFeedback;
            }
        }

        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to submit review');
        
        toast.dismiss();
        toast.success('Review saved successfully!');
        router.push('/teacher/dashboard');
    } catch(err: any) {
        toast.dismiss();
        toast.error(err.message);
        setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-t-2 border-[var(--color-primary)] animate-spin mx-auto" />
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-primary)]">Loading examiner suite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050507] p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold tracking-widest uppercase text-red-400 mb-2">Error</h2>
        <p className="text-xs text-[var(--color-text-tertiary)] mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => router.push('/teacher/dashboard')} 
          className="text-xs uppercase tracking-widest font-bold text-[var(--color-primary)] border-b border-[var(--color-primary)] pb-0.5 hover:brightness-115 transition-all cursor-pointer"
        >
          ← Go to Dashboard
        </button>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center text-center">
        <p className="text-sm text-red-400 uppercase tracking-widest font-mono font-bold">Candidate transcript missing</p>
      </div>
    );
  }

  const bandOptions = [0, 1, 2, 3, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
  let overallBand = 0;
  if (essay.task_type === 'both') {
      const t1 = calculateOverallBand(task1Scores.ta, task1Scores.cc, task1Scores.lr, task1Scores.gra);
      const t2 = calculateOverallBand(task2Scores.ta, task2Scores.cc, task2Scores.lr, task2Scores.gra);
      overallBand = Math.round(((t1 + t2 * 2) / 3) * 2) / 2;
  } else {
      const activeScoreObj = essay.task_type === 'task1' ? task1Scores : task2Scores;
      overallBand = calculateOverallBand(activeScoreObj.ta, activeScoreObj.cc, activeScoreObj.lr, activeScoreObj.gra);
  }
  
  const showTabs = essay.task_type === 'both';
  const textContent = activeTaskTab === 0 ? (essay.content_task1 || '') : (essay.content_task2 || '');
  const activeTopic = activeTaskTab === 0 ? topicData?.task1 : topicData?.task2;
  const currentComments = comments.filter(c => c.task_number === activeTaskTab + 1);
  const activeScores = activeTaskTab === 0 ? task1Scores : task2Scores;
  const activeFeedbacks = activeTaskTab === 0 ? task1Feedbacks : task2Feedbacks;
  
  const handleScoreChange = (critId: string, val: number) => {
      if (activeTaskTab === 0) setTask1Scores({...task1Scores, [critId]: val});
      else setTask2Scores({...task2Scores, [critId]: val});
  };

  const handleFeedbackChange = (critId: string, val: string) => {
      if (activeTaskTab === 0) setTask1Feedbacks({...task1Feedbacks, [critId]: val});
      else setTask2Feedbacks({...task2Feedbacks, [critId]: val});
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto lg:overflow-hidden bg-[#050507] text-[#F5F5F7] font-sans animate-luxury-fade relative">
      <div className="luxury-bg-glow" />
      <div className="luxury-grid-overlay opacity-30" />

      {/* Header */}
      <div className="border-b border-[var(--color-border)]/55 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 bg-[#0B0B0E] shrink-0">
        <div>
          <h1 className="text-md sm:text-lg uppercase tracking-wider font-extrabold text-[#F5F5F7]">Review Suite: {(essay as any).full_name || 'Student'}&apos;s Essay</h1>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-bold">Select text with cursor to attach evaluation notes inline.</p>
        </div>
        
        <div className="flex items-center space-x-6 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-bold">Graded Band Index</div>
            <div className={`text-4xl font-black font-sans tracking-wide ${(!skipScoring && overallBand > 0) ? getBandTextColor(overallBand) : 'text-[var(--color-text-tertiary)]'}`}>
              {skipScoring ? 'FEEDBACK ONLY' : (overallBand > 0 ? Number(overallBand).toFixed(1) : 'PENDING')}
            </div>
          </div>
          
          <button
             onClick={handleSubmit}
             disabled={submitting}
             className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-black font-extrabold text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded border border-[var(--color-primary)] transition-all cursor-pointer disabled:opacity-50 shadow-xl shadow-black/40"
          >
             {submitting ? 'Transmitting...' : 'Submit Appraisal'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-10">
         {/* Left Side: Student Text Annotator */}
         <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--color-border)]/55 bg-[#08080B] min-h-[400px] lg:min-h-0">
            {showTabs && (
              <div className="flex border-b border-[var(--color-border)]/50 bg-[#0B0B0E] shrink-0 p-1">
                <button 
                  onClick={() => setActiveTaskTab(0)}
                  className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${activeTaskTab === 0 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'}`}
                >
                  Task 1 Draft
                </button>
                <button 
                  onClick={() => setActiveTaskTab(1)}
                  className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer ${activeTaskTab === 1 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[#FFFFFF]'}`}
                >
                  Task 2 Draft
                </button>
              </div>
            )}
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-[#050507] border border-[var(--color-border)]/50 p-4 rounded-lg shadow-inner">
                <h4 className="text-[9px] uppercase tracking-widest text-[var(--color-primary)] mb-2.5 font-bold">Topic configuration Context</h4>
                <p className="text-xs sm:text-sm text-[#F5F5F7]/85 italic leading-relaxed font-serif">{activeTopic?.text}</p>
                {activeTopic?.image && (
                  <div 
                    className="relative group cursor-zoom-in mt-3 border border-[var(--color-border)]/45 bg-black p-2 rounded"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <img 
                      src={activeTopic.image} 
                      alt="Visual Prompt Source" 
                      className="max-h-[300px] w-full object-contain rounded opacity-90 group-hover:opacity-100 transition-all duration-300" 
                    />
                    <div className="absolute bottom-4 right-4 bg-black/95 text-white text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 rounded border border-[var(--color-border)]/40 opacity-0 group-hover:opacity-100 transition-opacity">
                       Expand Diagram Matrix
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--color-border)]/50 pt-4">
                <div className="text-[10px] uppercase tracking-widest font-bold flex items-center text-[var(--color-text-tertiary)]">
                  <MessageSquare className="w-4 h-4 mr-2 text-[var(--color-primary)]/75" /> Cursor highlight active
                </div>
                <div className="text-[10px] tracking-widest font-mono text-[var(--color-text-tertiary)] uppercase font-semibold">{countWords(textContent)} Words Drafted</div>
              </div>
              
              <div className="relative text-base sm:text-lg leading-relaxed text-[#F5F5F7] min-h-[250px] bg-[#050507] border border-[var(--color-border)]/50 p-6 rounded shadow-inner select-text">
                <div 
                   ref={textRef} 
                   className="absolute opacity-0 pointer-events-none whitespace-pre-wrap font-serif block w-full h-full" 
                   style={{ zIndex: -1 }}
                >
                    {textContent}
                </div>
                
                <div 
                   className="whitespace-pre-wrap font-sans selection:bg-[var(--color-primary)]/40 selection:text-white relative z-0 cursor-text leading-relaxed tracking-wide" 
                   onMouseUp={handleMouseUp}
                >
                    {generateHighlightedText(textContent, comments, activeTaskTab, focusedCommentIndex, setFocusedCommentIndex)}
                </div>
              </div>

              {pendingComment && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0B0B0E] shadow-2xl rounded-lg p-5 border border-[var(--color-border)] w-[90%] sm:w-85 z-50">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-[#F5F5F7] mb-2 text-[var(--color-primary)]">Annotate Selection</h4>
                  <div className="text-[10px] bg-[#050507] p-3 border border-[var(--color-border)]/50 rounded mb-4 truncate italic text-[var(--color-text-tertiary)]">
                     &quot;{pendingComment.selected_text}&quot;
                  </div>
                  <textarea 
                    autoFocus
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="Attach evaluation commentary..."
                    className="w-full text-xs p-3 border border-[var(--color-border)] rounded bg-black mb-4 focus:outline-none focus:border-[var(--color-primary)] text-white font-serif resize-none"
                    rows={4}
                  />
                  <div className="flex justify-end space-x-2">
                    <button onClick={cancelComment} className="px-3.5 py-1.5 text-[10px] uppercase tracking-widest bg-neutral-900 border border-neutral-800 rounded text-neutral-300 font-bold hover:bg-neutral-850 cursor-pointer">Discard</button>
                    <button onClick={saveComment} className="px-3.5 py-1.5 text-[10px] uppercase tracking-widest bg-[var(--color-primary)] text-black rounded font-bold hover:brightness-110 cursor-pointer">Commit</button>
                  </div>
                </div>
              )}
              
              {currentComments.length > 0 && (
                <div className="mt-8 space-y-3">
                   <h4 className="font-bold text-[var(--color-text-tertiary)] uppercase tracking-widest text-[9px] border-b border-[var(--color-border)]/50 pb-2">Active Annotation Index ({currentComments.length})</h4>
                   {comments.map((c, i) => {
                     if (c.task_number !== activeTaskTab + 1) return null;
                     const isFocused = focusedCommentIndex === i;
                     return (
                       <div 
                         key={i} 
                         onClick={() => setFocusedCommentIndex(isFocused ? null : i)}
                         className={`flex justify-between items-start p-4 rounded border text-xs transition-all duration-200 cursor-pointer ${
                           isFocused 
                             ? 'bg-[#D4AF37]/10 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' 
                             : 'bg-[#050507] border-[var(--color-border)]/50 hover:bg-[#09090E]'
                         }`}
                       >
                         <div>
                           <div className="text-[var(--color-text-tertiary)] italic text-[11px] mb-1.5 border-l-2 border-[#D4AF37] pl-3">&quot;{c.selected_text}&quot;</div>
                           <div className="text-[#F5F5F7]/95 leading-relaxed font-sans font-bold text-sm">{c.comment_text}</div>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); removeComment(i); }} className="text-[#E06C75] hover:underline text-[9px] tracking-widest font-extrabold uppercase shrink-0 ml-4 cursor-pointer">Discard</button>
                       </div>
                     );
                   })}
                </div>
              )}
            </div>
         </div>

         {/* Right Side: Scoring & Rubrics */}
         <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-[#050507]/40">
            <h2 className="text-xs uppercase tracking-widest font-extrabold mb-4 flex items-center text-[#F5F5F7]"><AlertCircle className="w-4 h-4 mr-2 text-[var(--color-primary)]"/> Evaluation Rubric matrix</h2>
             
             {/* Feedback Only Toggle */}
             <div className="mb-6 p-4 rounded bg-[#0A0A0D]/90 border border-[var(--color-border)]/55 flex items-center justify-between shadow-lg">
               <div className="space-y-0.5 pr-4">
                 <label htmlFor="skip-scoring" className="text-xs font-bold uppercase tracking-widest text-[#FFFFFF] select-none block cursor-pointer">
                   Feedback Only Mode 
                 </label>
                 <span className="text-[10px] text-[var(--color-text-tertiary)] block uppercase tracking-wider leading-relaxed font-sans font-semibold">
                   Submit annotations & feedback without assigning numeric scores.
                 </span>
               </div>
               <label className="relative inline-flex items-center cursor-pointer shrink-0">
                 <input 
                   id="skip-scoring"
                   type="checkbox" 
                   checked={skipScoring} 
                   onChange={(e) => setSkipScoring(e.target.checked)} 
                   className="sr-only peer" 
                 />
                 <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-neutral-900 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-500 after:border-neutral-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)] peer-checked:after:bg-[#000000]"></div>
               </label>
             </div>
            
            <div className="space-y-6">
              {[
                  { id: 'ta', name: 'Task Achievement (TA)' },
                  { id: 'cc', name: 'Coherence & Cohesion (CC)' },
                  { id: 'lr', name: 'Lexical Resource (LR)' },
                  { id: 'gra', name: 'Grammatical Range & Accuracy (GRA)' }
              ].map((crit) => (
                <div key={crit.id} className="bg-[#0B0B0E] p-4 sm:p-5 rounded border border-[var(--color-border)]/55 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#F5F5F7]">{crit.name}</h4>
                    <select 
                       value={(activeScores as any)[crit.id]}
                       onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value))}
                       disabled={skipScoring}
                       className="block border border-[var(--color-border)] bg-black text-sm text-[#F5F5F7] rounded p-2 px-3 focus:outline-none font-serif font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value={0}>Assign Band Score</option>
                      {bandOptions.map(b => (
                        <option key={b} value={b}>{b.toFixed(1)}</option>
                      ))}
                    </select>
                  </div>
                  <input
                     type="text"
                     placeholder={`Evaluation parameters context summary for ${crit.name}...`}
                     className="w-full text-xs p-3 border border-[var(--color-border)]/45 bg-black text-[#F5F5F7] rounded focus:outline-none transition-all placeholder-[var(--color-text-tertiary)]"
                     value={(activeFeedbacks as any)[crit.id]}
                     onChange={(e) => handleFeedbackChange(crit.id, e.target.value)}
                  />
                </div>
              ))}
              
              <hr className="border-[var(--color-border)]/50" />
              
              <div className="bg-[#0B0B0E] p-5 rounded border border-[var(--color-border)]/55 shadow-xl space-y-3">
                 <label className="block text-[10px] uppercase tracking-widest font-extrabold text-[var(--color-text-tertiary)]">Overall Evaluator Narrative Verdict</label>
                 <textarea
                   className="w-full text-xs p-4 border border-[var(--color-border)]/45 bg-black text-[#F5F5F7] rounded resize-none focus:outline-none font-serif leading-relaxed"
                   rows={6}
                   value={overallFeedback}
                   onChange={e => setOverallFeedback(e.target.value)}
                   placeholder="Publish final holistic summary comments on student's candidate performance..."
                 />
              </div>
            </div>
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
              alt="Visual Prompt expanded" 
              className="max-w-full max-h-full object-contain rounded select-none"
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
