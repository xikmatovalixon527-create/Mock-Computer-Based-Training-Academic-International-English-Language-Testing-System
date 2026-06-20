import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { supabaseAdmin } from '@/lib/supabase';

// Get current platform settings
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const role = (session as any).role || 'student';

    // Retrieve from platform_settings table; default to auto-created 'global' row
    let { data: settings, error: dbErr } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (dbErr || !settings) {
      // If table doesn't exist or doesn't have the global key, create a default fallback response
      settings = {
        tests_enabled: true,
        access_code: null,
        code_expires_at: null
      };
    }

    if (role === 'teacher') {
      return successResponse({
        tests_enabled: settings.tests_enabled,
        access_code: settings.access_code,
        code_expires_at: settings.code_expires_at
      });
    } else {
      // Students should not see the access code itself! Leak protection.
      const isCodeActive = !!(settings.access_code && settings.code_expires_at && new Date(settings.code_expires_at) > new Date());
      return successResponse({
        tests_enabled: settings.tests_enabled,
        code_required: isCodeActive
      });
    }
  } catch (err) {
    return handleApiError(err);
  }
}

// Modify platform settings (Teacher-only)
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth(['teacher']);
    if (error) return error;

    const body = await req.json();

    // Check if table exists or needs creation: we can let Prisma/Drizzle handle it or just do it via direct RPC/Admin insert
    let updateObj: any = {};
    if (typeof body.tests_enabled === 'boolean') {
      updateObj.tests_enabled = body.tests_enabled;
    }

    if (body.generate_code === true) {
      // Generate random 4-digit numeric code
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      updateObj.access_code = randomCode;
      // Expires in exactly 2 hours
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 2);
      updateObj.code_expires_at = expiry.toISOString();
    } else if (body.revoke_code === true) {
      updateObj.access_code = null;
      updateObj.code_expires_at = null;
    }

    // Attempt to update the settings row
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('platform_settings')
      .upsert({ id: 'global', ...updateObj })
      .select()
      .single();

    if (updateErr) {
      // Fallback: in-memory / mock or log error
      throw new Error(`Database write failed. Ensure table 'platform_settings' is created: ${updateErr.message}`);
    }

    return successResponse({ settings: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
