'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { calculateOverallBand, getBandTextColor } from '@/lib/utils';
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
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

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
    setIsConfirmSubmitOpen(false);
    toast.loading('Saving review evaluation...');
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
      toast.dismiss(); 
      toast.success('Evaluation successfully saved!'); 
      router.push('/teacher/dashboard');
    } catch {
      toast.dismiss(); 
      toast.error('Error saving evaluation settings'); 
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-6 h-6 border-t-2 border-white rounded-full animate-spin" /></div>;
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
    <div className="flex flex-col h-screen overflow-y-auto lg:overflow-hidden bg-black text-white font-sans relative">
      <div className="border-b border-zinc-900 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 bg-zinc-950 shrink-0">
        <div><h1 className="text-sm uppercase tracking-wider font-bold text-white">Evaluation suite</h1></div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className={`text-3xl font-mono font-bold tracking-wide ${(!skipScoring && overallBand > 0) ? getBandTextColor(overallBand) : 'text-zinc-500'}`}>
              {skipScoring ? 'FEEDBACK ONLY' : (overallBand > 0 ? Number(overallBand).toFixed(1) : 'PENDING')}
            </div>
          </div>
          <button onClick={() => setIsConfirmSubmitOpen(true)} disabled={submitting} className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-all cursor-pointer">Save marking</button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-10">
         <div className="w-full lg:w-1/2 flex flex-col border-r border-zinc-900 bg-zinc-950">
            {essay.task_type === 'both' && (
              <div className="flex border-b border-zinc-900 bg-zinc-950 shrink-0 p-1">
                <button onClick={() => setActiveTaskTab(0)} className={`flex-1 py-3 text-xs uppercase font-bold cursor-pointer ${activeTaskTab === 0 ? 'bg-black text-white border-b border-white' : 'text-neutral-500'}`}>Task 1</button>
                <button onClick={() => setActiveTaskTab(1)} className={`flex-1 py-3 text-xs uppercase font-bold cursor-pointer ${activeTaskTab === 1 ? 'bg-black text-white border-b border-white' : 'text-neutral-500'}`}>Task 2</button>
              </div>
            )}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-black border border-zinc-900 p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-zinc-300 italic">{activeTopic?.text}</p>
                {activeTopic?.image && (<img src={activeTopic.image} alt="Task diagram" onClick={() => setIsLightboxOpen(true)} className="max-h-[250px] w-full object-contain rounded mt-3 cursor-zoom-in border border-zinc-900" />)}
              </div>
              <div className="relative text-base sm:text-lg leading-relaxed text-white min-h-[300px] bg-black border border-zinc-900 p-6 rounded select-text">
                <div ref={textRef} className="absolute opacity-0 pointer-events-none whitespace-pre-wrap font-serif block w-full h-full" style={{ zIndex: -1 }}>{textContent}</div>
                <div className="whitespace-pre-wrap font-sans selection:bg-blue-600/30 relative z-0 cursor-text" onMouseUp={handleMouseUp}>
                  <HighlightedText text={textContent} comments={comments} taskIndex={activeTaskTab} focusedCommentIndex={focusedCommentIndex} setFocusedCommentIndex={setFocusedCommentIndex} />
                </div>
              </div>
              {pendingComment && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-950 p-5 border border-zinc-800 w-[90%] sm:w-96 z-50 rounded-lg shadow-2xl space-y-3">
                  <div className="text-xs bg-black p-3 border border-zinc-900 rounded truncate italic text-neutral-400">&quot;{pendingComment.selected_text}&quot;</div>
                  <textarea autoFocus value={commentInput} onChange={e => setCommentInput(e.target.value)} className="w-full text-xs p-3 border border-zinc-800 rounded bg-black text-white focus:outline-none focus:border-zinc-700 resize-none" rows={4} placeholder="Write comment for selected text segment..." />
                  <div className="flex justify-end space-x-2"><button onClick={cancelComment} className="px-3.5 py-1.5 border border-zinc-805 text-zinc-400 hover:text-white rounded text-xs uppercase tracking-wider font-semibold cursor-pointer">Cancel</button><button onClick={saveComment} className="px-3.5 py-1.5 bg-white text-black hover:bg-neutral-200 rounded text-xs uppercase tracking-wider font-semibold cursor-pointer">Save</button></div>
                </div>
              )}
              {currentComments.length > 0 && (
                <div className="mt-6 space-y-3">
                   {comments.map((c, i) => c.task_number === activeTaskTab + 1 && (
                     <div key={i} className="flex justify-between items-start p-4 rounded border text-xs bg-black border-zinc-900">
                       <div><div className="text-zinc-500 italic text-xs mb-1">&quot;{c.selected_text}&quot;</div><div className="text-zinc-200 font-semibold">{c.comment_text}</div></div>
                       <button onClick={() => removeComment(i)} className="text-red-400 hover:underline text-[10px] uppercase ml-4 cursor-pointer">Delete</button>
                     </div>
                   ))}
                </div>
              )}
            </div>
         </div>
         <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-black">
             <div className="mb-6 p-4 rounded bg-zinc-950 border border-zinc-900 flex items-center justify-between">
               <label htmlFor="skip-scoring" className="text-xs font-bold uppercase tracking-wider text-zinc-400 cursor-pointer">Feedback Only Mode (No Scores)</label>
               <input id="skip-scoring" type="checkbox" checked={skipScoring} onChange={(e) => setSkipScoring(e.target.checked)} className="cursor-pointer" />
             </div>
            <div className="space-y-4">
              {[{ id: 'ta', name: 'Task Achievement (TA)' }, { id: 'cc', name: 'Coherence & Cohesion (CC)' }, { id: 'lr', name: 'Lexical Resource (LR)' }, { id: 'gra', name: 'Grammatical Range (GRA)' }].map((crit) => (
                <div key={crit.id} className="bg-zinc-950 p-4 rounded border border-zinc-900 space-y-3">
                  <div className="flex justify-between items-center"><h4 className="font-semibold text-xs uppercase tracking-wider text-zinc-400">{crit.name}</h4>
                    <select value={(activeScores as any)[crit.id]} onChange={(e) => { const v = parseFloat(e.target.value); if(activeTaskTab===0) setTask1Scores({...task1Scores, [crit.id]:v}); else setTask2Scores({...task2Scores, [crit.id]:v}); }} disabled={skipScoring} className="border border-zinc-900 bg-black text-white p-2 rounded text-xs focus:outline-none focus:border-zinc-800 cursor-pointer">
                      <option value={0}>-</option>{[0,1,2,3,4,5,5.5,6,6.5,7,7.5,8,8.5,9].map(b => <option key={b} value={b}>{b.toFixed(1)}</option>)}
                    </select>
                  </div>
                  <input type="text" placeholder="Add specific feedback for this criterion..." className="w-full text-xs p-3 bg-black text-white rounded border border-zinc-900 focus:outline-none focus:border-neutral-850" value={(activeFeedbacks as any)[crit.id]} onChange={(e) => { if(activeTaskTab===0) setTask1Feedbacks({...task1Feedbacks, [crit.id]:e.target.value}); else setTask2Feedbacks({...task2Feedbacks, [crit.id]:e.target.value}); }} />
                </div>
              ))}
              <div className="bg-zinc-950 p-5 rounded border border-zinc-900 space-y-3">
                 <h4 className="font-semibold text-xs uppercase tracking-wider text-neutral-400 font-bold">Overall Comments</h4>
                 <textarea placeholder="Write global evaluation overview and recommendations..." className="w-full text-xs p-4 border border-zinc-900 bg-black text-white rounded resize-none focus:outline-none focus:border-zinc-850" rows={6} value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)} />
              </div>
            </div>
         </div>
      </div>
      {isLightboxOpen && activeTopic?.image && (<div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}><img src={activeTopic.image} alt="Expanded diagram" className="max-w-full max-h-full object-contain rounded" /></div>)}

      {/* Submission confirmation modal */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Submit mark evaluation?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Please make sure you have fully checked all criterion bands and feedback segments. The student will be notified and can inspect the final results immediately.</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setIsConfirmSubmitOpen(false)} className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}