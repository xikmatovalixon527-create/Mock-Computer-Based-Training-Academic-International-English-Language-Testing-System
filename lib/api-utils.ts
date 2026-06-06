import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { Role } from '@/types';

export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse<T>(data: T) {
  return NextResponse.json(data);
}

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await getSession();
  if (!session) {
    return { error: errorResponse('Unauthorized', 401) };
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { error: errorResponse('Forbidden', 403) };
  }
  return { session };
}

export function handleApiError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal server error';
  return errorResponse(message, 500);
}