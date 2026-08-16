import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import IntegrityEvent from '@/models/IntegrityEvent';
import Attempt from '@/models/Attempt';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { examId } = req.query;

  let attemptFilter = {};
  if (examId) {
    const attempts = await Attempt.find({ examId }).select('_id');
    attemptFilter = { attemptId: { $in: attempts.map((a) => a._id) } };
  }

  const events = await IntegrityEvent.find(attemptFilter)
    .populate('studentId', 'fullName')
    .populate({ path: 'attemptId', select: 'examId', populate: { path: 'examId', select: 'title' } })
    .sort({ timestamp: -1 });

  return res.status(200).json({ events });
}, ['TEACHER']);
