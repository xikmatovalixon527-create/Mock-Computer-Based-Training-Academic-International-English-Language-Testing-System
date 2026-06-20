import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { validateFullName } from '@/lib/utils';

export async function PUT(request: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { fullName, newPassword } = await request.json();
    const updateData: any = {};

    if (fullName) {
      const trimmed = fullName.trim();
      if (!validateFullName(trimmed)) {
        return errorResponse('Full name must consist of exactly two words containing only Latin letters (e.g., "John Doe").', 400);
      }

      // Check if another user already registered this name
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('full_name', trimmed)
        .neq('id', session.id)
        .maybeSingle();

      if (existing) {
        return errorResponse('This full name is already registered by another user.', 409);
      }
      updateData.full_name = trimmed;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return errorResponse('Password must be at least 6 characters long.', 400);
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(newPassword, salt);
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No changes provided to update.', 400);
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', session.id)
      .select('id, full_name, role, group_name')
      .single();

    if (updateErr) {
      return errorResponse('Failed to update account credentials in database.', 500);
    }

    return successResponse({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}