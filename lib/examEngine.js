import Attempt from '@/models/Attempt';
import Answer from '@/models/Answer';
import Result from '@/models/Result';
import Question from '@/models/Question';
import Exam from '@/models/Exam';
import Student from '@/models/Student';
import User from '@/models/User';
import { gradeAnswer, isAutoGradable } from '@/lib/grading';
import { sendMail, templates } from '@/lib/mailer';

/**
 * Locks an IN_PROGRESS attempt, grades every question (auto where possible),
 * and creates the Result row. Called both from the student "submit" action
 * and from the timer-expiry auto-submit path, so it lives here rather than
 * inline in one route.
 */
export async function submitAttempt(attemptId) {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status !== 'IN_PROGRESS') {
    return { attempt, alreadySubmitted: true };
  }

  const [exam, questions, existingAnswers] = await Promise.all([
    Exam.findById(attempt.examId).lean(),
    Question.find({ examId: attempt.examId }).lean(),
    Answer.find({ attemptId: attempt._id }).lean(),
  ]);

  const questionsById = Object.fromEntries(questions.map((q) => [String(q._id), q]));
  const answersByQuestion = Object.fromEntries(existingAnswers.map((a) => [String(a.questionId), a]));

  let totalMarks = 0;
  let earnedMarks = 0;
  let hasPending = false;
  const bulkOperations = [];

  for (const qid of attempt.questionOrder) {
    const question = questionsById[qid];
    if (!question) continue;
    totalMarks += question.marks;
    const existing = answersByQuestion[qid];
    const studentAnswer = existing ? existing.answer : null;
    const { marksAwarded, gradingStatus } = gradeAnswer(question, studentAnswer);

    bulkOperations.push({
      updateOne: {
        filter: { attemptId: attempt._id, questionId: question._id },
        update: {
          $set: {
            answer: studentAnswer,
            marksAwarded,
            gradingStatus,
            savedAt: new Date(),
          },
        },
        upsert: true,
      },
    });

    if (gradingStatus === 'PENDING_REVIEW') hasPending = true;
    else earnedMarks += marksAwarded || 0;
  }

  if (bulkOperations.length > 0) {
    await Answer.bulkWrite(bulkOperations);
  }

  attempt.status = hasPending ? 'PENDING_REVIEW' : 'FINALIZED';
  attempt.submittedAt = new Date();
  await attempt.save();

  const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 10000) / 100 : 0;
  const passed = hasPending ? null : percentage >= exam.passMark;

  const result = await Result.findOneAndUpdate(
    { attemptId: attempt._id },
    {
      attemptId: attempt._id,
      studentId: attempt.studentId,
      examId: exam._id,
      totalMarks,
      earnedMarks: hasPending ? 0 : earnedMarks,
      percentage: hasPending ? 0 : percentage,
      passMark: exam.passMark,
      status: hasPending ? 'PENDING' : 'FINAL',
      passed,
      finalizedAt: hasPending ? null : new Date(),
    },
    { upsert: true, new: true }
  );

  // Background notifications - never wait or block submission response
  (async () => {
    try {
      const student = await Student.findById(attempt.studentId).lean();
      const teacher = await User.findOne({ role: 'TEACHER' }).lean();
      if (teacher && student) {
        sendMail({
          to: teacher.email,
          subject: 'Exam submitted',
          html: templates.examSubmittedForTeacher(student.fullName, exam.title),
        });
        if (hasPending) {
          sendMail({
            to: teacher.email,
            subject: 'Manual grading pending',
            html: templates.gradingPendingForTeacher(student.fullName, exam.title),
          });
        }
      }
      if (!hasPending && student) {
        notifyResultFinalized(student, exam, result);
      }
    } catch (e) {
      console.warn('Background notification error:', e.message);
    }
  })();

  return { attempt, result, alreadySubmitted: false };
}

async function notifyResultFinalized(student, exam, result) {
  const recipients = [];
  if (student.userId) {
    const u = await User.findById(student.userId);
    if (u) recipients.push(u.email);
  }
  if (student.parentId) {
    const p = await User.findById(student.parentId);
    if (p) recipients.push(p.email);
  }
  for (const to of recipients) {
    sendMail({
      to,
      subject: 'Result finalized',
      html: templates.resultFinalized(student.fullName, exam.title, result.percentage, result.passed),
    });
  }
}

/**
 * Called after a teacher grades a manual question. If no PENDING_REVIEW
 * answers remain for the attempt, recomputes totals and finalizes the
 * result - this is the only place a Result flips from PENDING to FINAL.
 */
export async function finalizeIfAllGraded(attemptId) {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt || attempt.status !== 'PENDING_REVIEW') return null;

  const stillPending = await Answer.countDocuments({ attemptId, gradingStatus: 'PENDING_REVIEW' });
  if (stillPending > 0) return null;

  const answers = await Answer.find({ attemptId });
  const questions = await Question.find({ _id: { $in: answers.map((a) => a.questionId) } });
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const earnedMarks = answers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
  const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 10000) / 100 : 0;

  const exam = await Exam.findById(attempt.examId);
  const passed = percentage >= exam.passMark;

  attempt.status = 'FINALIZED';
  await attempt.save();

  const result = await Result.findOneAndUpdate(
    { attemptId: attempt._id },
    { earnedMarks, percentage, status: 'FINAL', passed, finalizedAt: new Date() },
    { new: true }
  );

  const student = await Student.findById(attempt.studentId);
  await notifyResultFinalized(student, exam, result);

  return result;
}
