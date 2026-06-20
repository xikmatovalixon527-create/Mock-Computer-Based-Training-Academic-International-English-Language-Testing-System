import { requireAuth, successResponse, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;
    
    return successResponse({ user: session });
  } catch (err) {
    return handleApiError(err);
  }
}import { requireAuth, successResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    // Fetch the verified profile to fetch group assignments securely
    const { data: user, error: dbErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, group_name, created_at')
      .eq('id', session.id)
      .single();

    if (dbErr || !user) {
      return error;
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