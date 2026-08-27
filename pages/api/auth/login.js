import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { verifyPassword, signToken, setSessionCookie } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.role === 'PARENT' && user.status === 'PENDING') {
    return res.status(403).json({ error: 'Your account is still pending teacher approval' });
  }
  if (user.status === 'REJECTED') {
    return res.status(403).json({ error: 'Your account registration was not approved' });
  }

  const token = signToken({ userId: user._id.toString(), role: user.role, email: user.email });
  setSessionCookie(res, token);
  return res.status(200).json({ token, user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName } });
}
