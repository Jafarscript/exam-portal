import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import Attempt from '@/models/Attempt';

// Pre-start preview: title, subject, instructions, question count, duration,
// deadline - deliberately no question content yet, so a student can decide
// whether to begin without any answer key or content leaking early.
export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const student = await Student.findOne({ userId: req.user._id }).lean();
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const [exam, attempt] = await Promise.all([
    Exam.findById(req.query.id).populate('subjectId', 'name').lean(),
    Attempt.findOne({ examId: req.query.id, studentId: student._id }).lean(),
  ]);

  if (!exam || exam.status !== 'PUBLISHED') return res.status(404).json({ error: 'Exam not found' });
  if (String(exam.classId) !== String(student.classId)) {
    return res.status(403).json({ error: 'This exam is not assigned to your class' });
  }

  const bankCount = await Question.countDocuments({ examId: exam._id });

  // Before starting: show the prospective subset size (if the exam draws a
  // random subset). Once started: show the actual count already drawn for
  // this attempt, which is fixed and won't change.
  const questionCount = attempt
    ? attempt.questionOrder.length
    : exam.questionsToShow && exam.questionsToShow < bankCount
    ? exam.questionsToShow
    : bankCount;

  return res.status(200).json({
    exam: {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      subject: exam.subjectId?.name,
      isTimed: exam.isTimed,
      duration: exam.duration,
      deadline: exam.deadline,
    },
    questionCount,
    bankCount,
    attemptStatus: attempt ? attempt.status : 'NOT_STARTED',
  });
}, ['STUDENT']);
