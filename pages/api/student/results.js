import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Result from '@/models/Result';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const results = await Result.find({ studentId: student._id })
    .populate({ path: 'examId', select: 'title subjectId', populate: { path: 'subjectId', select: 'name' } })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ results });
}, ['STUDENT']);
