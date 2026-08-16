import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Class from '@/models/Class';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  if (req.method === 'GET') {
    const classes = await Class.find().sort({ name: 1 });
    return res.status(200).json({ classes });
  }
  if (req.method === 'POST') {
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const cls = await Class.create({ name, description: description || '' });
    return res.status(201).json({ class: cls });
  }
  return res.status(405).end();
}, ['TEACHER']);
