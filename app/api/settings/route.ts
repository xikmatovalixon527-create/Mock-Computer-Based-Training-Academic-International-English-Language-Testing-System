import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session as any).role || 'student';

    let { data: settings, error: dbErr } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (dbErr || !settings) {
      settings = {
        tests_enabled: true,
        access_code: null,
        code_expires_at: null
      };
    }

    if (role === 'teacher') {
      return successResponse({
        tests_enabled: true,
        access_code: settings.access_code,
        code_expires_at: settings.code_expires_at
      });
    } else {
      const isCodeActive = !!(settings.access_code && settings.code_expires_at && new Date(settings.code_expires_at) > new Date());
      return successResponse({
        tests_enabled: true,
        code_required: isCodeActive
      });
    }
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAuth(['teacher']);
    if (error) return error;

    const body = await req.json();
    let updateObj: any = {};

    if (body.generate_code === true) {
      // Create random 4-digit numeric code
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      updateObj.access_code = randomCode;
      
      // Expire session access code in exactly 2 hours
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 2);
      updateObj.code_expires_at = expiry.toISOString();
    } else if (body.revoke_code === true) {
      updateObj.access_code = null;
      updateObj.code_expires_at = null;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('platform_settings')
      .upsert({ id: 'global', tests_enabled: true, ...updateObj })
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Database settings configuration write failed: ${updateErr.message}`);
    }

    return successResponse({ settings: updated });
  } catch (err) {
    return handleApiError(err);
  }
}