import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { session, error } = await requireAuth(['student']);
    if (error) return error;

    const { data: draft, error: dbErr } = await supabaseAdmin
      .from('essays')
      .select('*')
      .eq('student_id', session.id)
      .eq('status', 'draft')
      .maybeSingle();

    if (dbErr) {
      return errorResponse('Failed to query ongoing draft state from database.', 500);
    }

    return successResponse({ draft });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAuth(['student']);
    if (error) return error;

    const body = await request.json();
    const { task_type, topic_text, content_task1, content_task2, is_new } = body;

    if (is_new) {
      // Clear out obsolete draft references for the student before initiating a fresh test
      await supabaseAdmin
        .from('essays')
        .delete()
        .eq('student_id', session.id)
        .eq('status', 'draft');

      const { data: newDraft, error: insertErr } = await supabaseAdmin
        .from('essays')
        .insert({
          student_id: session.id,
          task_type,
          topic_text, // Serialized test cockpit parameters
          content_task1: content_task1 || '',
          content_task2: content_task2 || '',
          status: 'draft',
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Insert Draft Error:', insertErr);
        return errorResponse('Failed to initialize a new test draft on database.', 500);
      }

      return successResponse({ draft: newDraft });
    }

    // Standard auto-save interval checkpoint
    const { data: existingDraft, error: findErr } = await supabaseAdmin
      .from('essays')
      .select('id')
      .eq('student_id', session.id)
      .eq('status', 'draft')
      .maybeSingle();

    if (findErr) {
      return errorResponse('Database connection failed to verify active draft state.', 500);
    }

    if (!existingDraft) {
      return errorResponse('No active test draft exists to update.', 400);
    }

    const { data: updatedDraft, error: updateErr } = await supabaseAdmin
      .from('essays')
      .update({
        task_type,
        topic_text,
        content_task1: content_task1 !== undefined ? content_task1 : '',
        content_task2: content_task2 !== undefined ? content_task2 : '',
      })
      .eq('id', existingDraft.id)
      .select()
      .single();

    if (updateErr) {
      console.error('Update Draft Error:', updateErr);
      return errorResponse('Failed to save auto-save snapshot progress to database.', 500);
    }

    return successResponse({ draft: updatedDraft });
  } catch (err) {
    return handleApiError(err);
  }
}