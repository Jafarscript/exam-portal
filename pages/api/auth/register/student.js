import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Student from '@/models/Student';
import { hashPassword, signToken, setSessionCookie } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password, fullName, classId, dateOfBirth } = req.body || {};
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  await dbConnect();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const user = await User.create({
    email: email.toLowerCase(),
    password: await hashPassword(password),
    role: 'STUDENT',
    fullName,
    status: 'ACTIVE',
  });

  await Student.create({
    userId: user._id,
    parentId: null,
    fullName,
    classId: classId || null,
    dateOfBirth: dateOfBirth || null,
    isIndependent: true,
  });

  const token = signToken({ userId: user._id.toString(), role: user.role, email: user.email });
  setSessionCookie(res, token);
  return res.status(201).json({ user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName } });
}
