import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import { Plus, Search, Filter, Calendar, Clock, BookOpen, GraduationCap, Sparkles } from 'lucide-react';

const STATUS_COLOR = {
  DRAFT: 'bg-ink/10 text-ink/70 border border-ink/10',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED: 'bg-red-50 text-red-700 border border-red-200',
};

export default function TeacherExams() {
  const user = useRequireRole(['TEACHER']);
  const [exams, setExams] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (user) {
      apiFetch('/api/exams').then((d) => setExams(d.exams || []));
      apiFetch('/api/teacher/classes').then((d) => setClasses((d.classes || []).filter((c) => c.isActive)));
      apiFetch('/api/teacher/subjects').then((d) => setSubjects((d.subjects || []).filter((s) => s.isActive)));
    }
  }, [user]);

  if (!user) return null;

  const filteredExams = exams?.filter((e) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchSub = e.subjectId?.name?.toLowerCase().includes(q);
      const matchClass = e.classId?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchSub && !matchClass) return false;
    }
    if (selectedClass && (e.classId?._id !== selectedClass && e.classId !== selectedClass)) return false;
    if (selectedSubject && (e.subjectId?._id !== selectedSubject && e.subjectId !== selectedSubject)) return false;
    if (selectedStatus && e.status !== selectedStatus) return false;
    return true;
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">
              Exam Management
            </h1>
            <p className="text-xs sm:text-sm text-ink/60 mt-0.5">
              Create, configure, monitor live screen sharing, and grade student submissions.
            </p>
          </div>
          <Link
            href="/teacher/exams/create"
            className="inline-flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create new exam</span>
          </Link>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-primary-100 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Class filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm border border-primary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            {/* Subject filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm border border-primary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm border border-primary-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published (Active)</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {(search || selectedClass || selectedSubject || selectedStatus) && (
            <div className="flex items-center justify-between text-xs text-ink/60 pt-1 border-t border-primary-50">
              <span>Showing {filteredExams?.length || 0} of {exams?.length || 0} exams</span>
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedClass('');
                  setSelectedSubject('');
                  setSelectedStatus('');
                }}
                className="text-primary-600 font-semibold hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* Exams List */}
        {exams === null && <Spinner label="Loading exams…" />}
        {exams && exams.length === 0 && (
          <EmptyState
            title="No exams created yet"
            description="Get started by creating your first exam draft with customized questions, timers, and security rules."
            action={
              <Link
                href="/teacher/exams/create"
                className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create your first exam
              </Link>
            }
          />
        )}

        {filteredExams && filteredExams.length === 0 && exams.length > 0 && (
          <div className="p-8 text-center bg-white border border-primary-100 rounded-xl text-ink/60 text-sm">
            No exams match your search or filter criteria.
          </div>
        )}

        {filteredExams && filteredExams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((e) => (
              <Link
                key={e._id}
                href={`/teacher/exams/${e._id}`}
                className="bg-white border border-primary-100 hover:border-primary-300 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_COLOR[e.status]}`}>
                      {e.status}
                    </span>
                    {e.requiresLiveApproval !== false && (
                      <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        Live Gate
                      </span>
                    )}
                  </div>

                  <h3 dir="auto" className="font-display font-semibold text-base sm:text-lg text-ink group-hover:text-primary-700 transition bidi-auto mb-2 line-clamp-2">
                    {e.title}
                  </h3>

                  <div className="space-y-1 text-xs text-ink/60">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                      <span className="truncate">{e.subjectId?.name || 'Unassigned Subject'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary-600 flex-shrink-0" />
                      <span className="truncate">{e.classId?.name || 'All Classes'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-primary-50 flex items-center justify-between text-[11px] text-ink/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due {new Date(e.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{e.isTimed ? `${e.duration} min` : 'Untimed'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
