import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { toLocalDatetimeLocal } from '@/lib/deadlineFormat';

export default function ExamDetail() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [exam, setExam] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenDeadline, setReopenDeadline] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const [poolSize, setPoolSize] = useState('');
  const [poolSaving, setPoolSaving] = useState(false);

  // Live proctoring state
  const [liveData, setLiveData] = useState(null);
  const [proctorLoading, setProctorLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    return apiFetch(`/api/exams/${id}`).then((d) => {
      setExam(d.exam);
      setPoolSize(d.exam.questionsToShow ?? '');
    });
  }, [id]);

  const loadLiveData = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/exams/${id}/admit`);
      setLiveData(data);
    } catch (e) {
      // Ignore background poll errors
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      load();
      loadLiveData();
    }
  }, [user, id, load, loadLiveData]);

  // Auto-refresh live proctoring roster every 3 seconds for published exams
  useEffect(() => {
    if (!user || !id || !exam || exam.status !== 'PUBLISHED') return;
    const interval = setInterval(() => {
      loadLiveData();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, id, exam, loadLiveData]);

  const handleAdmit = async (studentId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/exams/${id}/admit`, {
        method: 'POST',
        body: { action: 'ADMIT', studentId },
      });
      push('Student admitted — exam questions unlocked', 'success');
      loadLiveData();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdmitAll = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/exams/${id}/admit`, {
        method: 'POST',
        body: { action: 'ADMIT_ALL' },
      });
      push(res.message || 'All waiting students admitted', 'success');
      loadLiveData();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (studentId) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/exams/${id}/admit`, {
        method: 'POST',
        body: { action: 'REVOKE', studentId },
      });
      push('Student exam view locked', 'info');
      loadLiveData();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const savePoolSize = async () => {
    setPoolSaving(true);
    try {
      const { exam: updated } = await apiFetch(`/api/exams/${id}`, { method: 'PATCH', body: { questionsToShow: poolSize === '' ? null : Number(poolSize) } });
      setExam(updated);
      push('Saved', 'success');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPoolSaving(false);
    }
  };

  const publish = async () => {
    try {
      await apiFetch(`/api/exams/${id}/publish`, { method: 'POST' });
      push('Exam published', 'success');
      load();
      loadLiveData();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const close = async () => {
    try {
      await apiFetch(`/api/exams/${id}/close`, { method: 'POST' });
      push('Exam closed', 'success');
      load();
      loadLiveData();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const handleReopen = async (e) => {
    if (e) e.preventDefault();
    setIsReopening(true);
    try {
      await apiFetch(`/api/exams/${id}/reopen`, {
        method: 'POST',
        body: {
          deadline: reopenDeadline || undefined,
        },
      });
      push('Exam successfully reopened and is now available for students', 'success');
      setShowReopenDialog(false);
      load();
      loadLiveData();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setIsReopening(false);
    }
  };

  const openReopenModal = () => {
    // If deadline has already passed, pre-set deadline to 24 hours from now; otherwise keep existing deadline
    const currentDeadlineTime = new Date(exam.deadline).getTime();
    const isPast = isNaN(currentDeadlineTime) || currentDeadlineTime <= Date.now();
    const targetDate = isPast ? new Date(Date.now() + 24 * 60 * 60 * 1000) : new Date(exam.deadline);
    setReopenDeadline(toLocalDatetimeLocal(targetDate));
    setShowReopenDialog(true);
  };

  const remove = async () => {
    try {
      await apiFetch(`/api/exams/${id}`, { method: 'DELETE' });
      push('Exam deleted', 'success');
      router.push('/teacher/exams');
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user || !exam) return <Layout><Spinner /></Layout>;

  const waitingStudents = liveData?.students?.filter((s) => s.proctorStatus === 'WAITING_APPROVAL') || [];

  return (
    <Layout>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-600">{exam.subjectId?.name} · {exam.classId?.name}</p>
          <h1 dir="auto" className="font-display text-3xl font-semibold text-ink bidi-auto">{exam.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-full h-fit ${
            exam.status === 'DRAFT' ? 'bg-ink/10 text-ink/60' : exam.status === 'PUBLISHED' ? 'bg-primary-100 text-primary-700' : 'bg-red-50 text-red-600'
          }`}>{exam.status}</span>
          {exam.requiresLiveApproval !== false && (
            <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Screen-Share Gate Active
            </span>
          )}
        </div>
      </div>

      <dl className="grid sm:grid-cols-4 gap-4 mb-6 bg-white border border-primary-100 rounded-xl p-5 text-sm">
        <div><dt className="text-ink/50">Deadline</dt><dd className="font-medium">{new Date(exam.deadline).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
        <div><dt className="text-ink/50">Duration</dt><dd className="font-medium">{exam.isTimed ? `${exam.duration} min` : 'Untimed'}</dd></div>
        <div><dt className="text-ink/50">Pass mark</dt><dd className="font-medium">{exam.passMark}%</dd></div>
        <div><dt className="text-ink/50">Randomization</dt><dd className="font-medium">{[exam.randomizeQuestions && 'Questions', exam.randomizeAnswers && 'Answers'].filter(Boolean).join(', ') || 'None'}</dd></div>
        <div className="sm:col-span-4 border-t border-primary-50 pt-4">
          <dt className="text-ink/50 mb-1">Questions shown per student</dt>
          {exam.status === 'DRAFT' ? (
            <dd className="flex items-center gap-2">
              <input
                type="number" min={1}
                placeholder="All questions"
                value={poolSize}
                onChange={(e) => setPoolSize(e.target.value)}
                className="w-32 border border-primary-200 rounded-lg px-3 py-1.5"
              />
              <button onClick={savePoolSize} disabled={poolSaving} className="text-primary-600 font-medium text-xs disabled:opacity-50">
                {poolSaving ? 'Saving…' : 'Save'}
              </button>
              <span className="text-xs text-ink/40">Leave blank to show every question in the bank.</span>
            </dd>
          ) : (
            <dd className="font-medium">{exam.questionsToShow || 'All questions'}</dd>
          )}
        </div>
      </dl>

      {/* CLOSED EXAM ALERT BANNER */}
      {exam.status === 'CLOSED' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="text-sm font-bold text-red-900">This exam is currently closed</p>
              <p className="text-xs text-red-700">Students cannot enter or start new attempts. You can reopen it at any time to make it available again.</p>
            </div>
          </div>
          <button
            onClick={openReopenModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5"
          >
            ↻ Reopen Exam
          </button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href={`/teacher/exams/${id}/questions`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
          Manage questions
        </Link>
        <Link href={`/teacher/exams/${id}/results`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
          Results & statistics
        </Link>
        {exam.status === 'DRAFT' && (
          <>
            <Link href={`/teacher/exams/${id}/edit`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
              Edit details
            </Link>
            <button onClick={() => setConfirmPublish(true)} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium">Publish</button>
            <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">Delete</button>
          </>
        )}
        {exam.status === 'PUBLISHED' && (
          <button onClick={() => setConfirmClose(true)} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">Close exam</button>
        )}
        {exam.status === 'CLOSED' && (
          <>
            <button onClick={openReopenModal} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm">
              ↻ Reopen exam
            </button>
            <Link href={`/teacher/exams/${id}/edit`} className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium hover:bg-primary-50">
              Edit details
            </Link>
          </>
        )}
      </div>

      {/* LIVE PROCTORING & SCREEN-SHARE ADMITTANCE MONITOR */}
      <section className="bg-white border-2 border-primary-200 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-5 border-b border-primary-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="font-display text-xl font-bold text-primary-900">
                Live Proctoring & Screen-Share Admittance
              </h2>
            </div>
            <p className="text-xs text-ink/60 mt-1">
              Prevent malpractice: verify student screen shares on your video call, then click Admit to unlock their questions and timer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {waitingStudents.length > 0 && (
              <button
                onClick={handleAdmitAll}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                ✓ Admit All Waiting ({waitingStudents.length})
              </button>
            )}
            <button
              onClick={loadLiveData}
              className="text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-2 rounded-lg"
            >
              ↻ Refresh Live Status
            </button>
          </div>
        </div>

        {waitingStudents.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  {waitingStudents.length} student{waitingStudents.length > 1 ? 's are' : ' is'} waiting in the exam room
                </p>
                <p className="text-xs text-amber-800">
                  Confirm their screen is actively shared on your meeting, then grant them access below.
                </p>
              </div>
            </div>
            <button
              onClick={handleAdmitAll}
              disabled={actionLoading}
              className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-lg shadow-sm"
            >
              Admit All
            </button>
          </div>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary-100 text-xs font-semibold text-ink/50 uppercase">
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Exam Status</th>
                <th className="py-3 px-3">Proctor / Screen-Share</th>
                <th className="py-3 px-3">Answered</th>
                <th className="py-3 px-3">Integrity Alerts</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {liveData?.students?.length ? (
                liveData.students.map((st) => {
                  const isWaiting = st.proctorStatus === 'WAITING_APPROVAL';
                  const isAdmitted = st.proctorStatus === 'ADMITTED';
                  const isSubmitted = ['SUBMITTED', 'PENDING_REVIEW', 'FINALIZED'].includes(st.attemptStatus);

                  return (
                    <tr key={st.studentId} className={isWaiting ? 'bg-amber-50/50' : ''}>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink">{st.fullName}</div>
                        {st.email && <div className="text-xs text-ink/40">{st.email}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          st.attemptStatus === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isSubmitted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-ink/5 text-ink/50'
                        }`}>
                          {st.attemptStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {isWaiting ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ● Waiting for Screen Share
                          </span>
                        ) : isAdmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Screen Verified & Admitted
                          </span>
                        ) : isSubmitted ? (
                          <span className="text-xs text-ink/50">Completed</span>
                        ) : (
                          <span className="text-xs text-ink/40">Not in room</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-ink/70">
                        {st.hasAttempt ? `${st.answeredCount} answered` : '—'}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {st.tabSwitchCount > 0 || st.fullscreenExitCount > 0 ? (
                          <div className="flex gap-2">
                            {st.tabSwitchCount > 0 && (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                                {st.tabSwitchCount} tab switch{st.tabSwitchCount > 1 ? 'es' : ''}
                              </span>
                            )}
                            {st.fullscreenExitCount > 0 && (
                              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                                {st.fullscreenExitCount} exit{st.fullscreenExitCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium">None</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isWaiting ? (
                          <button
                            onClick={() => handleAdmit(st.studentId)}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
                          >
                            Admit & Unlock
                          </button>
                        ) : isAdmitted && st.attemptStatus === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => handleRevoke(st.studentId)}
                            disabled={actionLoading}
                            className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md"
                          >
                            Pause Access
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-ink/40">
                    Loading student roster...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog open={confirmPublish} title="Publish exam?" message="Students in the assigned class will be able to enter the waiting room for this exam." confirmLabel="Publish" onCancel={() => setConfirmPublish(false)} onConfirm={() => { setConfirmPublish(false); publish(); }} />
      <ConfirmDialog open={confirmClose} title="Close exam?" message="Students will no longer be able to start this exam. In-progress attempts are unaffected." confirmLabel="Close" danger onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); close(); }} />
      <ConfirmDialog open={confirmDelete} title="Delete exam?" message="This permanently removes the exam and its questions." confirmLabel="Delete" danger onCancel={() => setConfirmDelete(false)} onConfirm={() => { setConfirmDelete(false); remove(); }} />

      {/* REOPEN EXAM MODAL DIALOG */}
      {showReopenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-primary-100 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
                  ↻
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-primary-900">Reopen Exam</h3>
                  <p className="text-xs text-ink/50">Make this exam available for students again</p>
                </div>
              </div>
              <button
                onClick={() => setShowReopenDialog(false)}
                className="text-ink/40 hover:text-ink text-xl font-bold px-2"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-ink/70 leading-relaxed">
              Reopening will switch this exam back to <span className="font-semibold text-primary-700">PUBLISHED</span> status. Students in <span className="font-semibold text-ink">{exam.classId?.name}</span> will be able to enter the exam room and submit their answers.
            </p>

            <form onSubmit={handleReopen} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-ink/70 uppercase mb-1.5">
                  Exam Deadline (Your local time)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={reopenDeadline}
                  onChange={(e) => setReopenDeadline(e.target.value)}
                  className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm text-ink font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-ink/40">Quick extend:</span>
                  <button
                    type="button"
                    onClick={() => setReopenDeadline(toLocalDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)))}
                    className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-2.5 py-1 rounded-md font-medium border border-primary-200"
                  >
                    +24 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setReopenDeadline(toLocalDatetimeLocal(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)))}
                    className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-2.5 py-1 rounded-md font-medium border border-primary-200"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setReopenDeadline(toLocalDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))}
                    className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-2.5 py-1 rounded-md font-medium border border-primary-200"
                  >
                    +1 Week
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-primary-50">
                <button
                  type="button"
                  onClick={() => setShowReopenDialog(false)}
                  disabled={isReopening}
                  className="px-4 py-2 text-sm font-medium text-ink/60 hover:text-ink rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReopening}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isReopening ? 'Reopening…' : 'Confirm & Reopen Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}