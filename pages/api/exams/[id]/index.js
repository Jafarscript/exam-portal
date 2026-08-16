import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import Attempt from '@/models/Attempt';
import Answer from '@/models/Answer';
import Result from '@/models/Result';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;
  const exam = await Exam.findById(id).populate('subjectId', 'name').populate('classId', 'name');
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  if (req.method === 'GET') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    return res.status(200).json({ exam });
  }

  if (req.method === 'PATCH') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    if (exam.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft exams can be edited' });
    }
    const fields = ['title', 'description', 'subjectId', 'classId', 'duration', 'isTimed', 'deadline', 'passMark', 'randomizeQuestions', 'randomizeAnswers', 'questionsToShow'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) exam[f] = req.body[f];
    });
    await exam.save();
    return res.status(200).json({ exam });
  }

  if (req.method === 'DELETE') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    const attemptCount = await Attempt.countDocuments({ examId: exam._id });
    if (attemptCount > 0) {
      return res.status(400).json({ error: 'Cannot delete an exam that already has attempts. Close it instead.' });
    }
    await Question.deleteMany({ examId: exam._id });
    await exam.deleteOne();
    return res.status(200).json({ message: 'Exam deleted' });
  }

  return res.status(405).end();
}, ['TEACHER']);
