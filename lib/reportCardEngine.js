import Student from '@/models/Student';
import Result from '@/models/Result';
import Exam from '@/models/Exam';
import Subject from '@/models/Subject';
import Class from '@/models/Class';
import User from '@/models/User';
import Attempt from '@/models/Attempt';
import ReportRemark from '@/models/ReportRemark';
import '@/models/Class';
import '@/models/Subject';

export function getLetterGrade(percentage) {
  if (percentage >= 90) {
    return { letter: 'A+', gpa: 4.0, label: 'Distinction', arabic: 'ممتاز مرتفع', color: 'emerald' };
  }
  if (percentage >= 80) {
    return { letter: 'A', gpa: 4.0, label: 'Excellent', arabic: 'ممتاز', color: 'emerald' };
  }
  if (percentage >= 70) {
    return { letter: 'B', gpa: 3.0, label: 'Very Good', arabic: 'جيد جداً', color: 'primary' };
  }
  if (percentage >= 60) {
    return { letter: 'C', gpa: 2.0, label: 'Good', arabic: 'جيد', color: 'blue' };
  }
  if (percentage >= 50) {
    return { letter: 'D', gpa: 1.0, label: 'Pass', arabic: 'مقبول', color: 'amber' };
  }
  return { letter: 'F', gpa: 0.0, label: 'Needs Improvement', arabic: 'ضعيف', color: 'red' };
}

export function getDefaultRemarks(percentage) {
  if (percentage >= 90) {
    return {
      teacher:
        'Exemplary academic achievement! Demonstrates outstanding mastery of all course concepts, consistent diligence, and scholarly discipline.',
      principal:
        'Commended for outstanding academic excellence, exemplary character, and upholding the highest standards of our academy.',
      academicStatus: 'Distinction / Honors Award',
    };
  }
  if (percentage >= 80) {
    return {
      teacher:
        'Very strong performance across all subjects. Demonstrates thorough comprehension, active participation, and commendable study habits.',
      principal:
        'Congratulations on a highly successful term. Keep up the high level of effort and commitment.',
      academicStatus: 'Eligible for Academic Promotion',
    };
  }
  if (percentage >= 70) {
    return {
      teacher:
        'Good and consistent academic progress. Shows good understanding of core topics with steady application.',
      principal:
        'A commendable term with steady performance. Encouraged to continue pushing towards excellence.',
      academicStatus: 'Eligible for Academic Promotion',
    };
  }
  if (percentage >= 60) {
    return {
      teacher:
        'Satisfactory grasp of foundational concepts. With increased daily review and focus, higher achievement is well within reach.',
      principal:
        'Passed all essential competencies. Advised to establish structured revision to achieve greater results.',
      academicStatus: 'Promoted',
    };
  }
  if (percentage >= 50) {
    return {
      teacher:
        'Marginal pass. Requires structured revision and extra attention in weaker subject areas to reinforce comprehension.',
      principal:
        'Performance is near threshold. Consistent home practice and teacher consultations are recommended.',
      academicStatus: 'Conditional Pass',
    };
  }
  return {
    teacher:
      'Academic performance requires focused intervention and regular revision. Encouraged to seek teacher guidance and attend revision clinics.',
    principal:
      'Parent-teacher consultation recommended to formulate a targeted academic support plan.',
    academicStatus: 'Academic Support Required',
  };
}

