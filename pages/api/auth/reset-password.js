import crypto from 'crypto';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, token, password } = req.body || {};
  if (!email || !token || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  await dbConnect();
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase(),
    resetToken: hashed,
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetToken +resetTokenExpires');

  if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

  user.password = await hashPassword(password);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  return res.status(200).json({ message: 'Password has been reset. You can now log in.' });
}
