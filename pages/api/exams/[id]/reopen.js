import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();
  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'CLOSED') {
    return res.status(400).json({ error: 'Only closed exams can be reopened' });
  }

  const questionCount = await Question.countDocuments({ examId: exam._id });
  if (questionCount === 0) {
    return res.status(400).json({ error: 'Add at least one question before reopening' });
  }
  if (exam.questionsToShow && exam.questionsToShow > questionCount) {
    return res.status(400).json({
      error: `"Questions per student" (${exam.questionsToShow}) is more than the question bank has (${questionCount}).`,
    });
  }

  const { deadline, requiresLiveApproval } = req.body || {};

  // If a new deadline is provided, update it
  if (deadline) {
    const newDeadline = new Date(deadline);
    if (isNaN(newDeadline.getTime())) {
      return res.status(400).json({ error: 'Invalid deadline date format' });
    }
    if (newDeadline <= new Date()) {
      return res.status(400).json({ error: 'Deadline must be set to a future date/time' });
    }
    exam.deadline = newDeadline;
  } else if (new Date(exam.deadline) <= new Date()) {
    // If previous deadline expired and no new one was provided, default to +24 hours
    exam.deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  if (requiresLiveApproval !== undefined) {
    exam.requiresLiveApproval = Boolean(requiresLiveApproval);
  }

  exam.status = 'PUBLISHED';
  exam.publishedAt = new Date();
  await exam.save();

  return res.status(200).json({ exam, message: 'Exam reopened successfully' });
}, ['TEACHER']);
