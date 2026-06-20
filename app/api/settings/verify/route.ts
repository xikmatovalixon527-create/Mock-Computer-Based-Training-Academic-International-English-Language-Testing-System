import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { code } = await req.json();
    if (!code) {
      return errorResponse('Code is required', 400);
    }

    let { data: settings, error: dbErr } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (dbErr || !settings) {
      return successResponse({ valid: false, message: 'Settings database not configured' });
    }

    if (!settings.tests_enabled) {
      return successResponse({ valid: false, message: 'Practice sessions are currently disabled globally by the instructor.' });
    }

    const { access_code, code_expires_at } = settings;

    if (!access_code || !code_expires_at) {
      return successResponse({ valid: false, message: 'No active session access code exists.' });
    }

    const isExpired = new Date() > new Date(code_expires_at);
    if (isExpired) {
      return successResponse({ valid: false, message: 'The session access code has expired.' });
    }

    if (access_code !== code.trim()) {
      return successResponse({ valid: false, message: 'Incorrect access code.' });
    }

    return successResponse({ valid: true, message: 'Access granted.' });
  } catch (err) {
    return handleApiError(err);
  }
}
