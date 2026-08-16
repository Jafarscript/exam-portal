import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';
import Student from '@/models/Student';
import { submitAttempt } from '@/lib/examEngine';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  const attempt = await Attempt.findById(req.query.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const student = await Student.findById(attempt.studentId);
  if (req.user.role !== 'STUDENT' || String(student.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (attempt.status !== 'IN_PROGRESS') {
    // Idempotent: a duplicate submit click (or a race between the timer's
    // auto-submit and a manual click) is not an error, just a no-op.
    return res.status(200).json({ message: 'Already submitted', alreadySubmitted: true });
  }

  const { result } = await submitAttempt(attempt._id);
  return res.status(200).json({
    message: 'Exam submitted',
    status: result.status === 'FINAL' ? 'FINALIZED' : 'PENDING_REVIEW',
    result: result.status === 'FINAL' ? { percentage: result.percentage, passed: result.passed } : null,
  });
});
