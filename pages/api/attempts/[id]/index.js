import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Attempt from '@/models/Attempt';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import Student from '@/models/Student';
import Answer from '@/models/Answer';
import { submitAttempt } from '@/lib/examEngine';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  let attempt = await Attempt.findById(req.query.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const student = await Student.findById(attempt.studentId);
  const owns =
    (req.user.role === 'STUDENT' && String(student.userId) === String(req.user._id)) ||
    (req.user.role === 'PARENT' && String(student.parentId) === String(req.user._id)) ||
    req.user.role === 'TEACHER';
  if (!owns) return res.status(403).json({ error: 'Not authorized' });

  // Belt-and-braces auto-submit: the frontend timer normally triggers submit
  // the moment it hits zero, but if a student closed the tab before that
  // happened, the attempt would otherwise sit IN_PROGRESS forever. Any read
  // of an expired attempt (by the student reopening it, or the teacher
  // checking in) locks it in right here, server-side, before returning data.
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    const { attempt: updated } = await submitAttempt(attempt._id);
    attempt = updated;
  }

  const exam = await Exam.findById(attempt.examId).populate('subjectId', 'name');
  const questions = await Question.find({ examId: exam._id });
  const questionsById = Object.fromEntries(questions.map((q) => [String(q._id), q]));

  const isExpired = attempt.status === 'IN_PROGRESS' && attempt.expiresAt && new Date() > new Date(attempt.expiresAt);

  const answers = await Answer.find({ attemptId: attempt._id });
  const answersByQuestion = Object.fromEntries(answers.map((a) => [String(a.questionId), a]));

  // Build the ordered question list using the persisted order, stripping
  // correctAnswer for students so it never reaches the client during an
  // in-progress attempt.
  const orderedQuestions = attempt.questionOrder
    .map((qid) => questionsById[qid])
    .filter(Boolean)
    .map((q) => {
      const optionOrder = attempt.answerOrder[String(q._id)] || q.options.map((o) => o.id);
      const optionsById = Object.fromEntries(q.options.map((o) => [o.id, o]));
      const orderedOptions = optionOrder.map((oid) => optionsById[oid]).filter(Boolean);
      const base = {
        id: q._id,
        type: q.type,
        text: q.text,
        textDirection: q.textDirection,
        marks: q.marks,
        options: orderedOptions,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
      };
      if (req.user.role === 'TEACHER' || attempt.status !== 'IN_PROGRESS') {
        base.correctAnswer = q.correctAnswer;
      }
      const savedAnswer = answersByQuestion[String(q._id)];
      base.studentAnswer = savedAnswer ? savedAnswer.answer : null;
      if (attempt.status !== 'IN_PROGRESS') {
        base.marksAwarded = savedAnswer ? savedAnswer.marksAwarded : null;
        base.gradingStatus = savedAnswer ? savedAnswer.gradingStatus : null;
        base.feedback = savedAnswer ? savedAnswer.feedback : null;
      }
      return base;
    });

  return res.status(200).json({
    attempt: {
      id: attempt._id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      isExpired,
    },
    exam: {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      subject: exam.subjectId?.name,
      isTimed: exam.isTimed,
      duration: exam.duration,
      deadline: exam.deadline,
      passMark: exam.passMark,
    },
    questions: orderedQuestions,
  });
});
