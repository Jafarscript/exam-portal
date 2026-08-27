import { dbConnect } from '@/lib/db';
import { getSessionFromReq } from '@/lib/auth';
import User from '@/models/User';
import Student from '@/models/Student';

/**
 * Loads the current session + fresh user doc. Returns null if not authenticated
 * or the account is not ACTIVE/APPROVED. Route handlers should always re-check
 * status server-side rather than trusting the JWT payload alone, since a parent
 * could be rejected after their token was issued.
 */
export async function getSessionUser(req) {
  try {
    const session = getSessionFromReq(req);
    if (!session || !session.userId) return null;
    const conn = await dbConnect();
    if (!conn) return null;
    const user = await User.findById(session.userId);
    if (!user) return null;
    if (user.role === 'PARENT' && user.status !== 'APPROVED') return null;
    if (user.status === 'REJECTED') return null;
    return user;
  } catch (err) {
    console.error('getSessionUser error:', err.message);
    return null;
  }
}

// Wraps an API handler, requiring one of `roles`. Attaches req.user.
export function withAuth(handler, roles = null) {
  return async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (roles && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }
    req.user = user;
    return handler(req, res);
  };
}

// Confirms a student profile belongs to (a) the logged-in student themself, or
// (b) the logged-in parent who owns that child. Used everywhere a
// studentId/attemptId is touched so we never trust the frontend's claim of
// which student a request is "for".
export async function assertOwnsStudent(user, studentId) {
  const student = await Student.findById(studentId);
  if (!student) return null;
  if (user.role === 'STUDENT' && String(student.userId) === String(user._id)) {
    return student;
  }
  if (user.role === 'PARENT' && String(student.parentId) === String(user._id)) {
    return student;
  }
  if (user.role === 'TEACHER') return student;
  return null;
}
