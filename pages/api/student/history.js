import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Attempt from '@/models/Attempt';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const attempts = await Attempt.find({ studentId: student._id })
    .populate('examId', 'title status')
    .sort({ createdAt: -1 });

  return res.status(200).json({ attempts });
}, ['STUDENT']);
