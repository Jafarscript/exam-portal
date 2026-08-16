import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Result from '@/models/Result';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { examId, studentId } = req.query;
  const filter = {};
  if (examId) filter.examId = examId;
  if (studentId) filter.studentId = studentId;

  const results = await Result.find(filter)
    .populate('studentId', 'fullName')
    .populate({ path: 'examId', select: 'title subjectId', populate: { path: 'subjectId', select: 'name' } })
    .sort({ createdAt: -1 });

  return res.status(200).json({ results });
}, ['TEACHER']);
