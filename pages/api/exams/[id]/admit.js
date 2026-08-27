import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Student from '@/models/Student';
import Attempt from '@/models/Attempt';
import Answer from '@/models/Answer';

export default withAuth(async function handler(req, res) {
  await dbConnect();
  const exam = await Exam.findById(req.query.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found' });

  if (req.method === 'GET') {
    // List all students in this exam's class with their live attempt status
    const students = await Student.find({ classId: exam.classId, isActive: true })
      .populate('userId', 'email')
      .sort({ fullName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);
    const attempts = await Attempt.find({ examId: exam._id, studentId: { $in: studentIds } }).lean();
    const attemptsByStudent = Object.fromEntries(attempts.map((a) => [String(a.studentId), a]));

    const attemptIds = attempts.map((a) => a._id);
    const answers = await Answer.find({ attemptId: { $in: attemptIds } }).lean();
    const answerCountsByAttempt = {};
    answers.forEach((ans) => {
      const aid = String(ans.attemptId);
      if (ans.answer !== null && ans.answer !== undefined && ans.answer !== '') {
        answerCountsByAttempt[aid] = (answerCountsByAttempt[aid] || 0) + 1;
      }
    });

    const liveStudents = students.map((s) => {
      const att = attemptsByStudent[String(s._id)];
      return {
        studentId: s._id,
        fullName: s.fullName,
        email: s.userId?.email || null,
        hasAttempt: !!att,
        attemptId: att ? att._id : null,
        attemptStatus: att ? att.status : 'NOT_STARTED',
        proctorStatus: att ? (att.proctorStatus || 'WAITING_APPROVAL') : 'NOT_ENTERED',
        screenShareVerified: att ? att.screenShareVerified : false,
        startedAt: att ? att.startedAt : null,
        expiresAt: att ? att.expiresAt : null,
        tabSwitchCount: att ? att.tabSwitchCount : 0,
        fullscreenExitCount: att ? att.fullscreenExitCount : 0,
        answeredCount: att ? (answerCountsByAttempt[String(att._id)] || 0) : 0,
      };
    });

    return res.status(200).json({
      exam: {
        id: exam._id,
        title: exam.title,
        status: exam.status,
        duration: exam.duration,
        isTimed: exam.isTimed,
        requiresLiveApproval: exam.requiresLiveApproval !== false,
      },
      students: liveStudents,
    });
  }

  if (req.method === 'POST') {
    const { action, studentId } = req.body;
    const now = new Date();

    if (action === 'ADMIT_ALL') {
      // Admit all currently waiting students in this exam
      const waitingAttempts = await Attempt.find({
        examId: exam._id,
        proctorStatus: 'WAITING_APPROVAL',
        status: 'IN_PROGRESS',
      });

      for (const att of waitingAttempts) {
        att.proctorStatus = 'ADMITTED';
        att.screenShareVerified = true;
        att.admittedAt = now;
        att.startedAt = now;
        if (exam.isTimed) {
          att.expiresAt = new Date(now.getTime() + exam.duration * 60 * 1000);
        }
        await att.save();
      }

      return res.status(200).json({
        message: `Admitted ${waitingAttempts.length} students to the exam`,
        admittedCount: waitingAttempts.length,
      });
    }

    if (action === 'ADMIT' && studentId) {
      const att = await Attempt.findOne({ examId: exam._id, studentId });
      if (!att) {
        return res.status(404).json({ error: 'Student has not entered the waiting room yet' });
      }
      att.proctorStatus = 'ADMITTED';
      att.screenShareVerified = true;
      att.admittedAt = now;
      att.startedAt = now;
      if (exam.isTimed) {
        att.expiresAt = new Date(now.getTime() + exam.duration * 60 * 1000);
      }
      await att.save();
      return res.status(200).json({ message: 'Student admitted and exam unlocked', attempt: att });
    }

    if (action === 'REVOKE' && studentId) {
      const att = await Attempt.findOne({ examId: exam._id, studentId });
      if (!att) {
        return res.status(404).json({ error: 'Student attempt not found' });
      }
      att.proctorStatus = 'WAITING_APPROVAL';
      att.screenShareVerified = false;
      await att.save();
      return res.status(200).json({ message: 'Student access paused/revoked', attempt: att });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).end();
}, ['TEACHER']);
