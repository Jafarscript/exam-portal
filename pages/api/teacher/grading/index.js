import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const attempts = await Attempt.find({ status: 'PENDING_REVIEW' })
    .populate('examId', 'title')
    .populate('studentId', 'fullName')
    .sort({ submittedAt: 1 });
  return res.status(200).json({ attempts });
}, ['TEACHER']);
