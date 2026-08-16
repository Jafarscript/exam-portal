import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { sendMail, templates } from '@/lib/mailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password, fullName } = req.body || {};
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
    role: 'PARENT',
    fullName,
    status: 'PENDING',
  });

  sendMail({ to: user.email, subject: 'Registration received', html: templates.parentRegistrationReceived(fullName) });
  const teacher = await User.findOne({ role: 'TEACHER' });
  if (teacher) {
    sendMail({ to: teacher.email, subject: 'New parent registration', html: templates.newParentForTeacher(fullName, user.email) });
  }

  return res.status(201).json({ message: 'Registration received. You will be notified once approved.' });
}
