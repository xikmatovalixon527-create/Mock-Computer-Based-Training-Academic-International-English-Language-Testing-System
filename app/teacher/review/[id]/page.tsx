// File: app/teacher/review/[id]/page.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { calculateOverallBand, getBandTextColor, getBandBadgeStyle, countWords } from '@/lib/utils';
import { Essay } from '@/types';
import { HighlightedText } from '@/components/highlighted-text';

export default function TeacherReview() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [essay, setEssay] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [topicData, setTopicData] = useState<any>(null);
  const [previousEssays, setPreviousEssays] = useState<any[]>([]);
  const [showStudentCard, setShowStudentCard] = useState(true);
  
  const [task1Scores, setTask1Scores] = useState({ ta: 0, cc: 0, lr: 0, gra: 0 });
  const [task1Feedbacks, setTask1Feedbacks] = useState({ ta: '', cc: '', lr: '', gra: '' });
  const [task2Scores, setTask2Scores] = useState({ ta: 0, cc: 0, lr: 0, gra: 0 });
  const [task2Feedbacks, setTask2Feedbacks] = useState({ ta: '', cc: '', lr: '', gra: '' });
  const [overallFeedback, setOverallFeedback] = useState('');
  
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [pendingComment, setPendingComment] = useState<any | null>(null);
  const [commentInput, setCommentInput] = useState('');
  
  const [activeTaskTab, setActiveTaskTab] = useState(0); 
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [focusedCommentIndex, setFocusedCommentIndex] = useState<number | null>(null);
  const [skipScoring, setSkipScoring] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  // States for Draggable Modal Comment Box
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    Promise.all([
      fetch(`/api/essays?id=${id}`).then(res => res.json()),
      fetch(`/api/reviews?essay_id=${id}`).then(res => res.json())
    ]).then(([essayData, reviewData]) => {
      if (essayData.essay) {
        const currentEssay = essayData.essay;
        setEssay(currentEssay);
        try { setTopicData(JSON.parse(currentEssay.topic_text)); } catch { setTopicData({ task1: { text: currentEssay.topic_text }, task2: { text: currentEssay.topic_text } }); }
        if (currentEssay.task_type === 'task2') setActiveTaskTab(1);

        // Запрос истории предыдущих работ проверяемого студента
        if (currentEssay.student_id) {
          fetch(`/api/essays?student_id=${currentEssay.student_id}`)
            .then(res => res.json())
            .then(historyData => {
              if (historyData.essays) {
                // Исключаем текущее эссе из истории
                const filtered = historyData.essays.filter((e: any) => e.id !== id);
                setPreviousEssays(filtered);
              }
            })
            .catch(err => console.error('Failed to load student context history:', err));
        }
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

  // Initialize and center the draggable modal when a new comment is pending
  useEffect(() => {
    if (pendingComment) {
      if (typeof window !== 'undefined') {
        setModalPos({
          x: window.innerWidth / 2 - 192, // ~192px is half of standard sm:w-96 (384px)
          y: window.innerHeight / 2 - 160
        });
      }
    } else {
      setModalPos(null);
    }
  }, [pendingComment]);

  // Draggable logic hook
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !modalPos) return;
      setModalPos({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, modalPos]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Do not initiate drag if user interacts with textarea or buttons inside modal
    if (target.closest('textarea') || target.closest('button')) {
      return;
    }
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - (modalPos?.x || 0),
      y: e.clientY - (modalPos?.y || 0)
    };
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textContainerRef.current) return;
    
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    
    preSelectionRange.selectNodeContents(textContainerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    
    const startOffset = preSelectionRange.toString().length;
    const text = selection.toString();
    const endOffset = startOffset + text.length;
    
    setPendingComment({ 
      task_number: activeTaskTab + 1, 
      start_index: startOffset, 
      end_index: endOffset, 
      selected_text: text 
    });
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

  if (loading) return <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" /></div>;
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
    <div className="flex flex-col h-screen overflow-y-auto lg:overflow-hidden bg-[#0a0a0c] text-white font-sans relative">
      <div className="border-b border-[#1f1f23] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 bg-[#121214] shrink-0">
        <div><h1 className="text-xs uppercase tracking-wider font-semibold text-[#8a8a8e]">Evaluation suite</h1></div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className={`text-2xl font-mono font-bold tracking-wide ${(!skipScoring && overallBand > 0) ? getBandTextColor(overallBand) : 'text-[#8a8a8e]'}`}>
              {skipScoring ? 'FEEDBACK ONLY' : (overallBand > 0 ? Number(overallBand).toFixed(1) : 'PENDING')}
            </div>
          </div>
          <button onClick={() => setIsConfirmSubmitOpen(true)} disabled={submitting} className="bg-white hover:bg-[#cfcfcf] text-black font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-colors cursor-pointer">Save marking</button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative z-10">
         <div className="w-full lg:w-1/2 flex flex-col border-r border-[#1f1f23] bg-[#121214]/40">
            {essay.task_type === 'both' && (
              <div className="flex border-b border-[#1f1f23] bg-[#121214] shrink-0 p-1">
                <button onClick={() => setActiveTaskTab(0)} className={`flex-1 py-2.5 text-xs uppercase font-semibold cursor-pointer ${activeTaskTab === 0 ? 'bg-black text-white border-b border-white' : 'text-[#8a8a8e]'}`}>Task 1</button>
                <button onClick={() => setActiveTaskTab(1)} className={`flex-1 py-2.5 text-xs uppercase font-semibold cursor-pointer ${activeTaskTab === 1 ? 'bg-black text-white border-b border-white' : 'text-[#8a8a8e]'}`}>Task 2</button>
              </div>
            )}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-black border border-[#1f1f23] p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-[#f5f5f7] italic">{activeTopic?.text}</p>
                {activeTopic?.images && activeTopic.images.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {activeTopic.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`Task diagram ${idx + 1}`} onClick={() => setLightboxImg(img)} className="max-h-[250px] w-full object-contain rounded cursor-zoom-in border border-[#1f1f23]" />
                    ))}
                  </div>
                ) : activeTopic?.image ? (
                  <img src={activeTopic.image} alt="Task diagram" onClick={() => setLightboxImg(activeTopic.image)} className="max-h-[250px] w-full object-contain rounded mt-3 cursor-zoom-in border border-[#1f1f23]" />
                ) : null}
              </div>
              <div className="relative text-base sm:text-lg leading-relaxed text-white min-h-[300px] bg-black border border-[#1f1f23] p-6 rounded select-text">
                <div 
                  ref={textContainerRef}
                  className="whitespace-pre-wrap font-sans selection:bg-[#0071e3]/20 relative z-0 cursor-text animate-fade-in" 
                  onMouseUp={handleMouseUp}
                >
                  <HighlightedText text={textContent} comments={comments} taskIndex={activeTaskTab} focusedCommentIndex={focusedCommentIndex} setFocusedCommentIndex={setFocusedCommentIndex} />
                </div>
              </div>

              {/* Счётчик слов */}
              <div className="px-4 py-2 bg-[#121214] border border-[#1f1f23] rounded flex justify-between items-center text-xs font-mono text-[#8a8a8e] mt-2 select-none">
                <span>Количество слов: <strong className="text-white">{countWords(textContent)}</strong></span>
                {essay.task_type === 'both' && (
                  <span className="text-[10px] text-[#6e6e73]">
                    (Task 1: {countWords(essay.content_task1 || '')} | Task 2: {countWords(essay.content_task2 || '')})
                  </span>
                )}
              </div>

              {/* Draggable Modal for Comments */}
              {pendingComment && modalPos && (
                <div 
                  onMouseDown={handleMouseDown}
                  style={{
                    position: 'fixed',
                    left: `${modalPos.x}px`,
                    top: `${modalPos.y}px`,
                  }}
                  className="bg-[#121214] p-5 border border-[#1f1f23] w-[90%] sm:w-96 z-50 rounded-lg shadow-2xl space-y-3 cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1f1f23]/60">
                    <span className="text-[10px] uppercase tracking-wider text-[#0071e3] font-bold">💬 Draggable Annotation</span>
                    <span className="text-[9px] text-[#6e6e73] italic">Drag here to move</span>
                  </div>
                  <div className="text-xs bg-black p-3 border border-[#1f1f23] rounded truncate italic text-[#8a8a8e]">&quot;{pendingComment.selected_text}&quot;</div>
                  <textarea 
                    autoFocus 
                    value={commentInput} 
                    onChange={e => setCommentInput(e.target.value)} 
                    className="w-full text-xs p-3 border border-[#1f1f23] rounded bg-black text-white focus:outline-none focus:border-[#0071e3] resize-none cursor-text" 
                    rows={4} 
                    placeholder="Write comment for selected text segment..." 
                  />
                  <div className="flex justify-end space-x-2">
                    <button onClick={cancelComment} className="px-3 py-1.5 border border-[#1f1f23] text-[#8a8a8e] hover:text-white rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
                    <button onClick={saveComment} className="px-3 py-1.5 bg-white text-black hover:bg-[#cfcfcf] rounded-full text-xs uppercase tracking-wider font-semibold cursor-pointer">Save</button>
                  </div>
                </div>
              )}

              {currentComments.length > 0 && (
                <div className="mt-6 space-y-3">
                   {comments.map((c, i) => {
                     if (c.task_number !== activeTaskTab + 1) return null;
                     const isFocused = focusedCommentIndex === i;
                     return (
                       <div 
                         key={i} 
                         onClick={() => setFocusedCommentIndex(isFocused ? null : i)}
                         className={`flex justify-between items-start p-4 rounded border text-xs cursor-pointer transition-all duration-200 ${
                           isFocused 
                             ? 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.25)] text-white' 
                             : 'bg-black border-[#1f1f23] hover:border-zinc-700'
                         }`}
                       >
                         <div className="flex-1 min-w-0">
                           <div className={`text-xs italic mb-1 border-l-2 pl-2 ${
                             isFocused ? 'border-white text-blue-100' : 'border-[#8a8a8e] text-[#8a8a8e]'
                           }`}>
                             &quot;{c.selected_text}&quot;
                           </div>
                           <div className={`font-semibold ${
                             isFocused ? 'text-white' : 'text-[#f5f5f7]'
                           }`}>
                             {c.comment_text}
                           </div>
                         </div>
                         <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             removeComment(i); 
                           }} 
                           className={`text-[10px] uppercase font-bold tracking-wider ml-4 cursor-pointer transition-colors ${
                             isFocused ? 'text-blue-200 hover:text-red-200' : 'text-[#ff453a] hover:text-red-400'
                           }`}
                         >
                           Delete
                         </button>
                       </div>
                     );
                   })}
                </div>
              )}
            </div>
         </div>
         <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-black">
            {/* Карточка студента */}
            <div className="bg-[#121214] border border-[#1f1f23] rounded-lg overflow-hidden mb-5">
              <button 
                type="button"
                onClick={() => setShowStudentCard(!showStudentCard)} 
                className="w-full px-4 py-3 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-900 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa] flex items-center gap-1.5">
                    📋 Информация о студенте
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#8a8a8e]">
                  {showStudentCard ? 'Скрыть' : 'Показать'}
                </span>
              </button>

              {showStudentCard && (
                <div className="p-4 space-y-3.5 border-t border-[#1f1f23] text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-0.5">ФИО Студента</span>
                      <span className="font-semibold text-white text-sm">{essay.full_name || 'Неизвестно'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-0.5">Класс / Группа</span>
                      <span className="font-medium text-[#0071e3] uppercase tracking-wider">{essay.group_name || 'Не назначена'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-[#1f1f23]/60 pt-3">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-0.5">Всего работ</span>
                      <span className="font-mono font-bold text-white text-sm">{previousEssays.length + 1}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold mb-0.5">Дата регистрации</span>
                      <span className="text-[#a1a1aa] font-mono">
                        {essay.student_created_at 
                          ? new Date(essay.student_created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {previousEssays.length > 0 && (
                    <div className="border-t border-[#1f1f23]/60 pt-3 space-y-1.5">
                      <span className="block text-[10px] uppercase tracking-wider text-[#71717a] font-semibold">История оценок (Динамика)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {previousEssays.map((prev) => {
                          const hasBand = prev.status === 'reviewed' && prev.overall_band !== null;
                          return (
                            <div 
                              key={prev.id} 
                              title={prev.task_type === 'task1' ? 'Task 1' : prev.task_type === 'task2' ? 'Task 2' : 'Both'}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                hasBand 
                                  ? getBandBadgeStyle(prev.overall_band)
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                              }`}
                            >
                              <span>T{prev.task_type === 'task1' ? '1' : prev.task_type === 'task2' ? '2' : 'B'}:</span>
                              <span>{hasBand ? Number(prev.overall_band).toFixed(1) : 'FB'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

             <div className="mb-6 p-4 rounded bg-[#121214] border border-[#1f1f23] flex items-center justify-between">
               <label htmlFor="skip-scoring" className="text-xs font-bold uppercase tracking-wider text-[#8a8a8e] cursor-pointer">Feedback Only Mode (No Scores)</label>
               <input id="skip-scoring" type="checkbox" checked={skipScoring} onChange={(e) => setSkipScoring(e.target.checked)} className="cursor-pointer" />
             </div>
            <div className="space-y-4">
              {[{ id: 'ta', name: 'Task Achievement (TA)' }, { id: 'cc', name: 'Coherence & Cohesion (CC)' }, { id: 'lr', name: 'Lexical Resource (LR)' }, { id: 'gra', name: 'Grammatical Range (GRA)' }].map((crit) => (
                <div key={crit.id} className="bg-[#121214] p-4 rounded border border-[#1f1f23] space-y-3">
                  <div className="flex justify-between items-center"><h4 className="font-semibold text-xs uppercase tracking-wider text-[#8a8a8e]">{crit.name}</h4>
                    <select value={(activeScores as any)[crit.id]} onChange={(e) => { const v = parseFloat(e.target.value); if(activeTaskTab===0) setTask1Scores({...task1Scores, [crit.id]:v}); else setTask2Scores({...task2Scores, [crit.id]:v}); }} disabled={skipScoring} className="border border-[#1f1f23] bg-black text-white p-2 rounded text-xs focus:outline-none focus:border-[#374151] cursor-pointer">
                      <option value={0}>-</option>{[0,1,2,3,4,5,5.5,6,6.5,7,7.5,8,8.5,9].map(b => <option key={b} value={b}>{b.toFixed(1)}</option>)}
                    </select>
                  </div>
                  <input type="text" placeholder="Add specific feedback for this criterion..." className="w-full text-xs p-3 bg-black text-white rounded border border-[#1f1f23] focus:outline-none focus:border-[#0071e3]" value={(activeFeedbacks as any)[crit.id]} onChange={(e) => { if(activeTaskTab===0) setTask1Feedbacks({...task1Feedbacks, [crit.id]:e.target.value}); else setTask2Feedbacks({...task2Feedbacks, [crit.id]:e.target.value}); }} />
                </div>
              ))}
              <div className="bg-[#121214] p-5 rounded border border-[#1f1f23] space-y-3">
                 <h4 className="font-semibold text-xs uppercase tracking-wider text-[#8a8a8e]">Overall Comments</h4>
                 <textarea placeholder="Write global evaluation overview and recommendations..." className="w-full text-xs p-4 border border-[#1f1f23] bg-black text-white rounded resize-none focus:outline-none focus:border-[#0071e3]" rows={6} value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)} />
              </div>
            </div>
         </div>
      </div>
      {lightboxImg && (<div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightboxImg(null)}><img src={lightboxImg} alt="Expanded diagram" className="max-w-full max-h-full object-contain rounded" /></div>)}

      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#121214] border border-[#1f1f23] rounded-xl p-6 space-y-4 shadow-none">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Submit mark evaluation?</h3>
            <p className="text-xs text-[#8a8a8e] leading-relaxed">Please make sure you have fully checked all criterion bands and feedback segments. The student will be notified and can inspect the final results immediately.</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setIsConfirmSubmitOpen(false)} className="px-3.5 py-1.5 border border-[#1f1f23] text-[#8a8a8e] hover:text-white rounded-full text-[10px] uppercase tracking-wider font-semibold cursor-pointer">Cancel</button>
              <button onClick={handleSubmit} className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#2997ff] text-white rounded-full text-[10px] uppercase tracking-wider font-semibold cursor-pointer">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}