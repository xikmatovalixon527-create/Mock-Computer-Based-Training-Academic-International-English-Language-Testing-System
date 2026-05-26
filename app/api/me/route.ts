import { requireAuth, successResponse, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;
    
    return successResponse({ user: session });
  } catch (err) {
    return handleApiError(err);
  }
}