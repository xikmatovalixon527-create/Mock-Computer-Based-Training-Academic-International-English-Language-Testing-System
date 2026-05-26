import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
import { Role } from '@/types';

export async function setAuthCookie(userId: string, fullName: string, role: Role) {
  const token = await signToken({ id: userId, fullName, role });
  const cookieStore = await cookies();
  
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  
  return token;
}
