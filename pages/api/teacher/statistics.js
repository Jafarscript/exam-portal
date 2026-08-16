import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import Attempt from '@/models/Attempt';
import Answer from '@/models/Answer';
import Result from '@/models/Result';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { examId } = req.query;
  if (!examId) return res.status(400).json({ error: 'examId is required' });

  const exam = await Exam.findById(examId).populate('classId', 'name').populate('subjectId', 'name');
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  const attempts = await Attempt.find({ examId });
  const finalResults = await Result.find({ examId, status: 'FINAL' });
  const percentages = finalResults.map((r) => r.percentage);

  const summary = {
    submittedCount: attempts.filter((a) => a.status !== 'IN_PROGRESS').length,
    pendingCount: attempts.filter((a) => a.status === 'PENDING_REVIEW').length,
    finalizedCount: finalResults.length,
    averageScore: percentages.length ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100) / 100 : null,
    highestScore: percentages.length ? Math.max(...percentages) : null,
    lowestScore: percentages.length ? Math.min(...percentages) : null,
    passRate: percentages.length ? Math.round((finalResults.filter((r) => r.passed).length / finalResults.length) * 10000) / 100 : null,
    failRate: percentages.length ? Math.round((finalResults.filter((r) => r.passed === false).length / finalResults.length) * 10000) / 100 : null,
  };

  // Per-question difficulty: only counts auto-graded/manually-graded answers
  // from finalized or auto-graded attempts, so in-progress attempts don't skew it.
  const questions = await Question.find({ examId }).sort({ order: 1 });
  const finishedAttemptIds = attempts.filter((a) => a.status !== 'IN_PROGRESS').map((a) => a._id);
  const answers = await Answer.find({ attemptId: { $in: finishedAttemptIds } });

  const perQuestion = questions.map((q) => {
    const qAnswers = answers.filter((a) => String(a.questionId) === String(q._id) && a.marksAwarded !== null);
    const correct = qAnswers.filter((a) => a.marksAwarded >= q.marks).length;
    const incorrect = qAnswers.length - correct;
    return {
      questionId: q._id,
      text: q.text,
      type: q.type,
      numCorrect: correct,
      numIncorrect: incorrect,
      difficultyPercent: qAnswers.length ? Math.round((correct / qAnswers.length) * 10000) / 100 : null,
    };
  });

  return res.status(200).json({
    exam: { id: exam._id, title: exam.title, subject: exam.subjectId?.name, class: exam.classId?.name },
    summary,
    perQuestion,
  });
}, ['TEACHER']);
