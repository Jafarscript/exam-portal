import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Question from '@/models/Question';
import Exam from '@/models/Exam';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const question = await Question.findById(req.query.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  const exam = await Exam.findById(question.examId);

  if (req.method === 'PATCH') {
    if (exam.status !== 'DRAFT') return res.status(400).json({ error: 'Questions can only be edited while the exam is a draft' });
    const fields = ['type', 'text', 'textDirection', 'marks', 'options', 'correctAnswer', 'imageUrl', 'audioUrl', 'order'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) question[f] = req.body[f];
    });
    await question.save();
    return res.status(200).json({ question });
  }

  if (req.method === 'DELETE') {
    if (exam.status !== 'DRAFT') return res.status(400).json({ error: 'Questions can only be removed while the exam is a draft' });
    await question.deleteOne();
    return res.status(200).json({ message: 'Question removed' });
  }

  return res.status(405).end();
}, ['TEACHER']);
