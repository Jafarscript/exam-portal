import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import { generateStudentReportCard } from '@/lib/reportCardEngine';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) {
    return res.status(404).json({ error: 'Student profile not found for this account.' });
  }

  try {
    const reportCard = await generateStudentReportCard(student._id);
    return res.status(200).json({ reportCard });
  } catch (error) {
    console.error('Failed to generate student report card:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate report card' });
  }
}, ['STUDENT']);
