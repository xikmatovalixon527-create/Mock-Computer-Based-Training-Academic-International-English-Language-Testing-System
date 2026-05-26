import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByName } from '@/lib/queries';
import { setAuthCookie } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const { fullName, password } = await request.json();
    if (!fullName || !password) {
      return errorResponse('Missing credentials', 400);
    }

    const user = await findUserByName(fullName) as { id: string; full_name: string; password_hash: string; role: string } | null;
    if (!user) {
      return errorResponse('Invalid name or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return errorResponse('Invalid name or password', 401);
    }

    await setAuthCookie(user.id, user.full_name, user.role as 'student' | 'teacher');

    return successResponse({ user: { id: user.id, fullName: user.full_name, role: user.role } });
  } catch (err) {
    return handleApiError(err);
  }
}