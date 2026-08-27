import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();
  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'DRAFT' && exam.status !== 'CLOSED') {
    return res.status(400).json({ error: 'Only draft or closed exams can be published' });
  }

  const { deadline } = req.body || {};
  if (deadline) {
    exam.deadline = new Date(deadline);
  } else if (new Date(exam.deadline) <= new Date()) {
    // If deadline is in the past, push it out 24 hours
    exam.deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const questionCount = await Question.countDocuments({ examId: exam._id });
  if (questionCount === 0) return res.status(400).json({ error: 'Add at least one question before publishing' });
  if (exam.questionsToShow && exam.questionsToShow > questionCount) {
    return res.status(400).json({
      error: `"Questions per student" (${exam.questionsToShow}) is more than the question bank has (${questionCount}). Add more questions or lower the number.`,
    });
  }

  exam.status = 'PUBLISHED';
  exam.publishedAt = new Date();
  await exam.save();
  return res.status(200).json({ exam });
}, ['TEACHER']);
