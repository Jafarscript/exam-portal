import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Link as LinkIcon,
  Unlink,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  Key,
  X,
  UserPlus,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

export default function TeacherParents() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [filter, setFilter] = useState('PENDING');
  const [parents, setParents] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingParent, setMatchingParent] = useState(null); // Parent object open in Match Modal
  const [studentSearch, setStudentSearch] = useState('');
  const [studentTypeFilter, setStudentTypeFilter] = useState('ALL'); // 'ALL', 'INDEPENDENT', 'UNLINKED'
  const [processing, setProcessing] = useState(false);

  const loadParents = async () => {
    try {
      const query = filter === 'ALL' ? '' : `?status=${filter}`;
      const d = await apiFetch(`/api/teacher/parents${query}`);
      setParents(d.parents || []);
    } catch (err) {
      push(err.message || 'Failed to load parents', 'error');
    }
  };

  const loadStudents = async () => {
    try {
      const d = await apiFetch('/api/teacher/students');
      setAllStudents(d.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadParents();
      loadStudents();
    }
  }, [user, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id, action) => {
    try {
      await apiFetch(`/api/teacher/parents/${id}/${action}`, { method: 'PATCH' });
      push(`Parent account has been ${action}d`, 'success');
      loadParents();
    } catch (err) {
      push(err.message || 'Failed to update parent status', 'error');
    }
  };

  // Match a student to a parent
  const matchStudent = async (parentId, studentId, andApprove = false) => {
    setProcessing(true);
    try {
      await apiFetch(`/api/teacher/parents/${parentId}/children`, {
        method: 'POST',
        body: { studentId, approveParent: andApprove },
      });
      push(andApprove ? 'Student matched & parent approved successfully!' : 'Student matched to parent successfully!', 'success');
      await Promise.all([loadParents(), loadStudents()]);

      // Update the open modal parent's children list
      if (matchingParent && matchingParent._id === parentId) {
        const studentObj = allStudents.find((s) => s._id === studentId);
        if (studentObj) {
          setMatchingParent((prev) => ({
            ...prev,
            status: andApprove ? 'APPROVED' : prev.status,
            children: [...(prev.children || []), { ...studentObj, parentId }],
          }));
        }
      }
    } catch (err) {
      push(err.message || 'Failed to match student', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Unlink a student from a parent
  const unlinkStudent = async (parentId, studentId, studentName, parentName) => {
    if (!confirm(`Unlink ${studentName} from parent ${parentName}?`)) return;
    try {
      await apiFetch(`/api/teacher/parents/${parentId}/children`, {
        method: 'DELETE',
        body: { studentId },
      });
      push(`${studentName} unlinked from ${parentName}`, 'success');
      await Promise.all([loadParents(), loadStudents()]);

      if (matchingParent && matchingParent._id === parentId) {
        setMatchingParent((prev) => ({
          ...prev,
          children: (prev.children || []).filter((c) => c._id !== studentId),
        }));
      }
    } catch (err) {
      push(err.message || 'Failed to unlink student', 'error');
    }
  };

  // Filter parents by search query
  const filteredParents = useMemo(() => {
    if (!parents) return null;
    if (!searchQuery.trim()) return parents;
    const q = searchQuery.toLowerCase().trim();
    return parents.filter((p) => {
      const matchParent =
        p.fullName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.childrenNote?.toLowerCase().includes(q) ||
        p.phoneNumber?.toLowerCase().includes(q);
      const matchChild = p.children?.some(
        (c) =>
          c.fullName?.toLowerCase().includes(q) ||
          c.userId?.email?.toLowerCase().includes(q) ||
          c.classId?.name?.toLowerCase().includes(q)
      );
      return matchParent || matchChild;
    });
  }, [parents, searchQuery]);

  // Modal student list
  const modalAvailableStudents = useMemo(() => {
    if (!allStudents) return [];
    let list = allStudents;
    if (studentTypeFilter === 'INDEPENDENT') {
      list = list.filter((s) => s.isIndependent || s.userId);
    } else if (studentTypeFilter === 'UNLINKED') {
      list = list.filter((s) => !s.parentId);
    }

    if (!studentSearch.trim()) return list;
    const q = studentSearch.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.userId?.email?.toLowerCase().includes(q) ||
        s.classId?.name?.toLowerCase().includes(q)
    );
  }, [allStudents, studentTypeFilter, studentSearch]);

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">
                Parent & Family Management
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-ink/60 mt-1">
              Approve registered parent accounts and match their children — including independent student accounts — to enable parental oversight.
            </p>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition ${
                  filter === f
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-primary-200 text-ink/70 hover:bg-primary-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search parents or children…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-white border border-primary-200 rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Parents List */}
        {parents === null && <Spinner label="Loading parent accounts…" />}

        {filteredParents && filteredParents.length === 0 && (
          <EmptyState
            title={`No ${filter === 'ALL' ? '' : filter.toLowerCase()} parents found`}
            message={searchQuery ? 'No parents match your search query.' : 'New parent registrations will appear here for review and matching.'}
          />
        )}

        {filteredParents && filteredParents.length > 0 && (
          <div className="space-y-4">
            {filteredParents.map((p) => {
              const isPending = p.status === 'PENDING';
              const isApproved = p.status === 'APPROVED';
              const isRejected = p.status === 'REJECTED';
              const childCount = p.children?.length || 0;

              return (
                <div
                  key={p._id}
                  className="bg-white border border-primary-100 rounded-2xl p-5 shadow-sm hover:shadow transition"
                >
                  {/* Parent Info Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-primary-50 pb-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-primary-100/70 text-primary-800 font-display font-semibold flex items-center justify-center text-lg flex-shrink-0">
                        {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-base sm:text-lg text-ink">{p.fullName}</h2>
                          <span
                            className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isPending ? 'Pending Approval' : isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-ink/60 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-ink/40" />
                            {p.email}
                          </span>
                          {p.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-ink/40" />
                              {p.phoneNumber}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-ink/40">
                            <Clock className="w-3.5 h-3.5" />
                            Registered {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      <button
                        onClick={() => {
                          setMatchingParent(p);
                          setStudentSearch('');
                          setStudentTypeFilter('ALL');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold border border-primary-200 transition"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Match Children ({childCount})
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => act(p._id, 'approve')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => act(p._id, 'reject')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => act(p._id, 'reject')}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition"
                          title="Revoke parent access"
                        >
                          Revoke Access
                        </button>
                      )}

                      {isRejected && (
                        <button
                          onClick={() => act(p._id, 'approve')}
                          className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition"
                        >
                          Re-approve
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Children Note provided during registration */}
                  {p.childrenNote && (
                    <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Parent's note on child / independent student:</span>
                        <p className="mt-0.5 text-ink/80 italic font-sans">{p.childrenNote}</p>
                      </div>
                    </div>
                  )}

                  {/* Matched Children Section */}
                  <div className="mt-4 pt-3 border-t border-primary-50">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-primary-600" />
                        <span className="text-xs font-semibold text-primary-900">
                          Matched Children ({childCount})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setMatchingParent(p);
                          setStudentSearch('');
                          setStudentTypeFilter('ALL');
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1 hover:underline"
                      >
                        <UserPlus className="w-3 h-3" />
                        + Add or match another child
                      </button>
                    </div>

                    {childCount === 0 ? (
                      <div className="p-3 bg-primary-50/40 rounded-xl border border-dashed border-primary-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                        <p className="text-xs text-ink/60">
                          No student profiles currently matched to this parent.
                        </p>
                        <button
                          onClick={() => {
                            setMatchingParent(p);
                            setStudentSearch('');
                            setStudentTypeFilter('ALL');
                          }}
                          className="text-xs font-semibold text-primary-700 bg-white px-2.5 py-1 rounded-md border border-primary-200 hover:bg-primary-50 transition"
                        >
                          Match Student Now →
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {p.children.map((c) => {
                          const isIndep = c.isIndependent || !!c.userId;
                          return (
                            <div
                              key={c._id}
                              className="p-2.5 bg-primary-50/50 rounded-xl border border-primary-100 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-xs sm:text-sm text-ink truncate">
                                    {c.fullName}
                                  </p>
                                  {isIndep ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                      <Key className="w-2.5 h-2.5" />
                                      Independent Account
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium bg-gold-500/15 text-gold-800 px-1.5 py-0.5 rounded">
                                      Parent-Managed
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-ink/50 mt-0.5 truncate">
                                  <span>{c.classId?.name || 'No class assigned'}</span>
                                  {c.userId?.email && (
                                    <span className="text-primary-700 truncate">({c.userId.email})</span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => unlinkStudent(p._id, c._id, c.fullName, p.fullName)}
                                className="p-1.5 text-ink/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                                title="Unlink this student from parent"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Match Student to Parent */}
        {matchingParent && (
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-primary-100 overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 bg-primary-800 text-white flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-gold-400" />
                    <h3 className="font-display text-lg sm:text-xl font-semibold">
                      Match Student to {matchingParent.fullName}
                    </h3>
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    Select any student in the portal — including independent students with their own login — to link them to this parent.
                  </p>
                  {matchingParent.childrenNote && (
                    <div className="mt-2 text-xs bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20">
                      <span className="text-gold-300 font-semibold">Parent Note:</span> {matchingParent.childrenNote}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setMatchingParent(null)}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Filter Bar */}
              <div className="p-4 bg-primary-50/50 border-b border-primary-100 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by student name, login email, or class…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-primary-200 rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {studentSearch && (
                    <button
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: 'All Students' },
                    { id: 'INDEPENDENT', label: 'Independent Accounts (Self-login)' },
                    { id: 'UNLINKED', label: 'Unlinked (No Parent)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStudentTypeFilter(tab.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        studentTypeFilter === tab.id
                          ? 'bg-primary-700 text-white shadow-xs'
                          : 'bg-white border border-primary-200 text-ink/70 hover:bg-primary-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Student List */}
              <div className="p-4 overflow-y-auto divide-y divide-primary-50 flex-1">
                {modalAvailableStudents.length === 0 ? (
                  <div className="py-8 text-center text-ink/50 text-sm">
                    No students match your search filter.
                  </div>
                ) : (
                  modalAvailableStudents.map((s) => {
                    const isAlreadyLinkedToThis = (matchingParent.children || []).some(
                      (c) => String(c._id) === String(s._id)
                    );
                    const isLinkedToOther =
                      s.parentId &&
                      String(s.parentId?._id || s.parentId) !== String(matchingParent._id);
                    const isIndep = s.isIndependent || !!s.userId;

                    return (
                      <div
                        key={s._id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-primary-50/30 px-2 rounded-xl transition"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-ink">{s.fullName}</span>
                            {isIndep ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                <Key className="w-3 h-3" />
                                Independent Account
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium bg-gold-500/15 text-gold-800 px-2 py-0.5 rounded-full">
                                Parent-Managed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-ink/60 mt-1 flex-wrap">
                            <span>Class: {s.classId?.name || 'Unassigned'}</span>
                            {s.userId?.email && (
                              <span className="text-primary-700 font-medium">Login: {s.userId.email}</span>
                            )}
                            {isLinkedToOther && (
                              <span className="text-amber-700 font-medium">
                                Current Parent: {s.parentId?.fullName || 'Assigned elsewhere'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isAlreadyLinkedToThis ? (
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              Matched to this parent
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={processing}
                                onClick={() => matchStudent(matchingParent._id, s._id, false)}
                                className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
                              >
                                {processing ? 'Matching…' : 'Match to Parent'}
                              </button>

                              {matchingParent.status === 'PENDING' && (
                                <button
                                  disabled={processing}
                                  onClick={() => matchStudent(matchingParent._id, s._id, true)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
                                  title="Matches child and approves parent account simultaneously"
                                >
                                  Match & Approve
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-primary-50/50 border-t border-primary-100 flex items-center justify-between text-xs text-ink/60">
                <span>
                  Showing {modalAvailableStudents.length} of {allStudents.length} total students
                </span>
                <button
                  onClick={() => setMatchingParent(null)}
                  className="px-4 py-2 bg-white border border-primary-200 rounded-lg font-medium text-ink/70 hover:bg-primary-50 transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

