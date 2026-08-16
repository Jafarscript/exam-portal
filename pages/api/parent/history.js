import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Attempt from '@/models/Attempt';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { user } = req;
  const { studentId } = req.query;

  const child = await Student.findOne({ _id: studentId, parentId: user._id });
  if (!child) return res.status(404).json({ error: 'Child not found' });

  const attempts = await Attempt.find({ studentId: child._id })
    .populate('examId', 'title status')
    .sort({ createdAt: -1 });

  return res.status(200).json({ attempts });
}, ['PARENT']);
