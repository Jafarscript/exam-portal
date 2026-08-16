import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';
import Question from '@/models/Question';
import Answer from '@/models/Answer';
import Exam from '@/models/Exam';
import Student from '@/models/Student';

// Teacher's grading view for one attempt - full question text, student
// answer, marks, and current grading status for every question in order.
export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const attempt = await Attempt.findById(req.query.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  const exam = await Exam.findById(attempt.examId).populate('subjectId', 'name');
  const student = await Student.findById(attempt.studentId);
  const questions = await Question.find({ examId: exam._id });
  const questionsById = Object.fromEntries(questions.map((q) => [String(q._id), q]));
  const answers = await Answer.find({ attemptId: attempt._id });

  const items = attempt.questionOrder
    .map((qid) => {
      const q = questionsById[qid];
      const a = answers.find((x) => String(x.questionId) === qid);
      if (!q || !a) return null;
      return {
        answerId: a._id,
        questionText: q.text,
        textDirection: q.textDirection,
        type: q.type,
        marks: q.marks,
        studentAnswer: a.answer,
        marksAwarded: a.marksAwarded,
        gradingStatus: a.gradingStatus,
        feedback: a.feedback,
      };
    })
    .filter(Boolean);

  return res.status(200).json({
    attempt: { id: attempt._id, status: attempt.status, submittedAt: attempt.submittedAt },
    exam: { title: exam.title, subject: exam.subjectId?.name },
    student: { fullName: student.fullName },
    items,
  });
}, ['TEACHER']);
