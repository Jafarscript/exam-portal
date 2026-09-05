import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import { generateStudentReportCard } from '@/lib/reportCardEngine';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const { studentId } = req.query;

  // Retrieve all active children matched to this parent
  const children = await Student.find({ parentId: req.user._id, isActive: true })
    .populate('classId', 'name')
    .sort({ fullName: 1 })
    .lean();

  if (children.length === 0) {
    return res.status(200).json({
      children: [],
      reportCard: null,
      message: 'No children currently matched to your parent account.',
    });
  }

  // Determine which child to load
  let targetChild = null;
  if (studentId) {
    targetChild = children.find((c) => String(c._id) === String(studentId));
    if (!targetChild) {
      return res.status(403).json({ error: 'You do not have access to view this student’s report card.' });
    }
  } else {
    targetChild = children[0];
  }

  try {
    const reportCard = await generateStudentReportCard(targetChild._id);
    return res.status(200).json({
      children: children.map((c) => ({
        _id: c._id,
        fullName: c.fullName,
        className: c.classId?.name || 'No Class',
        isIndependent: !!c.isIndependent,
      })),
      selectedStudentId: targetChild._id,
      reportCard,
    });
  } catch (error) {
    console.error('Failed to generate parent child report card:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate report card' });
  }
}, ['PARENT']);
