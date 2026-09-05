import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ReportCardView from '@/components/ReportCardView';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import {
  Award,
  Search,
  Filter,
  Users,
  Eye,
  ArrowLeft,
  Edit3,
  CheckCircle2,
  FileText,
  Building,
} from 'lucide-react';
import Link from 'next/link';

export default function TeacherReportCardsPage() {
  const user = useRequireRole(['TEACHER']);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected student for detailed report card view
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [activeReportCard, setActiveReportCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Load classes
  useEffect(() => {
    if (user) {
      apiFetch('/api/teacher/classes')
        .then((d) => setClasses(d.classes || []))
        .catch(console.error);
    }
  }, [user]);

  // Load students summary
  const loadStudents = async () => {
    setLoading(true);
    try {
      const url = selectedClassId
        ? `/api/teacher/report-cards?classId=${selectedClassId}`
        : '/api/teacher/report-cards';
      const data = await apiFetch(url);
      setStudents(data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStudents();
    }
  }, [user, selectedClassId]);

  // Load individual report card
  const handleViewReportCard = async (studentId) => {
    setActiveStudentId(studentId);
    setLoadingCard(true);
    try {
      const data = await apiFetch(`/api/teacher/report-cards?studentId=${studentId}`);
      setActiveReportCard(data.reportCard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCard(false);
    }
  };

  // Save custom remarks handler
  const handleSaveRemarks = async (studentId, formData) => {
    try {
      await apiFetch('/api/teacher/report-cards', {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          ...formData,
        }),
      });

      setToastMessage('Remarks and session details updated successfully!');
      setTimeout(() => setToastMessage(null), 4000);

      // Refresh active report card
      const updated = await apiFetch(`/api/teacher/report-cards?studentId=${studentId}`);
      setActiveReportCard(updated.reportCard);

      // Refresh list
      loadStudents();
    } catch (err) {
      alert(err.message || 'Failed to update remarks');
    }
  };

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.className && s.className.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="no-print fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* View Mode: If an individual report card is open */}
        {activeReportCard && (
          <div className="space-y-4">
            <div className="no-print flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setActiveReportCard(null);
                  setActiveStudentId(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-primary-200 text-ink/70 hover:bg-primary-50 text-xs sm:text-sm font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to All Students
              </button>

              <div className="text-xs text-ink/60">
                Viewing report for <strong className="text-ink">{activeReportCard.student.fullName}</strong>
              </div>
            </div>

            {loadingCard ? (
              <Spinner label="Refreshing student report card…" />
            ) : (
              <ReportCardView
                reportCard={activeReportCard}
                canEditRemarks={true}
                onSaveRemarks={handleSaveRemarks}
                role="TEACHER"
              />
            )}
          </div>
        )}

        {/* List Mode: Browse students and report cards */}
        {!activeReportCard && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-900">
                    Student Academic Report Cards
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-ink/60 mt-1">
                  Generate, review, and print official report cards. Add personalized teacher appraisals and principal remarks.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink/60">
                <span className="font-semibold text-primary-800">{students.length}</span> Total Students
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-primary-100 shadow-xs mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students by name…"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-primary-200 rounded-xl bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-primary-200 rounded-xl bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            {loading && <Spinner label="Loading student records…" />}

            {!loading && filteredStudents.length === 0 && (
              <EmptyState
                title="No students found"
                message="Try adjusting your search filter or selecting a different class."
              />
            )}

            {!loading && filteredStudents.length > 0 && (
              <div className="bg-white border border-primary-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-primary-50/70 border-b border-primary-100 text-ink/70 font-semibold text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4">Student Name</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4 text-center">Exams Completed</th>
                        <th className="py-3.5 px-4 text-center">Overall Average</th>
                        <th className="py-3.5 px-4 text-center">Grade</th>
                        <th className="py-3.5 px-4 text-center">Teacher Remarks</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary-50">
                      {filteredStudents.map((s) => (
                        <tr key={s._id} className="hover:bg-primary-50/30 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-primary-900">{s.fullName}</p>
                            <span className="text-[11px] text-ink/50 block">
                              {s.isIndependent ? 'Independent Account' : s.parentName ? `Parent: ${s.parentName}` : 'Unassigned Parent'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-primary-50 text-primary-800 text-xs font-medium">
                              {s.className}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-ink">
                            {s.examsCount} {s.examsCount === 1 ? 'Exam' : 'Exams'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-primary-800 font-mono">
                            {s.examsCount > 0 ? `${s.averagePercentage}%` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {s.examsCount > 0 ? (
                              <span
                                className={`inline-block font-extrabold px-2.5 py-0.5 rounded text-xs ${
                                  s.grade.startsWith('A')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : s.grade.startsWith('B')
                                    ? 'bg-primary-100 text-primary-800'
                                    : s.grade.startsWith('C')
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {s.grade}
                              </span>
                            ) : (
                              <span className="text-ink/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {s.hasCustomRemark ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Custom Saved
                              </span>
                            ) : (
                              <span className="inline-block text-[11px] text-ink/50 bg-primary-50 px-2 py-0.5 rounded-full">
                                Standard Default
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleViewReportCard(s._id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View & Print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
