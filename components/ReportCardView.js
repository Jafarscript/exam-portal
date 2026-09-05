import { useState } from 'react';
import {
  Printer,
  Sparkles,
  Award,
  BookOpen,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Percent,
  TrendingUp,
  GraduationCap,
  Building,
  Edit3,
  Save,
  X,
  Star,
  Check,
} from 'lucide-react';

export default function ReportCardView({
  reportCard,
  canEditRemarks = false,
  onSaveRemarks = null,
  role = 'STUDENT',
}) {
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    termName: reportCard?.meta?.termName || 'Term 1 (2026/2027)',
    academicSession: reportCard?.meta?.academicSession || '2026/2027 Academic Session',
    teacherRemark: reportCard?.remarks?.isCustomTeacherRemark ? reportCard.remarks.teacherRemark : '',
    principalRemark: reportCard?.remarks?.isCustomPrincipalRemark ? reportCard.remarks.principalRemark : '',
    conductRating: reportCard?.meta?.conductRating || 'EXCELLENT',
    attendanceRate: reportCard?.meta?.attendanceRate ?? 98,
    nextTermBegins: reportCard?.meta?.nextTermBegins ? reportCard.meta.nextTermBegins.substring(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);

  if (!reportCard) return null;

  const { student, meta, summary, subjects = [], examRows = [], remarks } = reportCard;

  const handlePrint = () => {
    window.print();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!onSaveRemarks) return;
    setSaving(true);
    try {
      await onSaveRemarks(student.id, formData);
      setEditingModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const hasExams = examRows.length > 0;

  return (
    <div className="w-full">
      {/* Action Bar (Hidden in Print) */}
      <div className="no-print mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-primary-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-xs sm:text-sm font-medium text-ink">
            Official Academic Record • Report Ref: <span className="font-mono font-bold text-primary-700">{meta.reportId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEditRemarks && (
            <button
              onClick={() => {
                setFormData({
                  termName: meta.termName || 'Term 1 (2026/2027)',
                  academicSession: meta.academicSession || '2026/2027 Academic Session',
                  teacherRemark: remarks.isCustomTeacherRemark ? remarks.teacherRemark : '',
                  principalRemark: remarks.isCustomPrincipalRemark ? remarks.principalRemark : '',
                  conductRating: meta.conductRating || 'EXCELLENT',
                  attendanceRate: meta.attendanceRate ?? 98,
                  nextTermBegins: meta.nextTermBegins ? meta.nextTermBegins.substring(0, 10) : '',
                });
                setEditingModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-50 text-primary-800 text-xs sm:text-sm font-semibold hover:bg-primary-100 border border-primary-200 transition"
            >
              <Edit3 className="w-4 h-4 text-primary-600" />
              Edit Remarks & Session
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            Print Report Card / Save PDF
          </button>
        </div>
      </div>

      {/* Official Report Card Sheet */}
      <div className="bg-white rounded-3xl border-2 border-primary-200/90 shadow-md p-6 sm:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none text-ink">
        {/* Certificate / Formal Header */}
        <div className="border-b-2 border-primary-700/30 pb-6 text-center relative">
          {/* Bismillah */}
          <p className="rtl-text text-lg sm:text-xl text-primary-900 font-semibold mb-1 tracking-wide">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="text-[10px] text-ink/50 uppercase tracking-widest font-semibold mb-2">
            In the Name of Allah, the Most Gracious, the Most Merciful
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 my-2">
            <div className="w-12 h-12 rounded-2xl bg-primary-800 text-gold-400 flex items-center justify-center shadow-sm border border-gold-400/40">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-900 tracking-tight uppercase">
                Al-Huda Academic & Islamic Academy
              </h1>
              <p className="text-xs sm:text-sm text-primary-700 font-medium tracking-wide">
                Excellence in Knowledge, Faith, & Academic Mastery
              </p>
            </div>
          </div>

          <div className="mt-3 inline-block bg-primary-50 border border-primary-200 px-5 py-1.5 rounded-full">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-900">
              STUDENT OFFICIAL ACADEMIC REPORT CARD
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink/60 mt-4 px-2 flex-wrap gap-2">
            <span><strong>Academic Session:</strong> {meta.academicSession}</span>
            <span><strong>Evaluation Term:</strong> {meta.termName}</span>
            <span><strong>Date Issued:</strong> {new Date(meta.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Student Information Profile Grid */}
        <div className="my-6 p-4 sm:p-5 bg-primary-50/40 rounded-2xl border border-primary-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-ink/50 block text-[11px] font-medium uppercase">Student Full Name</span>
            <p className="font-bold text-sm text-primary-900 mt-0.5">{student.fullName}</p>
            <span className="text-[10px] text-ink/60">{student.isIndependent ? 'Independent Student Account' : 'Parent-Supervised Profile'}</span>
          </div>

          <div>
            <span className="text-ink/50 block text-[11px] font-medium uppercase">Assigned Class / Grade</span>
            <p className="font-bold text-sm text-ink mt-0.5">{student.className}</p>
            {student.classDescription && (
              <span className="text-[10px] text-ink/60 truncate block">{student.classDescription}</span>
            )}
          </div>

          <div>
            <span className="text-ink/50 block text-[11px] font-medium uppercase">Parent / Guardian</span>
            <p className="font-bold text-sm text-ink mt-0.5">
              {student.parentName ? student.parentName : 'Independent Candidate'}
            </p>
            {student.parentPhone && (
              <span className="text-[10px] text-ink/60 block">{student.parentPhone}</span>
            )}
          </div>

          <div>
            <span className="text-ink/50 block text-[11px] font-medium uppercase">Portal ID / Roll No</span>
            <p className="font-mono font-bold text-sm text-primary-800 mt-0.5">{meta.reportId}</p>
            <span className="text-[10px] text-emerald-700 font-semibold">Verified Enrolled</span>
          </div>
        </div>

        {/* Executive Summary Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {/* Average Score */}
          <div className="p-3 bg-white rounded-xl border border-primary-100 shadow-xs text-center flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink/50 uppercase">Overall Average</span>
            <p className="font-display text-2xl font-bold text-primary-800 mt-1">
              {summary.overallPercentage}%
            </p>
            <span className="text-[10px] text-ink/50 font-medium">Out of 100%</span>
          </div>

          {/* Letter Grade */}
          <div className="p-3 bg-white rounded-xl border border-primary-100 shadow-xs text-center flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink/50 uppercase">Cumulative Grade</span>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className={`text-2xl font-extrabold ${
                summary.overallGrade.startsWith('A')
                  ? 'text-emerald-700'
                  : summary.overallGrade.startsWith('B')
                  ? 'text-primary-700'
                  : summary.overallGrade.startsWith('C')
                  ? 'text-blue-700'
                  : 'text-amber-700'
              }`}>
                {summary.overallGrade}
              </span>
            </div>
            <span className="text-[10px] text-ink/60 font-semibold">{summary.overallGradeLabel}</span>
          </div>

          {/* Total Marks Accumulated */}
          <div className="p-3 bg-white rounded-xl border border-primary-100 shadow-xs text-center flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink/50 uppercase">Total Marks</span>
            <p className="font-display text-2xl font-bold text-primary-900 mt-1">
              {summary.totalEarnedMarks}
              <span className="text-xs font-sans font-normal text-ink/50">/{summary.totalPossibleMarks}</span>
            </p>
            <span className="text-[10px] text-ink/50 font-medium">Marks Accumulated</span>
          </div>

          {/* GPA */}
          <div className="p-3 bg-white rounded-xl border border-primary-100 shadow-xs text-center flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink/50 uppercase">GPA Equivalent</span>
            <p className="font-display text-2xl font-bold text-gold-600 mt-1">
              {summary.gpa.toFixed(2)}
            </p>
            <span className="text-[10px] text-ink/50">4.00 Max Scale</span>
          </div>

          {/* Exam Pass Rate */}
          <div className="p-3 bg-white rounded-xl border border-primary-100 shadow-xs text-center flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink/50 uppercase">Exams Evaluated</span>
            <p className="font-display text-2xl font-bold text-ink mt-1">
              {summary.passedExamsCount}
              <span className="text-xs font-sans font-normal text-ink/50">/{summary.totalExamsTaken}</span>
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">
              {summary.failedExamsCount === 0 && summary.totalExamsTaken > 0 ? '100% Pass Rate' : `${summary.failedExamsCount} Failed`}
            </span>
          </div>

          {/* Conduct Rating */}
          <div className="p-3 bg-white rounded-xl border border-primary-100 shadow-xs text-center flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink/50 uppercase">Conduct & Ethics</span>
            <p className="text-xs font-bold text-emerald-800 mt-2 uppercase tracking-wide">
              {meta.conductRating.replace('_', ' ')}
            </p>
            <span className="text-[10px] text-ink/50 mt-1">
              {summary.totalInfractions === 0 ? 'Zero Infractions' : `${summary.totalInfractions} Flags`}
            </span>
          </div>
        </div>

        {/* Subject Breakdown & Mastery */}
        {subjects.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary-900 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary-600" />
              Subject Proficiency Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.map((sub) => {
                const percent = sub.averagePercentage;
                return (
                  <div
                    key={sub.subjectName}
                    className="p-3.5 bg-primary-50/30 rounded-xl border border-primary-100 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-ink truncate">{sub.subjectName}</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          sub.grade.startsWith('A')
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.grade.startsWith('B')
                            ? 'bg-primary-100 text-primary-800'
                            : sub.grade.startsWith('C')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {sub.grade} ({sub.averagePercentage}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-ink/50 mt-1">
                        <span>{sub.examsCount} {sub.examsCount === 1 ? 'Exam' : 'Exams'}</span>
                        <span>{sub.totalEarned} / {sub.totalPossible} Marks</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-primary-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percent >= 80 ? 'bg-emerald-600' : percent >= 60 ? 'bg-primary-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Assessment & Exam Scores Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary-900 mb-3 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-primary-600" />
            Comprehensive Examination Record
          </h3>

          {!hasExams ? (
            <div className="p-6 bg-primary-50/40 rounded-xl border border-dashed border-primary-200 text-center">
              <p className="text-xs sm:text-sm text-ink/60">
                No exam submissions recorded for this academic period yet.
              </p>
              <p className="text-xs text-ink/40 mt-1">
                Completed and finalized exam attempts will appear on this official record automatically.
              </p>
            </div>
          ) : (
            <div className="border border-primary-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-primary-800 text-white font-semibold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Exam Assessment</th>
                    <th className="py-2.5 px-3 text-center">Max Marks</th>
                    <th className="py-2.5 px-3 text-center">Earned</th>
                    <th className="py-2.5 px-3 text-center">Score %</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Outcome</th>
                    <th className="py-2.5 px-3 text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 bg-white">
                  {examRows.map((row, idx) => {
                    const isPending = row.status === 'PENDING';
                    const passed = row.passed;

                    return (
                      <tr key={row.resultId} className="hover:bg-primary-50/40 transition">
                        <td className="py-2.5 px-3 text-ink/40 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-primary-900">{row.subjectName}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-ink">{row.examTitle}</p>
                          <span className="text-[10px] text-ink/50">
                            {new Date(row.submittedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{row.totalMarks}</td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono">
                          {isPending ? '—' : row.earnedMarks}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono">
                          {isPending ? 'Review' : `${row.percentage}%`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPending ? (
                            <span className="text-[10px] text-gold-600 uppercase font-semibold">Pending</span>
                          ) : (
                            <span
                              className={`inline-block font-extrabold px-2 py-0.5 rounded text-[11px] ${
                                row.grade.startsWith('A')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.grade.startsWith('B')
                                  ? 'bg-primary-100 text-primary-800'
                                  : row.grade.startsWith('C')
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {row.grade}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPending ? (
                            <span className="text-[10px] font-semibold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">
                              In Review
                            </span>
                          ) : passed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              FAIL
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-[10px] text-ink/60 font-medium">
                            {row.infractions === 0 ? '✓ Verified' : `${row.infractions} notice(s)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-50/80 font-bold border-t-2 border-primary-200">
                    <td colSpan={3} className="py-2.5 px-3 text-ink uppercase tracking-wide text-[11px]">
                      Cumulative Totals
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{summary.totalPossibleMarks}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-primary-900">{summary.totalEarnedMarks}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-primary-800 text-sm">
                      {summary.overallPercentage}%
                    </td>
                    <td className="py-2.5 px-3 text-center text-primary-900 font-extrabold text-sm">
                      {summary.overallGrade}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[11px] text-emerald-800 uppercase">
                      {summary.passedExamsCount} / {summary.totalExamsTaken} Passed
                    </td>
                    <td className="py-2.5 px-3 text-right text-[10px] text-ink/60 font-normal">
                      Honors Score
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Grading Scale Key & Behavioral Assessment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
          {/* Official Grading Scale */}
          <div className="p-3.5 bg-primary-50/30 rounded-xl border border-primary-100">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-primary-900 mb-2">
              Academy Grading System Key
            </h4>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="p-1.5 bg-white rounded border border-primary-100 text-center">
                <span className="font-bold text-emerald-700">A+ (90-100%)</span>
                <p className="text-ink/60">Distinction (4.0)</p>
              </div>
              <div className="p-1.5 bg-white rounded border border-primary-100 text-center">
                <span className="font-bold text-emerald-700">A (80-89%)</span>
                <p className="text-ink/60">Excellent (4.0)</p>
              </div>
              <div className="p-1.5 bg-white rounded border border-primary-100 text-center">
                <span className="font-bold text-primary-700">B (70-79%)</span>
                <p className="text-ink/60">Very Good (3.0)</p>
              </div>
              <div className="p-1.5 bg-white rounded border border-primary-100 text-center">
                <span className="font-bold text-blue-700">C (60-69%)</span>
                <p className="text-ink/60">Good (2.0)</p>
              </div>
              <div className="p-1.5 bg-white rounded border border-primary-100 text-center">
                <span className="font-bold text-amber-700">D (50-59%)</span>
                <p className="text-ink/60">Pass (1.0)</p>
              </div>
              <div className="p-1.5 bg-white rounded border border-primary-100 text-center">
                <span className="font-bold text-red-700">F (Below 50%)</span>
                <p className="text-ink/60">Retake (0.0)</p>
              </div>
            </div>
          </div>

          {/* Formative & Behavioral Traits */}
          <div className="p-3.5 bg-primary-50/30 rounded-xl border border-primary-100">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-primary-900 mb-2">
              Formative & Affective Development
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Attendance & Punctuality:</span>
                <span className="font-semibold text-primary-800">{meta.attendanceRate}% Attended</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Exam Ethics & Academic Integrity:</span>
                <span className="font-semibold text-emerald-700">{summary.integrityStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">General Demeanor & Conduct:</span>
                <span className="font-semibold text-primary-900 uppercase">
                  {meta.conductRating.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Academic Progress Evaluation:</span>
                <span className="font-bold text-emerald-800">{remarks.academicStatus || remarks.standing}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="space-y-3 mb-8">
          {/* Class Teacher's Remark */}
          <div className="p-4 bg-primary-50/60 rounded-xl border border-primary-200">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-600" />
                Class Teacher's Appraisal & Recommendation
              </span>
              {remarks.isCustomTeacherRemark && (
                <span className="text-[10px] text-primary-700 font-medium bg-white px-2 py-0.5 rounded border border-primary-200">
                  Custom Teacher Feedback
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-ink leading-relaxed italic font-serif">
              "{remarks.teacherRemark}"
            </p>
          </div>

          {/* Principal's Remark */}
          <div className="p-4 bg-gold-50/40 rounded-xl border border-gold-200">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gold-900 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-gold-700" />
                Head of School / Principal's Endorsement
              </span>
              {remarks.isCustomPrincipalRemark && (
                <span className="text-[10px] text-gold-800 font-medium bg-white px-2 py-0.5 rounded border border-gold-200">
                  Principal Endorsed
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-ink leading-relaxed italic font-serif">
              "{remarks.principalRemark}"
            </p>
          </div>

          {meta.nextTermBegins && (
            <div className="p-3 bg-white rounded-xl border border-primary-200 text-center text-xs">
              <span className="text-ink/60">Next Academic Term Resumption: </span>
              <strong className="text-primary-800">
                {new Date(meta.nextTermBegins).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </strong>
            </div>
          )}
        </div>

        {/* Official Signatures & Seal Section */}
        <div className="pt-6 border-t-2 border-primary-700/30 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
          {/* Teacher Signature */}
          <div className="flex flex-col items-center">
            <div className="h-12 flex items-end justify-center w-full">
              <span className="font-serif italic text-primary-800 text-sm font-semibold tracking-wider">
                Al-Huda Faculty Board
              </span>
            </div>
            <div className="w-44 border-t border-ink/40 mt-1 pt-1.5">
              <p className="font-bold text-ink">Class Teacher</p>
              <p className="text-[10px] text-ink/50">Evaluation Signature & Date</p>
            </div>
          </div>

          {/* Academy Verification Seal */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gold-500/70 bg-gold-50/50 flex flex-col items-center justify-center text-gold-700 p-1">
              <ShieldCheck className="w-6 h-6 text-gold-600" />
              <span className="text-[8px] font-bold uppercase tracking-tight text-center leading-none mt-0.5">
                OFFICIAL SEAL
              </span>
            </div>
            <p className="text-[10px] font-mono text-ink/40 mt-1">VERIFIED ACCREDITED</p>
          </div>

          {/* Principal Signature */}
          <div className="flex flex-col items-center">
            <div className="h-12 flex items-end justify-center w-full">
              <span className="font-serif italic text-primary-800 text-sm font-semibold tracking-wider">
                Office of the Principal
              </span>
            </div>
            <div className="w-44 border-t border-ink/40 mt-1 pt-1.5">
              <p className="font-bold text-ink">Head of School</p>
              <p className="text-[10px] text-ink/50">Director of Academic Affairs</p>
            </div>
          </div>
        </div>

        {/* Parent / Guardian Acknowledgement Line */}
        <div className="mt-8 pt-4 border-t border-dashed border-primary-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-ink/60 gap-3">
          <span>
            Parent / Guardian Signature: ____________________________________
          </span>
          <span>Date: ________________________</span>
          <span className="font-mono">Al-Huda Academy Electronic Verification System</span>
        </div>
      </div>

      {/* Teacher Remarks Edit Modal */}
      {editingModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-primary-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-primary-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gold-400" />
                <h3 className="font-display font-semibold text-lg">
                  Customize Report Card: {student.fullName}
                </h3>
              </div>
              <button
                onClick={() => setEditingModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-ink/70 block mb-1">Academic Session</label>
                  <input
                    type="text"
                    value={formData.academicSession}
                    onChange={(e) => setFormData({ ...formData, academicSession: e.target.value })}
                    placeholder="e.g. 2026/2027 Academic Session"
                    className="w-full border border-primary-200 rounded-lg px-3 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-ink/70 block mb-1">Evaluation Term</label>
                  <input
                    type="text"
                    value={formData.termName}
                    onChange={(e) => setFormData({ ...formData, termName: e.target.value })}
                    placeholder="e.g. Term 1 (2026/2027)"
                    className="w-full border border-primary-200 rounded-lg px-3 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-ink/70 block mb-1">
                  Class Teacher's Appraisal & Remark
                </label>
                <textarea
                  rows={3}
                  value={formData.teacherRemark}
                  onChange={(e) => setFormData({ ...formData, teacherRemark: e.target.value })}
                  placeholder="Enter personalized feedback for student and parents..."
                  className="w-full border border-primary-200 rounded-lg p-2.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none leading-relaxed"
                />
                <p className="text-[11px] text-ink/40 mt-0.5">
                  Leave blank to automatically use the academy's intelligent pedagogical recommendation.
                </p>
              </div>

              <div>
                <label className="font-medium text-ink/70 block mb-1">
                  Principal / Head of School's Endorsement
                </label>
                <textarea
                  rows={2}
                  value={formData.principalRemark}
                  onChange={(e) => setFormData({ ...formData, principalRemark: e.target.value })}
                  placeholder="Official endorsement remark..."
                  className="w-full border border-primary-200 rounded-lg p-2.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-ink/70 block mb-1">Conduct & Demeanor</label>
                  <select
                    value={formData.conductRating}
                    onChange={(e) => setFormData({ ...formData, conductRating: e.target.value })}
                    className="w-full border border-primary-200 rounded-lg px-3 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="VERY_GOOD">Very Good</option>
                    <option value="GOOD">Good</option>
                    <option value="SATISFACTORY">Satisfactory</option>
                    <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-ink/70 block mb-1">Attendance Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.attendanceRate}
                    onChange={(e) => setFormData({ ...formData, attendanceRate: e.target.value })}
                    className="w-full border border-primary-200 rounded-lg px-3 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-medium text-ink/70 block mb-1">Next Term Resumption</label>
                  <input
                    type="date"
                    value={formData.nextTermBegins}
                    onChange={(e) => setFormData({ ...formData, nextTermBegins: e.target.value })}
                    className="w-full border border-primary-200 rounded-lg px-3 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-primary-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingModalOpen(false)}
                  className="px-4 py-2 border border-primary-200 rounded-xl text-ink/70 hover:bg-primary-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Changes…' : 'Save Remarks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
