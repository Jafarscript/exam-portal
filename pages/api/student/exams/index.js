import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Exam from '@/models/Exam';
import Attempt from '@/models/Attempt';

// Shared by /student/exams (own account) - the same list also powers the
// parent's per-child exam view via ?studentId=, guarded by ownership check.
export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  let student;
  if (req.user.role === 'STUDENT') {
    student = await Student.findOne({ userId: req.user._id });
  } else {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const exams = await Exam.find({
    classId: student.classId,
    status: 'PUBLISHED',
  })
    .populate('subjectId', 'name')
    .sort({ deadline: 1 });

  const attempts = await Attempt.find({ studentId: student._id, examId: { $in: exams.map((e) => e._id) } });
  const attemptByExam = Object.fromEntries(attempts.map((a) => [String(a.examId), a]));

  const withStatus = exams.map((exam) => {
    const attempt = attemptByExam[String(exam._id)];
    let attemptStatus = 'NOT_STARTED';
    if (attempt) attemptStatus = attempt.status;
    return { exam, attemptStatus, attemptId: attempt ? attempt._id : null };
  });

  return res.status(200).json({ exams: withStatus });
}, ['STUDENT']);
