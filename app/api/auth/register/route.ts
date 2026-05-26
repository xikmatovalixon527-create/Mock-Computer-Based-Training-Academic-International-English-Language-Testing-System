import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByName, createUser } from '@/lib/queries';
import { setAuthCookie } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const { fullName, password, role, groupName } = await request.json();
    if (!fullName || !password || !role) {
      return errorResponse('Missing required fields', 400);
    }
    if (role !== 'student' && role !== 'teacher') {
      return errorResponse('Invalid role', 400);
    }
    if (role === 'student' && !groupName) {
      return errorResponse('Group selection is required for students', 400);
    }

    const existing = await findUserByName(fullName);
    if (existing) {
      return errorResponse('User already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await createUser(fullName, passwordHash, role, groupName) as { id: string; full_name: string; role: string };

    await setAuthCookie(user.id, user.full_name, user.role as 'student' | 'teacher');

    return successResponse({ user });
  } catch (err) {
    return handleApiError(err);
  }
}