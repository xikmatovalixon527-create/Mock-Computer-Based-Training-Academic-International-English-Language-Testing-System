import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getReviewByEssayId, saveReview } from '@/lib/queries';
import { calculateOverallBand } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const essay_id = searchParams.get('essay_id');
    if (!essay_id) return errorResponse('Missing essay_id', 400);

    const review = await getReviewByEssayId(essay_id);
    return successResponse({ review: review || null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAuth(['teacher']);
    if (error) return error;

    const body = await request.json();
    const { essay_id, ta_band, ta_feedback, cc_band, cc_feedback, lr_band, lr_feedback, gra_band, gra_feedback, overall_feedback, comments } = body;

    const parseScore = (score: any) => {
      if (score === undefined || score === null || score === '') return null;
      const parsed = typeof score === 'number' ? score : parseFloat(score);
      return isNaN(parsed) || parsed <= 0 ? null : parsed;
    };

    const parsed_ta = parseScore(ta_band);
    const parsed_cc = parseScore(cc_band);
    const parsed_lr = parseScore(lr_band);
    const parsed_gra = parseScore(gra_band);

    const hasScores = parsed_ta !== null && parsed_cc !== null && parsed_lr !== null && parsed_gra !== null;
    const overall_band = hasScores ? calculateOverallBand(parsed_ta!, parsed_cc!, parsed_lr!, parsed_gra!) : null;

    const result = await saveReview({
      essay_id,
      teacher_id: session.id,
      ta_band: parsed_ta, ta_feedback: ta_feedback || '',
      cc_band: parsed_cc, cc_feedback: cc_feedback || '',
      lr_band: parsed_lr, lr_feedback: lr_feedback || '',
      gra_band: parsed_gra, gra_feedback: gra_feedback || '',
      overall_feedback: overall_feedback || '',
      overall_band,
      comments: comments || [],
    });

    return successResponse({ success: true, reviewId: result });
  } catch (err) {
    return handleApiError(err);
  }
}