import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getEssays, getEssayById, createEssay, deleteEssay, deleteLiveDraft } from '@/lib/queries';

export async function GET(request: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const essay = await getEssayById(id);
      if (!essay) return errorResponse('Not found', 404);
      if (session.role === 'student' && essay.student_id !== session.id) {
        return errorResponse('Forbidden', 403);
      }
      return successResponse({ essay });
    }

    const studentFilter = session.role === 'student' ? session.id : undefined;
    const essays = await getEssays(studentFilter);
    return successResponse({ essays });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAuth(['student']);
    if (error) return error;

    const body = await request.json();
    const essay = await createEssay({
      student_id: session.id,
      task_type: body.task_type,
      topic_text: body.topic_text,
      content_task1: body.content_task1,
      content_task2: body.content_task2,
    });

    try {
      await deleteLiveDraft(session.id);
    } catch (e) {
      console.error('Error clearing live draft:', e);
    }

    return successResponse({ essay });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuth(['teacher']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Missing ID', 400);

    await deleteEssay(id);
    return successResponse({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}