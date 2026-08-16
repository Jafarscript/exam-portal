import crypto from 'crypto';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { sendMail, templates } from '@/lib/mailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always return success even if the email isn't registered, so this
  // endpoint can't be used to enumerate accounts.
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const link = `${process.env.APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    sendMail({ to: user.email, subject: 'Reset your password', html: templates.passwordReset(link) });
  }
  return res.status(200).json({ message: 'If an account exists for that email, a reset link has been sent.' });
}
