import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import User from '@/models/User';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { status } = req.query;
  const filter = { role: 'PARENT' };
  if (status) filter.status = status;
  const parents = await User.find(filter).sort({ createdAt: -1 });
  return res.status(200).json({ parents });
}, ['TEACHER']);
