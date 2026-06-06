'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Clock, MessageSquare } from 'lucide-react';
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

  if (loading) return <div className="min-h-screen bg-[#050507] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-t-2 border-[var(--color-primary)] animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-[#050507] p-8 flex flex-col items-center justify-center"><p className="text-red-400">{error}</p></div>;
  if (!essay) return <div className="min-h-screen bg-[#050507] flex items-center justify-center"><p className="text-red-400">Not Found</p></div>;
  if (!review) return <div className="min-h-screen bg-[#050507] flex items-center justify-center"><p className="text-white">Review Pending</p></div>;

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
    <div className="max-w-7xl mx-auto space-y-8 bg-[#050507] min-h-screen text-[#F5F5F7] p-4 sm:p-6 lg:p-8 animate-luxury-fade relative font-sans">
      <div className="luxury-bg-glow" /><div className="luxury-grid-overlay opacity-30" />
      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
        <button onClick={() => router.push('/student/dashboard')} className="hover:text-white flex items-center"><ArrowLeft className="w-3.5 h-3.5 mr-1" /> Core</button>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" /><span className="font-bold text-[var(--color-primary)]">Diagnostic Summary</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {showTabs && (
            <div className="flex border-b border-[var(--color-border)]/55 bg-[#0B0B0E] p-1 rounded-t-lg">
              <button onClick={() => setActiveTaskTab(0)} className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold ${activeTaskTab === 0 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>Task 1</button>
              <button onClick={() => setActiveTaskTab(1)} className={`flex-1 py-3 text-xs uppercase tracking-widest font-bold ${activeTaskTab === 1 ? 'bg-[#050507] text-[var(--color-primary)] border-b border-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>Task 2</button>
            </div>
          )}
          <div className="bg-[#0B0B0E] p-6 rounded-lg border border-[var(--color-border)]/55 shadow-xl relative overflow-hidden">
            <h4 className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold mb-3">Context</h4>
            {activeTopic?.image && (<img src={activeTopic.image} alt="Topic" onClick={() => setIsLightboxOpen(true)} className="max-h-[350px] w-full object-contain rounded mb-4 cursor-zoom-in" />)}
            <p className="text-[#F5F5F7]/90 text-sm sm:text-base leading-relaxed italic font-serif">{activeTopic?.text}</p>
          </div>
          <div className="bg-[#0B0B0E] rounded-lg border border-[var(--color-border)]/55 shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8 bg-[#050507]/60">
              <HighlightedText text={textContent} comments={review.comments || []} taskIndex={activeTaskTab} focusedCommentIndex={focusedCommentIndex} setFocusedCommentIndex={setFocusedCommentIndex} />
            </div>
          </div>
          {currentComments.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-[var(--color-primary)] uppercase tracking-wider text-[10px] flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Observations ({currentComments.length})</h4>
              <div className="space-y-3">
                {review.comments.map((c: any, i: number) => c.task_number === activeTaskTab + 1 && (
                  <div key={i} onClick={() => setFocusedCommentIndex(focusedCommentIndex === i ? null : i)} className={`p-5 rounded-lg border text-sm cursor-pointer ${focusedCommentIndex === i ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-[#0B0B0E] border-[var(--color-border)]/55'}`}>
                    <div className="text-[var(--color-text-tertiary)] italic text-xs mb-2 border-l-2 border-[#D4AF37] pl-3">&quot;{c.selected_text}&quot;</div>
                    <div className="text-[#F5F5F7] font-bold text-sm">{c.comment_text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-[#0B0B0E] p-6 sm:p-8 rounded-lg border border-[var(--color-border)]/55 text-center">
            <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-bold mb-2">Overall Score</div>
            <div className={`text-9xl font-black font-sans py-4 ${getBandTextColor(essay.overall_band)}`}>{essay.overall_band ? Number(essay.overall_band).toFixed(1) : 'FB'}</div>
          </div>
          <div className="bg-[#0B0B0E] rounded-lg border border-[var(--color-border)]/55 overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]/55 bg-[#050507]/45">
              {[{ name: 'TA', score: activeScores.ta_band, fb: activeScores.ta_feedback }, { name: 'CC', score: activeScores.cc_band, fb: activeScores.cc_feedback }, { name: 'LR', score: activeScores.lr_band, fb: activeScores.lr_feedback }, { name: 'GRA', score: activeScores.gra_band, fb: activeScores.gra_feedback }].map((crit, idx) => (
                <div key={idx} className="p-4 space-y-2">
                  <div className="flex justify-between items-center"><div className="font-bold text-xs uppercase tracking-wider">{crit.name}</div><div className={`text-xs px-3.5 py-2 rounded ${getBandBadgeStyle(crit.score)}`}>{crit.score ? crit.score : '-'}</div></div>
                  {crit.fb && <div className="text-xs text-[var(--color-text-secondary)] italic leading-relaxed">{crit.fb}</div>}
                </div>
              ))}
            </div>
          </div>
          {generalFeedbackText && <div className="bg-[#0B0B0E] p-5 rounded-lg border border-[var(--color-border)]/55"><p className="text-[var(--color-text-secondary)] text-xs whitespace-pre-wrap">{generalFeedbackText}</p></div>}
        </div>
      </div>
      {isLightboxOpen && activeTopic?.image && (
        <div className="fixed inset-0 z-50 bg-black/98 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsLightboxOpen(false)}>
          <img src={activeTopic.image} alt="Expanded" className="max-w-full max-h-full object-contain rounded" />
        </div>
      )}
    </div>
  );
}