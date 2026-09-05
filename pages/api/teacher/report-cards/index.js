import { dbConnect } from '@/lib/db';
import { withAuth } from '@/lib/apiAuth';
import Student from '@/models/Student';
import Result from '@/models/Result';
import ReportRemark from '@/models/ReportRemark';
import Class from '@/models/Class';
import { generateStudentReportCard, getLetterGrade } from '@/lib/reportCardEngine';

export default withAuth(async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { studentId, classId } = req.query;

    // Single student full report card
    if (studentId) {
      try {
        const reportCard = await generateStudentReportCard(studentId);
        return res.status(200).json({ reportCard });
      } catch (err) {
        return res.status(404).json({ error: err.message || 'Student report card could not be generated' });
      }
    }

    // List of students with summary metrics for teacher view
    const filter = { isActive: true };
    if (classId) filter.classId = classId;

    const students = await Student.find(filter)
      .populate('classId', 'name')
      .populate('parentId', 'fullName email')
      .populate('userId', 'email')
      .sort({ fullName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // Fetch remarks for these students
    const remarks = await ReportRemark.find({ studentId: { $in: studentIds } }).lean();
    const remarksMap = Object.fromEntries(remarks.map((r) => [String(r.studentId), r]));

    // Fetch finalized results for these students
    const results = await Result.find({ studentId: { $in: studentIds }, status: 'FINAL' }).lean();
    const resultsByStudent = {};
    results.forEach((r) => {
      const sid = String(r.studentId);
      if (!resultsByStudent[sid]) resultsByStudent[sid] = [];
      resultsByStudent[sid].push(r);
    });

    const studentSummaries = students.map((s) => {
      const sResults = resultsByStudent[String(s._id)] || [];
      const totalPossible = sResults.reduce((sum, r) => sum + (r.totalMarks || 0), 0);
      const totalEarned = sResults.reduce((sum, r) => sum + (r.earnedMarks || 0), 0);
      const avg = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 10000) / 100 : 0;
      const grade = getLetterGrade(avg);
      const remark = remarksMap[String(s._id)];

      return {
        _id: s._id,
        fullName: s.fullName,
        className: s.classId?.name || 'Unassigned',
        classId: s.classId?._id || null,
        parentName: s.parentId?.fullName || null,
        isIndependent: !!s.isIndependent,
        loginEmail: s.userId?.email || null,
        examsCount: sResults.length,
        averagePercentage: avg,
        grade: grade.letter,
        gradeLabel: grade.label,
        gradeColor: grade.color,
        hasCustomRemark: !!(remark?.teacherRemark || remark?.principalRemark),
        conductRating: remark?.conductRating || 'EXCELLENT',
      };
    });

    return res.status(200).json({ students: studentSummaries });
  }

  if (req.method === 'POST' || req.method === 'PATCH') {
    const {
      studentId,
      termName,
      academicSession,
      teacherRemark,
      principalRemark,
      conductRating,
      attendanceRate,
      nextTermBegins,
    } = req.body || {};

    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const updatedRemark = await ReportRemark.findOneAndUpdate(
      { studentId },
      {
        studentId,
        termName: termName || 'Term 1 (2026/2027)',
        academicSession: academicSession || '2026/2027 Academic Session',
        teacherRemark: teacherRemark ?? '',
        principalRemark: principalRemark ?? '',
        conductRating: conductRating || 'EXCELLENT',
        attendanceRate: attendanceRate !== undefined ? Number(attendanceRate) : 98,
        nextTermBegins: nextTermBegins ? new Date(nextTermBegins) : null,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: 'Report card remarks updated successfully',
      remark: updatedRemark,
    });
  }

  return res.status(405).end();
}, ['TEACHER']);
