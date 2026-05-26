import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { getAllStudents, deleteStudent, updateStudent } from '@/lib/queries';

export async function GET() {
  try {
    const { error } = await requireAuth(['teacher']);
    if (error) return error;

    const students = await getAllStudents();
    return successResponse({ students });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: Request) {
  try {
    const { error } = await requireAuth(['teacher']);
    if (error) return error;

    const { id, fullName, groupName } = await request.json();
    if (!id || !fullName || !groupName) {
      return errorResponse('Missing required fields', 400);
    }

    const updated = await updateStudent(id, fullName, groupName);
    return successResponse({ student: updated });
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

    await deleteStudent(id);
    return successResponse({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}