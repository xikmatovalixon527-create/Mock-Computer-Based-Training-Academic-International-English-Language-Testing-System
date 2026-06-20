import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
import { Role } from '@/types';

export async function setAuthCookie(userId: string, fullName: string, role: Role) {
  const token = await signToken({ id: userId, fullName, role });
  const cookieStore = await cookies();
  
  // sameSite: 'lax' гарантирует надежную авторизацию как в локальной среде разработки,
  // так и на защищенном продуктовом домене, предотвращая CSRF-уязвимости.
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // Сессия на 7 дней
    path: '/',
  });
  return token;
}