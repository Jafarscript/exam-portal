import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import User from '@/models/User';
import Student from '@/models/Student';
import '@/models/Class';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  const parent = await User.findOne({ _id: id, role: 'PARENT' });
  if (!parent) return res.status(404).json({ error: 'Parent not found' });

  if (req.method === 'GET') {
    const children = await Student.find({ parentId: parent._id, isActive: true })
      .populate('classId', 'name')
      .populate('userId', 'email fullName')
      .sort({ fullName: 1 });
    return res.status(200).json({ children });
  }

  if (req.method === 'POST') {
    const { studentId, approveParent } = req.body || {};
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    student.parentId = parent._id;
    await student.save();

    if (approveParent && parent.status === 'PENDING') {
      parent.status = 'APPROVED';
      await parent.save();
    }

    const updatedStudent = await Student.findById(student._id)
      .populate('classId', 'name')
      .populate('userId', 'email fullName');

    return res.status(200).json({
      message: `${student.fullName} has been matched to ${parent.fullName}`,
      student: updatedStudent,
    });
  }

  if (req.method === 'DELETE') {
    const studentId = req.query.studentId || req.body?.studentId;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const student = await Student.findOne({ _id: studentId, parentId: parent._id });
    if (!student) return res.status(404).json({ error: 'Child is not matched to this parent' });

    student.parentId = null;
    await student.save();

    return res.status(200).json({ message: `${student.fullName} has been unlinked from ${parent.fullName}` });
  }

  return res.status(405).end();
}, ['TEACHER']);
