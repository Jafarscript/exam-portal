import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import User from '@/models/User';
import { sendMail, templates } from '@/lib/mailer';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  await dbConnect();
  const parent = await User.findOne({ _id: req.query.id, role: 'PARENT' });
  if (!parent) return res.status(404).json({ error: 'Parent not found' });
  parent.status = 'APPROVED';
  await parent.save();
  sendMail({ to: parent.email, subject: 'Account approved', html: templates.parentApproved(parent.fullName) });
  return res.status(200).json({ parent });
}, ['TEACHER']);
