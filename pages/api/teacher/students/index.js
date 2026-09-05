import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export default withAuth(async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { classId } = req.query;
    const filter = { isActive: true };
    if (classId) filter.classId = classId;
    const students = await Student.find(filter)
      .populate('classId', 'name')
      .populate('parentId', 'fullName email status')
      .populate('userId', 'email fullName')
      .sort({ fullName: 1 });
    return res.status(200).json({ students });
  }

  if (req.method === 'POST') {
    // Teacher can add either a plain child profile (no login), or a full
    // independent-student account (email+password) in one step, and optionally assign a parent.
    const { fullName, classId, dateOfBirth, createAccount, email, password, parentId } = req.body || {};
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });

    let userId = null;
    if (createAccount) {
      if (!email || !password) return res.status(400).json({ error: 'email and password are required to create a login' });
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
      const user = await User.create({
        email: email.toLowerCase(),
        password: await hashPassword(password),
        role: 'STUDENT',
        fullName,
        status: 'ACTIVE',
      });
      userId = user._id;
    }

    const student = await Student.create({
      fullName,
      classId: classId || null,
      dateOfBirth: dateOfBirth || null,
      userId,
      parentId: parentId || null,
      isIndependent: !!createAccount,
    });
    return res.status(201).json({ student });
  }

  return res.status(405).end();
}, ['TEACHER']);
