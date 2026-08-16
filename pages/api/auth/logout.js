import { clearSessionCookie } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  clearSessionCookie(res);
  return res.status(200).json({ message: 'Logged out' });
}
