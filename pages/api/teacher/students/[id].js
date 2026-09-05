import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const student = await Student.findById(req.query.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  if (req.method === 'PATCH') {
    const { fullName, classId, dateOfBirth, parentId } = req.body || {};
    if (fullName !== undefined) student.fullName = fullName;
    if (classId !== undefined) student.classId = classId || null;
    if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth || null;
    if (parentId !== undefined) student.parentId = parentId || null;
    await student.save();
    return res.status(200).json({ student });
  }

  if (req.method === 'DELETE') {
    student.isActive = false;
    await student.save();
    return res.status(200).json({ message: 'Student removed' });
  }

  return res.status(405).end();
}, ['TEACHER']);
