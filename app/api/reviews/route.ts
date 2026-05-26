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
    const overall_band = calculateOverallBand(ta_band, cc_band, lr_band, gra_band);

    const result = await saveReview({
      essay_id,
      teacher_id: session.id,
      ta_band: parseFloat(ta_band), ta_feedback: ta_feedback || '',
      cc_band: parseFloat(cc_band), cc_feedback: cc_feedback || '',
      lr_band: parseFloat(lr_band), lr_feedback: lr_feedback || '',
      gra_band: parseFloat(gra_band), gra_feedback: gra_feedback || '',
      overall_feedback: overall_feedback || '',
      overall_band,
      comments: comments || [],
    });

    return successResponse({ success: true, reviewId: result });
  } catch (err) {
    return handleApiError(err);
  }
}