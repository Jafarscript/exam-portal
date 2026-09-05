import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import User from '@/models/User';
import Student from '@/models/Student';
import '@/models/Class';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { status } = req.query;
  const filter = { role: 'PARENT' };
  if (status && status !== 'ALL') filter.status = status;

  const parents = await User.find(filter).sort({ createdAt: -1 }).lean();
  const parentIds = parents.map((p) => p._id);

  const children = await Student.find({ parentId: { $in: parentIds }, isActive: true })
    .populate('classId', 'name')
    .populate('userId', 'email fullName')
    .sort({ fullName: 1 })
    .lean();

  const parentsWithChildren = parents.map((p) => ({
    ...p,
    children: children.filter((c) => String(c.parentId) === String(p._id)),
  }));

  return res.status(200).json({ parents: parentsWithChildren });
}, ['TEACHER']);
