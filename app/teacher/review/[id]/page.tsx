'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { calculateOverallBand, countWords, getBandTextColor } from '@/lib/utils';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { Essay } from '@/types';
import { HighlightedText } from '@/components/highlighted-text';

export default function TeacherReview() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topicData, setTopicData] = useState<any>(null);
  
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
      fetch(`/api/essays?id=${id}`).then(res => res.json()),
      fetch(`/api/reviews?essay_id=${id}`).then(res => res.json())
    ]).then(([essayData, reviewData]) => {
      if (essayData.essay) {
        setEssay(essayData.essay);
        try { setTopicData(JSON.parse(essayData.essay.topic_text)); } catch { setTopicData({ task1: { text: essayData.essay.topic_text }, task2: { text: essayData.essay.topic_text } }); }
        if (essayData.essay.task_type === 'task2') setActiveTaskTab(1);
      }
      if (reviewData.review) {
        try {
          if (reviewData.review.overall_feedback?.startsWith('{')) {
            const parsed = JSON.parse(reviewData.review.overall_feedback);
            setTask1Scores(parsed.task1?.scores || { ta: 0, cc: 0, lr: 0, gra: 0 });
            setTask1Feedbacks(parsed.task1?.feedbacks || { ta: '', cc: '', lr: '', gra: '' });
            setTask2Scores(parsed.task2?.scores || { ta: 0, cc: 0, lr: 0, gra: 0 });
            setTask2Feedbacks(parsed.task2?.feedbacks || { ta: '', cc: '', lr: '', gra: '' });
            setOverallFeedback(parsed.general_comment || '');
            if (Object.values(parsed.task1?.scores || {}).every(s => !s) && Object.values(parsed.task2?.scores || {}).every(s => !s)) setSkipScoring(true);
          } else {
            const theScores = { ta: parseFloat(reviewData.review.ta_band) || 0, cc: parseFloat(reviewData.review.cc_band) || 0, lr: parseFloat(reviewData.review.lr_band) || 0, gra: parseFloat(reviewData.review.gra_band) || 0 };
            if (essayData.essay?.task_type === 'task1') setTask1Scores(theScores); else setTask2Scores(theScores);
            setOverallFeedback(reviewData.review.overall_feedback || '');
            if (Object.values(theScores).every(s => !s)) setSkipScoring(true);
          }
        } catch {}
        if (reviewData.review.comments) setComments(reviewData.review.comments);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
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
    setPendingComment({ task_number: activeTaskTab + 1, start_index: startOffset, end_index: endOffset, selected_text: text });
  };

  const saveComment = () => { if (!commentInput.trim() || !pendingComment) return; setComments([...comments, { ...pendingComment, comment_text: commentInput }]); setPendingComment(null); setCommentInput(''); window.getSelection()?.removeAllRanges(); };
  const cancelComment = () => { setPendingComment(null); setCommentInput(''); window.getSelection()?.removeAllRanges(); };
  const removeComment = (index: number) => { setComments(c => c.filter((_, i) => i !== index)); };

  const handleSubmit = async () => {
    if (!essay) return;
    setSubmitting(true);
    toast.loading('Saving review...');
    try {
      let payload: any = { essay_id: id, comments };
      if (skipScoring) {
        payload.ta_band = 0; payload.cc_band = 0; payload.lr_band = 0; payload.gra_band = 0;
        payload.overall_feedback = essay.task_type === 'both' ? JSON.stringify({ task1: { scores: { ta: 0, cc: 0, lr: 0, gra: 0 }, feedbacks: task1Feedbacks }, task2: { scores: { ta: 0, cc: 0, lr: 0, gra: 0 }, feedbacks: task2Feedbacks }, general_comment: overallFeedback }) : overallFeedback;
      } else {
        if (essay.task_type === 'both') {
          const t1 = calculateOverallBand(task1Scores.ta, task1Scores.cc, task1Scores.lr, task1Scores.gra);
          const t2 = calculateOverallBand(task2Scores.ta, task2Scores.cc, task2Scores.lr, task2Scores.gra);
          const ov = Math.round(((t1 + t2 * 2) / 3) * 2) / 2;
          payload.ta_band = ov; payload.cc_band = ov; payload.lr_band = ov; payload.gra_band = ov;
          payload.overall_feedback = JSON.stringify({ task1: { scores: task1Scores, feedbacks: task1Feedbacks }, task2: { scores: task2Scores, feedbacks: task2Feedbacks }, general_comment: overallFeedback });
        } else {
          const fs = essay.task_type === 'task1' ? task1Scores : task2Scores;
          const ff = essay.task_type === 'task1' ? task1Feedbacks : task2Feedbacks;
          payload.ta_band = fs.ta; payload.ta_feedback = ff.ta; payload.cc_band = fs.cc; payload.cc_feedback = ff.cc; payload.lr_band = fs.lr; payload.lr_feedback = ff.lr; payload.gra_band = fs.gra; payload.gra_feedback = ff.gra; payload.overall_feedback = overallFeedback;
        }
      }
      await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      toast.dismiss(); toast.success('Review saved!'); router.push('/teacher/dashboard');
    } catch {
      toast.dismiss(); toast.error('Error'); setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-[var(--color-primary)] animate-spin" /></div>;
  if (!essay) return null;

  let overallBand = 0;
  if (essay.task_type === 'both') {
      const t1 = calculateOverallBand(task1Scores.ta, task1Scores.cc, task1Scores.lr, task1Scores.gra);
      const t2 = calculateOverallBand(task2Scores.ta, task2Scores.cc, task2Scores.lr, task2Scores.gra);
      overallBand = Math.round(((t1 + t2 * 2) / 3) * 2) / 2;
  } else {
      const activeScoreObj = essay.task_type === 'task1' ? task1Scores : task2Scores;
      overallBand = calculateOverallBand(activeScoreObj.ta, activeScoreObj.cc, activeScoreObj.lr, activeScoreObj.gra);
  }
  
  const textContent = activeTaskTab === 0 ? (essay.content_task1 || '') : (essay.content_task2 || '');
  const activeTopic = activeTaskTab === 0 ? topicData?.task1 : topicData?.task2;
  const currentComments = comments.filter(c => c.task_number === activeTaskTab + 1);
  const activeScores = activeTaskTab === 0 ? task1Scores : task2Scores;
  const activeFeedbacks = activeTaskTab === 0 ? task1Feedbacks : task2Feedbacks;

  return (
    <div className="flex flex-col h-screen overflow-y-auto lg:overflow-hidden bg-[#050507] text-[#F5F5F7] font-sans animate-luxury-fade relative">
      <div className="border-b border-[var(--color-border)]/55 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 bg-[#0B0B0E] shrink-0">
        <div><h1 className="text-md sm:text-lg uppercase tracking-wider font-extrabold text-[#F5F5F7]">Review Suite</h1></div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className={`text-4xl font-black font-sans tracking-wide ${(!skipScoring && overallBand > 0) ? getBandTextColor(overallBand) : 'text-[var(--color-text-tertiary)]'}`}>
              {skipScoring ? 'FB ONLY' : (overallBand > 0 ? Number(overallBand).toFixed(1) : 'PENDING')}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="bg-[var(--color-primary)] text-black font-extrabold text-[10px] uppercase tracking-[0.2em] px-6 py-3 rounded cursor-pointer">{submitting ? 'Sending...' : 'Submit'}</button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-10">
         <div className="w-full lg:w-1/2 flex flex-col border-r border-[var(--color-border)]/55 bg-[#08080B]">
            {essay.task_type === 'both' && (
              <div className="flex border-b border-[var(--color-border)]/50 bg-[#0B0B0E] shrink-0 p-1">
                <button onClick={() => setActiveTaskTab(0)} className={`flex-1 py-3 text-xs uppercase font-bold ${activeTaskTab === 0 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>Task 1</button>
                <button onClick={() => setActiveTaskTab(1)} className={`flex-1 py-3 text-xs uppercase font-bold ${activeTaskTab === 1 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>Task 2</button>
              </div>
            )}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-[#050507] border border-[var(--color-border)]/50 p-4 rounded-lg shadow-inner">
                <p className="text-xs sm:text-sm text-[#F5F5F7]/85 italic">{activeTopic?.text}</p>
                {activeTopic?.image && (<img src={activeTopic.image} alt="Topic" onClick={() => setIsLightboxOpen(true)} className="max-h-[300px] w-full object-contain rounded mt-3 cursor-zoom-in" />)}
              </div>
              <div className="relative text-base sm:text-lg leading-relaxed text-[#F5F5F7] min-h-[250px] bg-[#050507] border border-[var(--color-border)]/50 p-6 rounded select-text">
                <div ref={textRef} className="absolute opacity-0 pointer-events-none whitespace-pre-wrap font-serif block w-full h-full" style={{ zIndex: -1 }}>{textContent}</div>
                <div className="whitespace-pre-wrap font-sans selection:bg-[var(--color-primary)]/40 relative z-0 cursor-text" onMouseUp={handleMouseUp}>
                  <HighlightedText text={textContent} comments={comments} taskIndex={activeTaskTab} focusedCommentIndex={focusedCommentIndex} setFocusedCommentIndex={setFocusedCommentIndex} />
                </div>
              </div>
              {pendingComment && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0B0B0E] p-5 border border-[var(--color-border)] w-[90%] sm:w-85 z-50 rounded-lg">
                  <div className="text-[10px] bg-[#050507] p-3 border border-[var(--color-border)]/50 rounded mb-4 truncate italic">&quot;{pendingComment.selected_text}&quot;</div>
                  <textarea autoFocus value={commentInput} onChange={e => setCommentInput(e.target.value)} className="w-full text-xs p-3 border border-[var(--color-border)] rounded bg-black mb-4 focus:outline-none text-white resize-none" rows={4} />
                  <div className="flex justify-end space-x-2"><button onClick={cancelComment} className="px-3.5 py-1.5 bg-neutral-900 rounded">Cancel</button><button onClick={saveComment} className="px-3.5 py-1.5 bg-[var(--color-primary)] text-black rounded">Save</button></div>
                </div>
              )}
              {currentComments.length > 0 && (
                <div className="mt-8 space-y-3">
                   {comments.map((c, i) => c.task_number === activeTaskTab + 1 && (
                     <div key={i} className="flex justify-between items-start p-4 rounded border text-xs bg-[#050507] border-[var(--color-border)]/50">
                       <div><div className="text-[var(--color-text-tertiary)] italic text-[11px] mb-1.5">&quot;{c.selected_text}&quot;</div><div className="text-[#F5F5F7]/95 font-bold">{c.comment_text}</div></div>
                       <button onClick={() => removeComment(i)} className="text-[#E06C75] text-[9px] uppercase ml-4">Delete</button>
                     </div>
                   ))}
                </div>
              )}
            </div>
         </div>
         <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-[#050507]/40">
             <div className="mb-6 p-4 rounded bg-[#0A0A0D]/90 border border-[var(--color-border)]/55 flex items-center justify-between">
               <label htmlFor="skip-scoring" className="text-xs font-bold uppercase text-[#FFFFFF]">Feedback Only Mode</label>
               <input id="skip-scoring" type="checkbox" checked={skipScoring} onChange={(e) => setSkipScoring(e.target.checked)} />
             </div>
            <div className="space-y-6">
              {[{ id: 'ta', name: 'TA' }, { id: 'cc', name: 'CC' }, { id: 'lr', name: 'LR' }, { id: 'gra', name: 'GRA' }].map((crit) => (
                <div key={crit.id} className="bg-[#0B0B0E] p-4 rounded border border-[var(--color-border)]/55 space-y-3">
                  <div className="flex justify-between items-center"><h4 className="font-bold text-xs uppercase">{crit.name}</h4>
                    <select value={(activeScores as any)[crit.id]} onChange={(e) => { const v = parseFloat(e.target.value); if(activeTaskTab===0) setTask1Scores({...task1Scores, [crit.id]:v}); else setTask2Scores({...task2Scores, [crit.id]:v}); }} disabled={skipScoring} className="border border-[var(--color-border)] bg-black text-[#F5F5F7] p-2 rounded">
                      <option value={0}>-</option>{[0,1,2,3,4,5,5.5,6,6.5,7,7.5,8,8.5,9].map(b => <option key={b} value={b}>{b.toFixed(1)}</option>)}
                    </select>
                  </div>
                  <input type="text" className="w-full text-xs p-3 bg-black text-[#F5F5F7] rounded border border-[var(--color-border)]/45" value={(activeFeedbacks as any)[crit.id]} onChange={(e) => { if(activeTaskTab===0) setTask1Feedbacks({...task1Feedbacks, [crit.id]:e.target.value}); else setTask2Feedbacks({...task2Feedbacks, [crit.id]:e.target.value}); }} />
                </div>
              ))}
              <div className="bg-[#0B0B0E] p-5 rounded border border-[var(--color-border)]/55">
                 <textarea className="w-full text-xs p-4 border border-[var(--color-border)]/45 bg-black text-[#F5F5F7] rounded resize-none" rows={6} value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)} />
              </div>
            </div>
         </div>
      </div>
      {isLightboxOpen && activeTopic?.image && (<div className="fixed inset-0 z-50 bg-black/98 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}><img src={activeTopic.image} alt="Zoom" className="max-w-full max-h-full object-contain rounded" /></div>)}
    </div>
  );
}