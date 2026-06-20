import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { session, error: authError } = await requireAuth();
    if (authError) return authError;

    // Безопасный запрос профиля пользователя из базы данных
    const { data: user, error: dbErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, group_name, created_at')
      .eq('id', session.id)
      .single();

    if (dbErr || !user) {
      return errorResponse('User profile not found in database.', 404);
    }
    
    return successResponse({ 
      user: {
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        groupName: user.group_name,
        createdAt: user.created_at
      } 
    });
  } catch (err) {
    return handleApiError(err);
  }
}