import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Question from '@/models/Question';
import Exam from '@/models/Exam';
import Answer from '@/models/Answer';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const question = await Question.findById(req.query.id);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  const exam = await Exam.findById(question.examId);
  if (!exam) return res.status(404).json({ error: 'Associated exam not found' });

  if (req.method === 'PATCH') {
    const fields = ['type', 'text', 'textDirection', 'marks', 'options', 'correctAnswer', 'imageUrl', 'audioUrl', 'order'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) question[f] = req.body[f];
    });
    await question.save();
    return res.status(200).json({ question });
  }

  if (req.method === 'DELETE') {
    await Answer.deleteMany({ questionId: question._id });
    await question.deleteOne();
    return res.status(200).json({ message: 'Question removed' });
  }

  return res.status(405).end();
}, ['TEACHER']);
