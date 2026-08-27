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

  const student = await Student.findById(attempt.studentId).lean();
  const owns =
    (req.user.role === 'STUDENT' && String(student.userId) === String(req.user._id)) ||
    (req.user.role === 'PARENT' && String(student.parentId) === String(req.user._id)) ||
    req.user.role === 'TEACHER';
  if (!owns) return res.status(403).json({ error: 'Not authorized' });

  // Auto-submit if expired
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
    const { attempt: updated } = await submitAttempt(attempt._id);
    attempt = updated;
  }

  const [exam, questions, answers] = await Promise.all([
    Exam.findById(attempt.examId).populate('subjectId', 'name').lean(),
    Question.find({ examId: attempt.examId }).lean(),
    Answer.find({ attemptId: attempt._id }).lean(),
  ]);

  const proctorStatus = attempt.proctorStatus || 'ADMITTED';

  // If student is waiting for teacher admittance after screen-share check,
  // do not expose the exam questions to client memory yet!
  if (req.user.role === 'STUDENT' && proctorStatus === 'WAITING_APPROVAL') {
    return res.status(200).json({
      attempt: {
        id: attempt._id,
        status: attempt.status,
        proctorStatus: 'WAITING_APPROVAL',
        screenShareVerified: attempt.screenShareVerified || false,
        startedAt: null,
        expiresAt: null,
        isExpired: false,
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
        requiresLiveApproval: exam.requiresLiveApproval !== false,
      },
      questions: [],
    });
  }

  const questionsById = Object.fromEntries(questions.map((q) => [String(q._id), q]));
  const answersByQuestion = Object.fromEntries(answers.map((a) => [String(a.questionId), a]));

  const isExpired = attempt.status === 'IN_PROGRESS' && attempt.expiresAt && new Date() > new Date(attempt.expiresAt);

  // Build the ordered question list using the persisted order
  const orderedQuestions = (attempt.questionOrder || [])
    .map((qid) => questionsById[qid])
    .filter(Boolean)
    .map((q) => {
      const optionOrder = (attempt.answerOrder && attempt.answerOrder[String(q._id)]) || (q.options || []).map((o) => o.id);
      const optionsById = Object.fromEntries((q.options || []).map((o) => [o.id, o]));
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
      proctorStatus,
      screenShareVerified: attempt.screenShareVerified || false,
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
      requiresLiveApproval: exam.requiresLiveApproval !== false,
    },
    questions: orderedQuestions,
  });
});
