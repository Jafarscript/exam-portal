import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Exam from '@/models/Exam';
import Subject from '@/models/Subject';
import Class from '@/models/Class';
import Question from '@/models/Question';

export default withAuth(async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    // Teacher sees everything (optionally filtered); this route is
    // teacher-only for listing all exams. Students use /api/student/exams.
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    const { classId, subjectId, status } = req.query;
    const filter = {};
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (status) filter.status = status;
    const exams = await Exam.find(filter)
      .populate({ path: "subjectId", select: "name", model: Subject })
      .populate({ path: "classId", select: "name", model: Class })
      .sort({ createdAt: -1 });
    return res.status(200).json({ exams });
  }

  if (req.method === 'POST') {
    if (req.user.role !== 'TEACHER') return res.status(403).json({ error: 'Not authorized' });
    const { title, description, subjectId, classId, duration, isTimed, deadline, passMark, randomizeQuestions, randomizeAnswers, questionsToShow, requiresLiveApproval } = req.body || {};
    if (!title || !subjectId || !classId || !deadline || passMark === undefined) {
      return res.status(400).json({ error: 'title, subjectId, classId, deadline and passMark are required' });
    }
    if (isTimed && !duration) {
      return res.status(400).json({ error: 'Timed exams require a duration in minutes' });
    }
    if (questionsToShow !== undefined && questionsToShow !== null && questionsToShow !== '' && Number(questionsToShow) <= 0) {
      return res.status(400).json({ error: 'Questions to show must be a positive number' });
    }
    const exam = await Exam.create({
      title,
      description,
      subjectId,
      classId,
      duration: isTimed ? duration : null,
      isTimed: !!isTimed,
      deadline,
      passMark,
      randomizeQuestions: !!randomizeQuestions,
      randomizeAnswers: !!randomizeAnswers,
      questionsToShow: questionsToShow ? Number(questionsToShow) : null,
      requiresLiveApproval: requiresLiveApproval !== undefined ? !!requiresLiveApproval : true,
      status: 'DRAFT',
      createdBy: req.user._id,
    });
    return res.status(201).json({ exam });
  }

  return res.status(405).end();
}, ['TEACHER']);
