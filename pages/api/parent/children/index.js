import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const { user } = req;

  if (req.method === 'GET') {
    const children = await Student.find({ parentId: user._id }).populate('classId', 'name').sort({ createdAt: 1 });
    return res.status(200).json({ children });
  }

  if (req.method === 'POST') {
    const { fullName, classId, dateOfBirth } = req.body || {};
    if (!fullName) return res.status(400).json({ error: 'Child full name is required' });
    const child = await Student.create({
      parentId: user._id,
      userId: null,
      fullName,
      classId: classId || null,
      dateOfBirth: dateOfBirth || null,
      isIndependent: false,
    });
    return res.status(201).json({ child });
  }

  return res.status(405).end();
}, ['PARENT']);
