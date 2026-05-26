import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { upsertLiveDraft, getLiveDraftByStudentId } from '@/lib/queries';

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { task_type, topic_text, content_task1, content_task2, active_tab } = await request.json();

    if (!task_type || !topic_text) {
      return errorResponse('Missing required fields: task_type, topic_text', 400);
    }

    const draft = await upsertLiveDraft({
      student_id: session.id,
      task_type,
      topic_text,
      content_task1: content_task1 || null,
      content_task2: content_task2 || null,
      active_tab: active_tab || 1
    });

    return successResponse({ draft });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return errorResponse('Missing student_id parameter', 400);
    }

    // Access control: Students can only view their own live drafts; teachers can view any.
    if (session.role === 'student' && session.id !== studentId) {
      return errorResponse('Forbidden', 403);
    }

    const draft = await getLiveDraftByStudentId(studentId);
    return successResponse({ draft });
  } catch (err) {
    return handleApiError(err);
  }
}
