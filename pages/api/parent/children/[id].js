import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const { user } = req;
  const { id } = req.query;

  // Ownership check on every method - a parent must never be able to read or
  // edit a child that belongs to a different parent, even by guessing an id.
  const child = await Student.findOne({ _id: id, parentId: user._id });
  if (!child) return res.status(404).json({ error: 'Child not found' });

  if (req.method === 'GET') return res.status(200).json({ child });

  if (req.method === 'PATCH') {
    const { fullName, classId, dateOfBirth } = req.body || {};
    if (fullName !== undefined) child.fullName = fullName;
    if (classId !== undefined) child.classId = classId || null;
    if (dateOfBirth !== undefined) child.dateOfBirth = dateOfBirth || null;
    await child.save();
    return res.status(200).json({ child });
  }

  if (req.method === 'DELETE') {
    child.isActive = false;
    await child.save();
    return res.status(200).json({ message: 'Child removed' });
  }

  return res.status(405).end();
}, ['PARENT']);
