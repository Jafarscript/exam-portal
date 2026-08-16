import { dbConnect } from '@/lib/db';
import Exam from '@/models/Exam';
import Student from '@/models/Student';
import Attempt from '@/models/Attempt';
import User from '@/models/User';
import { sendMail, templates } from '@/lib/mailer';

/**
 * Sends a reminder to students (and their parent, if any) who have not yet
 * completed an exam that's due within the next 24 hours. Not triggered from
 * the UI - meant to be called on a schedule (e.g. Vercel Cron once a day),
 * protected by CRON_SECRET so it can't be hit by anyone else.
 *
 * Example vercel.json entry:
 *   { "crons": [{ "path": "/api/cron/deadline-reminders", "schedule": "0 8 * * *" }] }
 */
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await dbConnect();

  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const exams = await Exam.find({ status: 'PUBLISHED', deadline: { $gt: new Date(), $lte: in24h } });

  let sent = 0;
  for (const exam of exams) {
    const students = await Student.find({ classId: exam.classId, isActive: true });
    for (const student of students) {
      const attempt = await Attempt.findOne({ examId: exam._id, studentId: student._id });
      if (attempt) continue; // already started or submitted

      const recipients = [];
      if (student.userId) {
        const u = await User.findById(student.userId);
        if (u) recipients.push(u.email);
      }
      if (student.parentId) {
        const p = await User.findById(student.parentId);
        if (p) recipients.push(p.email);
      }
      const deadlineStr = exam.deadline.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' });
      for (const to of recipients) {
        sendMail({ to, subject: 'Exam deadline reminder', html: templates.examDeadlineReminder(student.fullName, exam.title, deadlineStr) });
        sent += 1;
      }
    }
  }

  return res.status(200).json({ message: `Sent ${sent} reminder(s)` });
}
