import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Subject from '@/models/Subject';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  if (req.method === 'GET') {
    const subjects = await Subject.find().sort({ name: 1 });
    return res.status(200).json({ subjects });
  }
  if (req.method === 'POST') {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const subject = await Subject.create({ name, description: description || '' });
    return res.status(201).json({ subject });
  }
  return res.status(405).end();
}, ['TEACHER']);
