import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  await dbConnect();
  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  if (exam.status !== 'PUBLISHED') return res.status(400).json({ error: 'Only published exams can be closed' });
  exam.status = 'CLOSED';
  await exam.save();
  return res.status(200).json({ exam });
}, ['TEACHER']);
