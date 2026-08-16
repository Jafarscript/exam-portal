import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Subject from '@/models/Subject';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const subject = await Subject.findById(req.query.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });

  if (req.method === 'PATCH') {
    const { name, description, isActive } = req.body || {};
    if (name !== undefined) subject.name = name;
    if (description !== undefined) subject.description = description;
    if (isActive !== undefined) subject.isActive = isActive;
    await subject.save();
    return res.status(200).json({ subject });
  }
  if (req.method === 'DELETE') {
    subject.isActive = false;
    await subject.save();
    return res.status(200).json({ message: 'Subject deactivated' });
  }
  return res.status(405).end();
}, ['TEACHER']);
