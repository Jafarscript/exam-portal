import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { verifyPassword, hashPassword, signToken, setSessionCookie } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const db = await dbConnect();
  if (!db) {
    console.error('[AUTH LOGIN ERROR] Database not connected. Check MONGODB_URI.');
    return res.status(500).json({ error: 'Database connection failure. Please check MONGODB_URI.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let user = await User.findOne({ email: cleanEmail }).select('+password');
  
  // If not found with exact trimmed lowercase, try case-insensitive regex in case it was stored with mixed case
  if (!user) {
    user = await User.findOne({ email: new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }).select('+password');
  }

  if (!user) {
    console.warn(`[AUTH LOGIN FAILED] No user document found for email: "${cleanEmail}" in database "${db.connection.name}"`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    console.warn(`[AUTH LOGIN FAILED] Password mismatch for user: "${cleanEmail}" (Role: ${user.role}) in database "${db.connection.name}"`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // If password was stored in plain text, transparently hash and update it now
  if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    try {
      user.password = await hashPassword(password);
      await user.save();
    } catch (e) {
      console.warn('Could not auto-upgrade password hash:', e.message);
    }
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
