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
    const fields = ['title', 'description', 'subjectId', 'classId', 'duration', 'isTimed', 'deadline', 'passMark', 'randomizeQuestions', 'randomizeAnswers', 'questionsToShow', 'requiresLiveApproval'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) exam[f] = req.body[f];
    });
    await exam.save();
    return res.status(200).json({ exam });
  }

  if (req.method === 'DELETE') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    // Cascade delete all questions, attempts, answers, and results related to this exam
    const attempts = await Attempt.find({ examId: exam._id }).select('_id');
    const attemptIds = attempts.map((a) => a._id);

    if (attemptIds.length > 0) {
      await Answer.deleteMany({ attemptId: { $in: attemptIds } });
      await Result.deleteMany({ examId: exam._id });
      await Attempt.deleteMany({ examId: exam._id });
    }

    await Question.deleteMany({ examId: exam._id });
    await exam.deleteOne();
    return res.status(200).json({ message: 'Exam deleted successfully' });
  }

  return res.status(405).end();
}, ['TEACHER']);
