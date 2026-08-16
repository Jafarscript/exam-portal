import { getSessionUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  return res.status(200).json({
    user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName, status: user.status },
  });
}
