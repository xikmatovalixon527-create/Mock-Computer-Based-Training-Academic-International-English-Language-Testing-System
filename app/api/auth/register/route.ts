import { findUserByName, createUser } from '@/lib/queries';
import { setAuthCookie } from '@/lib/auth-utils';
import { errorResponse, successResponse, handleApiError } from '@/lib/api-utils';
import { validateFullName } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { fullName, password, role, groupName } = await request.json();

    if (!fullName || !password || !role) {
      return errorResponse('All fields are required.', 400);
    }

    const trimmedName = fullName.trim();

    // 1. Strict Name format validation (Only Latin, exactly "First_Name Last_Name")
    if (!validateFullName(trimmedName)) {
      return errorResponse('Full name must consist of exactly two words containing only Latin letters (e.g., "John Doe").', 400);
    }

    // 2. Strict Password complexity & identity checks
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters long.', 400);
    }
    if (password.toLowerCase() === trimmedName.toLowerCase()) {
      return errorResponse('Password cannot be identical to your full name.', 400);
    }

    if (role !== 'student' && role !== 'teacher') {
      return errorResponse('Invalid account role selected.', 400);
    }

    if (role === 'student' && !groupName) {
      return errorResponse('Class group selection is required for students.', 400);
    }

    // 3. Unique name check
    const existing = await findUserByName(trimmedName);
    if (existing) {
      return errorResponse('An account with this full name already exists. Please sign in or use your real name.', 409);
    }

    // Register user in DB
    const user = await createUser(trimmedName, password, role, groupName) as { id: string; full_name: string; role: string };

    // Automatically set auth session cookie
    await setAuthCookie(user.id, user.full_name, user.role as 'student' | 'teacher');

    return successResponse({ user });
  } catch (err) {
    return handleApiError(err);
  }
}