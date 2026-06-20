// File: app/api/admin/cleanup/route.ts

import { requireAuth, successResponse, handleApiError, errorResponse } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const { session, error: authError } = await requireAuth(['teacher']);
    if (authError) return authError;

    console.log(`[Admin Cleanup] Started platform-wide cleanup initiated by: ${session.fullName}`);

    // Delete comments first (they reference reviews)
    const { error: commentsErr } = await supabaseAdmin
      .from('comments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (commentsErr) {
      console.error('[Admin Cleanup] Failed to clear comments table:', commentsErr);
      return errorResponse(`Cleanup failed inside 'comments' table: ${commentsErr.message}`, 500);
    }

    // Delete reviews second (they reference essays)
    const { error: reviewsErr } = await supabaseAdmin
      .from('reviews')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (reviewsErr) {
      console.error('[Admin Cleanup] Failed to clear reviews table:', reviewsErr);
      return errorResponse(`Cleanup failed inside 'reviews' table: ${reviewsErr.message}`, 500);
    }

    // Delete essays third (removes practice logs, completed works, and in-progress drafts safely)
    const { error: essaysErr } = await supabaseAdmin
      .from('essays')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (essaysErr) {
      console.error('[Admin Cleanup] Failed to clear essays table:', essaysErr);
      return errorResponse(`Cleanup failed inside 'essays' table: ${essaysErr.message}`, 500);
    }

    console.log('[Admin Cleanup] Platform data cleared successfully. User accounts remain completely intact.');

    return successResponse({
      success: true,
      message: 'Platform database successfully wiped of all draft session, essays, ratings, and evaluation comments. User profiles and registration details remain untouched.'
    });
  } catch (err) {
    return handleApiError(err);
  }
}
