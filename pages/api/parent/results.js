import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Result from '@/models/Result';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { user } = req;
  const { studentId } = req.query;

  const child = await Student.findOne({ _id: studentId, parentId: user._id });
  if (!child) return res.status(404).json({ error: 'Child not found' });

  const results = await Result.find({ studentId: child._id })
    .populate({ path: 'examId', select: 'title subjectId', populate: { path: 'subjectId', select: 'name' } })
    .sort({ createdAt: -1 });

  return res.status(200).json({ results });
}, ['PARENT']);
