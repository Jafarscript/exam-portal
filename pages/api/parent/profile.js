import { withAuth } from '@/lib/apiAuth';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { user } = req;
  return res.status(200).json({ id: user._id, email: user.email, fullName: user.fullName, status: user.status });
}, ['PARENT']);
