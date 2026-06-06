'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Essay } from '@/types';
import { getBandBadgeStyle, getBandTextColor } from '@/lib/utils';
import { HighlightedText } from '@/components/highlighted-text';

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
      fetch(`/api/essays?id=${id}`).then(res => { if (!res.ok) throw new Error('Failed to load essay'); return res.json(); }),
      fetch(`/api/reviews?essay_id=${id}`).then(res => { if (!res.ok) throw new Error('Failed to load review'); return res.json(); })
    ]).then(([essayData, reviewData]) => {
      if (essayData.essay) {
        setEssay(essayData.essay);
        try { setTopicData(JSON.parse(essayData.essay.topic_text)); } catch { setTopicData({ task1: { text: essayData.essay.topic_text }, task2: { text: essayData.essay.topic_text } }); }
        if (essayData.essay.task_type === 'task2') setActiveTaskTab(1);
      }
      if (reviewData.review) setReview(reviewData.review);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-6 h-6 border-t-2 border-white rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-black p-8 flex flex-col items-center justify-center"><p className="text-red-400 text-sm font-semibold">{error}</p></div>;
  if (!essay) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-neutral-400 text-sm">Not Found</p></div>;
  if (!review) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-neutral-400 text-sm">Review Pending</p></div>;

  const showTabs = essay.task_type === 'both';
  const textContent = activeTaskTab === 0 ? (essay.content_task1 || '') : (essay.content_task2 || '');
  const activeTopic = activeTaskTab === 0 ? topicData?.task1 : topicData?.task2;
  const currentComments = (review.comments || []).filter((c: any) => c.task_number === activeTaskTab + 1);
  
  let activeScores = { ta_band: review.ta_band, ta_feedback: review.ta_feedback, cc_band: review.cc_band, cc_feedback: review.cc_feedback, lr_band: review.lr_band, lr_feedback: review.lr_feedback, gra_band: review.gra_band, gra_feedback: review.gra_feedback };
  let generalFeedbackText = review.overall_feedback;

  try {
    if (review.overall_feedback?.startsWith('{')) {
      const parsed = JSON.parse(review.overall_feedback);
      if (parsed.task1 && parsed.task2) {
        const activeStats = activeTaskTab === 0 ? parsed.task1 : parsed.task2;
        activeScores = { ta_band: activeStats.scores.ta, ta_feedback: activeStats.feedbacks.ta, cc_band: activeStats.scores.cc, cc_feedback: activeStats.feedbacks.cc, lr_band: activeStats.scores.lr, lr_feedback: activeStats.feedbacks.lr, gra_band: activeStats.scores.gra, gra_feedback: activeStats.feedbacks.gra };
        generalFeedbackText = parsed.general_comment;
      }
    }
  } catch {}

  return (
    <div className="max-w-7xl mx-auto space-y-6 bg-black min-h-screen text-white p-4 sm:p-6 lg:p-8 relative">
      <div className="luxury-grid-overlay opacity-20" />
      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-neutral-500 mb-4">
        <button onClick={() => router.push('/student/dashboard')} className="hover:text-white flex items-center cursor-pointer"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Dashboard</button>
        <ChevronRight className="w-3 h-3 opacity-50" /><span className="font-semibold text-white">Evaluation Results</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {showTabs && (
            <div className="flex border-b border-neutral-900 bg-neutral-950 p-1 rounded-t-lg">
              <button onClick={() => setActiveTaskTab(0)} className={`flex-1 py-2 text-xs uppercase tracking-wider font-semibold cursor-pointer ${activeTaskTab === 0 ? 'bg-black text-white border-b border-white' : 'text-neutral-500'}`}>Task 1</button>
              <button onClick={() => setActiveTaskTab(1)} className={`flex-1 py-2 text-xs uppercase tracking-wider font-semibold cursor-pointer ${activeTaskTab === 1 ? 'bg-black text-white border-b border-white' : 'text-neutral-500'}`}>Task 2</button>
            </div>
          )}
          <div className="bg-neutral-950 p-5 rounded-lg border border-neutral-900 shadow-xl">
            <h4 className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-2">Prompt Context</h4>
            {activeTopic?.image && (<img src={activeTopic.image} alt="Task diagram" onClick={() => setIsLightboxOpen(true)} className="max-h-[300px] w-full object-contain rounded mb-4 cursor-zoom-in border border-neutral-900" />)}
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed italic font-serif">{activeTopic?.text}</p>
          </div>
          <div className="bg-neutral-950 rounded-lg border border-neutral-900 shadow-xl overflow-hidden">
            <div className="p-6 bg-black/60 min-h-[300px]">
              <HighlightedText text={textContent} comments={review.comments || []} taskIndex={activeTaskTab} focusedCommentIndex={focusedCommentIndex} setFocusedCommentIndex={setFocusedCommentIndex} />
            </div>
          </div>
          {currentComments.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-neutral-400 uppercase tracking-wider text-xs flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Comments ({currentComments.length})</h4>
              <div className="space-y-2">
                {review.comments.map((c: any, i: number) => c.task_number === activeTaskTab + 1 && (
                  <div key={i} onClick={() => setFocusedCommentIndex(focusedCommentIndex === i ? null : i)} className={`p-4 rounded border text-sm cursor-pointer transition-all ${focusedCommentIndex === i ? 'bg-white text-black border-white' : 'bg-neutral-950 border-neutral-900'}`}>
                    <div className={`text-xs italic mb-1.5 border-l-2 pl-2 ${focusedCommentIndex === i ? 'border-black text-black/70' : 'border-neutral-700 text-neutral-400'}`}>&quot;{c.selected_text}&quot;</div>
                    <div className="font-medium text-sm leading-relaxed">{c.comment_text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-neutral-950 p-6 rounded-lg border border-neutral-900 text-center">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Overall Band Score</div>
            <div className={`text-7xl font-bold py-2 ${getBandTextColor(essay.overall_band)}`}>
              {essay.overall_band ? Number(essay.overall_band).toFixed(1) : 'FB'}
            </div>
          </div>
          <div className="bg-neutral-950 rounded-lg border border-neutral-900 overflow-hidden">
            <div className="divide-y divide-neutral-900">
              {[{ name: 'Task Achievement (TA)', score: activeScores.ta_band, fb: activeScores.ta_feedback }, { name: 'Coherence & Cohesion (CC)', score: activeScores.cc_band, fb: activeScores.cc_feedback }, { name: 'Lexical Resource (LR)', score: activeScores.lr_band, fb: activeScores.lr_feedback }, { name: 'Grammatical Range (GRA)', score: activeScores.gra_band, fb: activeScores.gra_feedback }].map((crit, idx) => (
                <div key={idx} className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-xs uppercase tracking-wider text-neutral-400">{crit.name}</div>
                    <div className={`text-xs px-2.5 py-1 rounded border font-mono ${getBandBadgeStyle(crit.score)}`}>{crit.score ? Number(crit.score).toFixed(1) : '-'}</div>
                  </div>
                  {crit.fb && <div className="text-xs text-neutral-400 italic leading-relaxed">{crit.fb}</div>}
                </div>
              ))}
            </div>
          </div>
          {generalFeedbackText && (
            <div className="bg-neutral-950 p-5 rounded-lg border border-neutral-900">
              <h4 className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-2">General Feedback</h4>
              <p className="text-neutral-300 text-xs whitespace-pre-wrap leading-relaxed">{generalFeedbackText}</p>
            </div>
          )}
        </div>
      </div>
      {isLightboxOpen && activeTopic?.image && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}>
          <img src={activeTopic.image} alt="Expanded diagram" className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}
    </div>
  );
}