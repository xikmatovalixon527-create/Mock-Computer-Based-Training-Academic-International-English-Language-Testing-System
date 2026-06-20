import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { code } = await req.json();
    if (!code) {
      return errorResponse('Access code input parameter is required.', 400);
    }

    let { data: settings, error: dbErr } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (dbErr || !settings) {
      return successResponse({ valid: false, message: 'Settings database is currently unconfigured.' });
    }

    const { access_code, code_expires_at } = settings;

    if (!access_code || !code_expires_at) {
      return successResponse({ valid: false, message: 'No active writing session access code exists.' });
    }

    const isExpired = new Date() > new Date(code_expires_at);
    if (isExpired) {
      return successResponse({ valid: false, message: 'This lesson access code has expired.' });
    }

    if (access_code !== code.trim()) {
      return successResponse({ valid: false, message: 'Incorrect lesson code entered.' });
    }

    return successResponse({ valid: true, message: 'Access granted.' });
  } catch (err) {
    return handleApiError(err);
  }
}