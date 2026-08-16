import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import Student from '@/models/Student';
import Attempt from '@/models/Attempt';
import { shuffle, seedFromString } from '@/lib/grading';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'PUBLISHED') return res.status(400).json({ error: 'This exam is not currently available' });
  if (String(exam.classId) !== String(student.classId)) {
    return res.status(403).json({ error: 'This exam is not assigned to your class' });
  }
  if (new Date() > new Date(exam.deadline)) {
    return res.status(400).json({ error: 'The deadline for this exam has passed' });
  }

  // Resume: an existing IN_PROGRESS attempt is returned as-is, never
  // re-randomized. A SUBMITTED/PENDING_REVIEW/FINALIZED attempt means the
  // student's one attempt is used up.
  const existing = await Attempt.findOne({ examId: exam._id, studentId: student._id });
  if (existing) {
    if (existing.status !== 'IN_PROGRESS') {
      return res.status(409).json({ error: 'You have already attempted this exam' });
    }
    return res.status(200).json({ attemptId: existing._id, resumed: true });
  }

  const questions = await Question.find({ examId: exam._id }).sort({ order: 1 });
  if (questions.length === 0) return res.status(400).json({ error: 'This exam has no questions yet' });

  const bankOrder = questions.map((q) => String(q._id));
  const answerOrder = {};
  // Seed randomization off examId+studentId so it's deterministic per
  // student but still created fresh (not reused across students).
  const seed = seedFromString(`${exam._id}-${student._id}`);

  // Draw the subset each student actually sits, e.g. 20 random questions
  // out of a 40-question bank. Selection happens once, here, and is then
  // persisted as questionOrder - resuming never redraws or reshuffles it.
  let questionIds = bankOrder;
  if (exam.questionsToShow && exam.questionsToShow < bankOrder.length) {
    const drawn = shuffle(bankOrder, seed).slice(0, exam.questionsToShow);
    // Unless question-order randomization is also on, present the drawn
    // subset in the exam's original bank order rather than shuffle order.
    questionIds = exam.randomizeQuestions ? drawn : bankOrder.filter((id) => drawn.includes(id));
  } else if (exam.randomizeQuestions) {
    questionIds = shuffle(bankOrder, seed);
  }

  const selectedQuestions = questions.filter((q) => questionIds.includes(String(q._id)));
  selectedQuestions.forEach((q, idx) => {
    if (exam.randomizeAnswers && ['MCQ', 'MULTI_SELECT'].includes(q.type) && q.options.length > 0) {
      const optionIds = q.options.map((o) => o.id);
      answerOrder[String(q._id)] = shuffle(optionIds, seed + idx + 1);
    } else {
      answerOrder[String(q._id)] = q.options.map((o) => o.id);
    }
  });

  const now = new Date();
  const expiresAt = exam.isTimed ? new Date(now.getTime() + exam.duration * 60 * 1000) : null;

  try {
    const attempt = await Attempt.create({
      examId: exam._id,
      studentId: student._id,
      status: 'IN_PROGRESS',
      startedAt: now,
      expiresAt,
      questionOrder: questionIds,
      answerOrder,
    });
    return res.status(201).json({ attemptId: attempt._id, resumed: false });
  } catch (err) {
    // Unique (examId, studentId) index is the backend backstop against a
    // race where two "start" requests land at the same time.
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already attempted this exam' });
    }
    throw err;
  }
}, ['STUDENT']);
