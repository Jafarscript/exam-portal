import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';

const VALID_TYPES = ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_BLANK'];

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  if (req.method === 'GET') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    const questions = await Question.find({ examId: exam._id }).sort({ order: 1 });
    return res.status(200).json({ questions });
  }

  if (req.method === 'POST') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    const { type, text, textDirection, marks, options, correctAnswer, imageUrl, audioUrl } = req.body || {};
    if (!type || !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid question type' });
    if (!text || marks === undefined) return res.status(400).json({ error: 'text and marks are required' });
    if (['MCQ', 'MULTI_SELECT'].includes(type) && (!options || options.length < 2)) {
      return res.status(400).json({ error: 'Provide at least two options' });
    }
    if (['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'FILL_BLANK'].includes(type) && (correctAnswer === undefined || correctAnswer === null || correctAnswer === '')) {
      return res.status(400).json({ error: 'A correct answer is required for this question type' });
    }

    const count = await Question.countDocuments({ examId: exam._id });
    const question = await Question.create({
      examId: exam._id,
      type,
      text,
      textDirection: textDirection || 'AUTO',
      marks,
      options: options || [],
      correctAnswer: correctAnswer ?? null,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      order: count,
    });
    return res.status(201).json({ question });
  }

  return res.status(405).end();
}, ['TEACHER']);