export async function generateStudentReportCard(studentId) {
  const student = await Student.findById(studentId)
    .populate('classId', 'name description')
    .populate('parentId', 'fullName email phoneNumber status')
    .populate('userId', 'email fullName')
    .lean();

  if (!student) throw new Error('Student not found');

  // Fetch all results for this student
  const results = await Result.find({ studentId: student._id })
    .populate({
      path: 'examId',
      select: 'title description passMark duration isTimed deadline subjectId classId',
      populate: { path: 'subjectId', select: 'name code description' },
    })
    .populate({
      path: 'attemptId',
      select: 'submittedAt startedAt tabSwitchCount fullscreenExitCount status',
    })
    .sort({ createdAt: 1 })
    .lean();

  // Fetch or prepare report remark
  let remark = await ReportRemark.findOne({ studentId: student._id }).lean();
  if (!remark) {
    remark = {
      termName: 'Term 1 (2026/2027)',
      academicSession: '2026/2027 Academic Session',
      teacherRemark: '',
      principalRemark: '',
      conductRating: 'EXCELLENT',
      attendanceRate: 98,
      nextTermBegins: null,
    };
  }

  // Filter finalized results vs pending review
  const finalizedResults = results.filter((r) => r.status === 'FINAL');
  const pendingResults = results.filter((r) => r.status === 'PENDING');

  // Overall calculations
  let totalPossibleMarks = 0;
  let totalEarnedMarks = 0;
  let totalExamsTaken = results.length;
  let passedExamsCount = 0;
  let failedExamsCount = 0;
  let totalInfractions = 0;

  const examRows = results.map((r) => {
    const isFinal = r.status === 'FINAL';
    const percent = isFinal ? Number(r.percentage || 0) : 0;
    const gradeInfo = isFinal ? getLetterGrade(percent) : { letter: 'PENDING', gpa: 0, label: 'Pending Review', color: 'gold' };

    if (isFinal) {
      totalPossibleMarks += r.totalMarks || 0;
      totalEarnedMarks += r.earnedMarks || 0;
      if (r.passed) passedExamsCount++;
      else failedExamsCount++;
    }

    const tabSwitches = r.attemptId?.tabSwitchCount || 0;
    const fsExits = r.attemptId?.fullscreenExitCount || 0;
    const examInfractions = tabSwitches + fsExits;
    totalInfractions += examInfractions;

    return {
      resultId: r._id,
      examId: r.examId?._id,
      examTitle: r.examId?.title || 'Exam',
      subjectName: r.examId?.subjectId?.name || 'General Subject',
      subjectCode: r.examId?.subjectId?.code || '',
      totalMarks: r.totalMarks,
      earnedMarks: isFinal ? r.earnedMarks : null,
      passMark: r.passMark,
      percentage: isFinal ? percent : null,
      grade: gradeInfo.letter,
      gpa: gradeInfo.gpa,
      gradeLabel: gradeInfo.label,
      gradeArabic: gradeInfo.arabic || '',
      gradeColor: gradeInfo.color,
      passed: isFinal ? r.passed : null,
      status: r.status,
      submittedAt: r.attemptId?.submittedAt || r.createdAt,
      finalizedAt: r.finalizedAt,
      infractions: examInfractions,
    };
  });

  const overallPercentage =
    totalPossibleMarks > 0
      ? Math.round((totalEarnedMarks / totalPossibleMarks) * 10000) / 100
      : finalizedResults.length > 0
      ? Math.round(
          (finalizedResults.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
            finalizedResults.length) *
            100
        ) / 100
      : 0;

  const overallGrade = getLetterGrade(overallPercentage);
  const defaultRemarks = getDefaultRemarks(overallPercentage);

  // Subject-wise grouping
  const subjectMap = {};
  examRows.forEach((row) => {
    const sub = row.subjectName;
    if (!subjectMap[sub]) {
      subjectMap[sub] = {
        subjectName: sub,
        subjectCode: row.subjectCode,
        examsCount: 0,
        totalPossible: 0,
        totalEarned: 0,
        percentages: [],
        passedCount: 0,
      };
    }
    subjectMap[sub].examsCount++;
    if (row.status === 'FINAL') {
      subjectMap[sub].totalPossible += row.totalMarks || 0;
      subjectMap[sub].totalEarned += row.earnedMarks || 0;
      subjectMap[sub].percentages.push(row.percentage);
      if (row.passed) subjectMap[sub].passedCount++;
    }
  });

  const subjectSummaries = Object.values(subjectMap).map((sub) => {
    const avg =
      sub.totalPossible > 0
        ? Math.round((sub.totalEarned / sub.totalPossible) * 10000) / 100
        : sub.percentages.length > 0
        ? Math.round((sub.percentages.reduce((a, b) => a + b, 0) / sub.percentages.length) * 100) / 100
        : 0;
    const grade = getLetterGrade(avg);
    return {
      ...sub,
      averagePercentage: avg,
      grade: grade.letter,
      gpa: grade.gpa,
      gradeLabel: grade.label,
      gradeArabic: grade.arabic,
      gradeColor: grade.color,
    };
  });

  // Individual GPA calculation across evaluated subjects
  const gpa =
    subjectSummaries.length > 0
      ? Math.round(
          (subjectSummaries.reduce((acc, curr) => acc + curr.gpa, 0) / subjectSummaries.length) * 100
        ) / 100
      : overallGrade.gpa;

  return {
    student: {
      id: student._id,
      fullName: student.fullName,
      email: student.userId?.email || null,
      isIndependent: !!student.isIndependent,
      dateOfBirth: student.dateOfBirth,
      className: student.classId?.name || 'General Class',
      classDescription: student.classId?.description || '',
      parentName: student.parentId?.fullName || null,
      parentEmail: student.parentId?.email || null,
      parentPhone: student.parentId?.phoneNumber || null,
    },
    meta: {
      termName: remark.termName || 'Term 1 (2026/2027)',
      academicSession: remark.academicSession || '2026/2027 Academic Session',
      conductRating: remark.conductRating || 'EXCELLENT',
      attendanceRate: remark.attendanceRate || 98,
      nextTermBegins: remark.nextTermBegins || null,
      generatedAt: new Date().toISOString(),
      reportId: `REP-${String(student._id).substring(18, 24).toUpperCase()}-${new Date().getFullYear()}`,
    },
    remarks: {
      teacherRemark: remark.teacherRemark?.trim() || defaultRemarks.teacher,
      principalRemark: remark.principalRemark?.trim() || defaultRemarks.principal,
      academicStatus: defaultRemarks.academicStatus,
      standing: defaultRemarks.academicStatus,
      isCustomTeacherRemark: !!remark.teacherRemark?.trim(),
      isCustomPrincipalRemark: !!remark.principalRemark?.trim(),
    },
    summary: {
      totalExamsTaken,
      finalizedCount: finalizedResults.length,
      pendingCount: pendingResults.length,
      passedExamsCount,
      failedExamsCount,
      totalPossibleMarks,
      totalEarnedMarks,
      overallPercentage,
      overallGrade: overallGrade.letter,
      overallGradeLabel: overallGrade.label,
      overallGradeArabic: overallGrade.arabic,
      overallGradeColor: overallGrade.color,
      gpa,
      passRate: totalExamsTaken > 0 ? Math.round((passedExamsCount / totalExamsTaken) * 100) : 0,
      totalInfractions,
      integrityStatus:
        totalInfractions === 0
          ? 'Exemplary (100% Honor Code)'
          : totalInfractions <= 2
          ? 'Good Conduct'
          : 'Flagged Infractions',
    },
    subjects: subjectSummaries,
    examRows,
  };
}
