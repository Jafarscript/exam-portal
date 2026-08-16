import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';
import Answer from '@/models/Answer';
import Student from '@/models/Student';

// Autosave endpoint. Frontend debounces calls per-question; this handler
// just needs to be idempotent and fast. Upserts so "save on every change"
// never creates duplicate rows.
export default withAuth(async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  await dbConnect();

  const attempt = await Attempt.findById(req.query.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const student = await Student.findById(attempt.studentId);
  if (req.user.role !== 'STUDENT' || String(student.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (attempt.status !== 'IN_PROGRESS') {
    return res.status(409).json({ error: 'This attempt is no longer editable' });
  }
  if (attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    return res.status(409).json({ error: 'Time is up for this exam. Submit to finish.', expired: true });
  }

  const { questionId, answer } = req.body || {};
  if (!questionId) return res.status(400).json({ error: 'questionId is required' });
  if (!attempt.questionOrder.includes(String(questionId))) {
    return res.status(400).json({ error: 'That question does not belong to this attempt' });
  }

  const saved = await Answer.findOneAndUpdate(
    { attemptId: attempt._id, questionId },
    { answer, savedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(200).json({ savedAt: saved.savedAt });
});
