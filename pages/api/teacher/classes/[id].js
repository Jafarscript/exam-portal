import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Class from '@/models/Class';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const cls = await Class.findById(req.query.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  if (req.method === 'PATCH') {
    const { name, description, isActive } = req.body || {};
    if (name !== undefined) cls.name = name;
    if (description !== undefined) cls.description = description;
    if (isActive !== undefined) cls.isActive = isActive;
    await cls.save();
    return res.status(200).json({ class: cls });
  }
  if (req.method === 'DELETE') {
    cls.isActive = false;
    await cls.save();
    return res.status(200).json({ message: 'Class deactivated' });
  }
  return res.status(405).end();
}, ['TEACHER']);
