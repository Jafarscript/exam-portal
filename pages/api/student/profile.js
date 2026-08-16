import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const student = await Student.findOne({ userId: req.user._id }).populate('classId', 'name');
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  return res.status(200).json({ student });
}, ['STUDENT']);
