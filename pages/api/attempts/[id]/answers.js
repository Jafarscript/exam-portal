import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';
import Answer from '@/models/Answer';
import Student from '@/models/Student';

// Autosave & Offline Sync endpoint. Supports individual question updates
// as well as batch sync updates when students reconnect after being offline.
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

  const { questionId, answer, batch, answers } = req.body || {};

  // 1. Batch sync support for offline recovery
  const batchList = Array.isArray(batch)
    ? batch
    : answers && typeof answers === 'object'
    ? Object.entries(answers).map(([qid, ans]) => ({ questionId: qid, answer: ans }))
    : null;

  if (batchList && batchList.length > 0) {
    const validBatch = batchList.filter((b) => b && b.questionId && attempt.questionOrder.includes(String(b.questionId)));
    if (validBatch.length > 0) {
      const now = new Date();
      const operations = validBatch.map((b) => ({
        updateOne: {
          filter: { attemptId: attempt._id, questionId: b.questionId },
          update: { $set: { answer: b.answer, savedAt: now } },
          upsert: true,
        },
      }));
      await Answer.bulkWrite(operations, { ordered: false });
    }
    return res.status(200).json({ synced: validBatch.length, timestamp: new Date().toISOString() });
  }

  // 2. Single question update
  if (!questionId) return res.status(400).json({ error: 'questionId or batch answers is required' });
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
