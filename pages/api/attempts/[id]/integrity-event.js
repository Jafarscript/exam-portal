import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';
import Student from '@/models/Student';
import IntegrityEvent from '@/models/IntegrityEvent';

const VALID_TYPES = ['TAB_SWITCH', 'FULLSCREEN_EXIT'];

// Logging only - never affects the attempt's grading or status. Teacher-only
// visibility is enforced on the read side (/api/teacher/integrity-events).
export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  const attempt = await Attempt.findById(req.query.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  const student = await Student.findById(attempt.studentId);
  if (req.user.role !== 'STUDENT' || String(student.userId) !== String(req.user._id)) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (attempt.status !== 'IN_PROGRESS') return res.status(200).json({ logged: false });

  const { type } = req.body || {};
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid event type' });

  await IntegrityEvent.create({ attemptId: attempt._id, studentId: student._id, type });
  if (type === 'TAB_SWITCH') attempt.tabSwitchCount += 1;
  if (type === 'FULLSCREEN_EXIT') attempt.fullscreenExitCount += 1;
  await attempt.save();

  return res.status(201).json({ logged: true });
});
