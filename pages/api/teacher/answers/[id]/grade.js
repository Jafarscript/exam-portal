import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Answer from '@/models/Answer';
import Question from '@/models/Question';
import { finalizeIfAllGraded } from '@/lib/examEngine';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  await dbConnect();

  const answer = await Answer.findById(req.query.id);
  if (!answer) return res.status(404).json({ error: 'Answer not found' });

  const question = await Question.findById(answer.questionId);
  const { marksAwarded, feedback } = req.body || {};
  if (marksAwarded === undefined || marksAwarded === null) {
    return res.status(400).json({ error: 'marksAwarded is required' });
  }
  if (marksAwarded < 0 || marksAwarded > question.marks) {
    return res.status(400).json({ error: `Marks must be between 0 and ${question.marks}` });
  }

  answer.marksAwarded = marksAwarded;
  answer.feedback = feedback ?? answer.feedback;
  answer.gradingStatus = 'MANUALLY_GRADED';
  await answer.save();

  const finalizedResult = await finalizeIfAllGraded(answer.attemptId);

  return res.status(200).json({
    answer,
    finalized: !!finalizedResult,
  });
}, ['TEACHER']);
