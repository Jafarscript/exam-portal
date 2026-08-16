import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';

const VALID_TYPES = ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_BLANK'];

// Accepts { questions: [...] } — the same shape a single POST to
// /questions takes, just many at once — and inserts them in order after
// whatever is already in the bank. All-or-nothing: if any question fails
// validation, nothing is saved, so the teacher can fix and resubmit.
export default withAuth(async function handler(req, res) {
  await dbConnect();
  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
  if (req.method !== 'POST') return res.status(405).end();
  if (exam.status !== 'DRAFT') return res.status(400).json({ error: 'Questions can only be added while the exam is a draft' });

  const { questions } = req.body || {};
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'No questions provided' });
  }

  const startOrder = await Question.countDocuments({ examId: exam._id });
  const docs = [];
  for (let i = 0; i < questions.length; i++) {
    const { type, text, textDirection, marks, options, correctAnswer, imageUrl, audioUrl } = questions[i] || {};
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Question ${i + 1}: invalid type` });
    }
    if (!text || marks === undefined) {
      return res.status(400).json({ error: `Question ${i + 1}: text and marks are required` });
    }
    if (['MCQ', 'MULTI_SELECT'].includes(type) && (!options || options.length < 2)) {
      return res.status(400).json({ error: `Question ${i + 1}: needs at least two options` });
    }
    if (['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'FILL_BLANK'].includes(type) &&
        (correctAnswer === undefined || correctAnswer === null || correctAnswer === '' ||
         (Array.isArray(correctAnswer) && correctAnswer.length === 0))) {
      return res.status(400).json({ error: `Question ${i + 1}: a correct answer is required` });
    }
    docs.push({
      examId: exam._id,
      type,
      text,
      textDirection: textDirection || 'AUTO',
      marks: Number(marks),
      options: options || [],
      correctAnswer: correctAnswer ?? null,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      order: startOrder + i,
    });
  }

  const created = await Question.insertMany(docs);
  return res.status(201).json({ questions: created });
}, ['TEACHER']);
