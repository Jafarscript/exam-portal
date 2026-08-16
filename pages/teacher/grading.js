import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import RTLText from '@/components/RTLText';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function TeacherGrading() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [queue, setQueue] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [marksDraft, setMarksDraft] = useState({});

  const loadQueue = () => apiFetch('/api/teacher/grading').then((d) => setQueue(d.attempts));
  useEffect(() => { if (user) loadQueue(); }, [user]); // eslint-disable-line

  const openAttempt = async (id) => {
    setActiveId(id);
    const d = await apiFetch(`/api/teacher/attempts/${id}`);
    setDetail(d);
    const drafts = {};
    d.items.forEach((item) => { if (item.gradingStatus === 'PENDING_REVIEW') drafts[item.answerId] = { marksAwarded: '', feedback: '' }; });
    setMarksDraft(drafts);
  };

  const gradeOne = async (answerId, maxMarks) => {
    const draft = marksDraft[answerId];
    if (draft.marksAwarded === '' || draft.marksAwarded === undefined) return push('Enter marks first', 'error');
    if (Number(draft.marksAwarded) > maxMarks) return push(`Marks must be at most ${maxMarks}`, 'error');
    try {
      const d = await apiFetch(`/api/teacher/answers/${answerId}/grade`, { method: 'PATCH', body: { marksAwarded: Number(draft.marksAwarded), feedback: draft.feedback || '' } });
      push(d.finalized ? 'Graded — result finalized' : 'Graded', 'success');
      await openAttempt(activeId);
      loadQueue();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Manual grading</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {queue === null && <Spinner />}
          {queue && queue.length === 0 && <EmptyState title="Nothing to grade" />}
          {queue && (
            <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
              {queue.map((a) => (
                <button key={a._id} onClick={() => openAttempt(a._id)} className={`w-full text-left p-4 hover:bg-primary-50/50 ${activeId === a._id ? 'bg-primary-50' : ''}`}>
                  <p className="font-medium text-ink text-sm">{a.studentId?.fullName}</p>
                  <p className="text-xs text-ink/50">{a.examId?.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!detail && <p className="text-sm text-ink/50">Select a submission to grade.</p>}
          {detail && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-ink">{detail.student.fullName} — {detail.exam.title}</h2>
                <p className="text-xs text-ink/50">{detail.exam.subject}</p>
              </div>
              {detail.items.filter((i) => i.gradingStatus === 'PENDING_REVIEW').length === 0 && (
                <p className="text-sm text-primary-700 bg-primary-50 px-4 py-3 rounded-lg">All questions graded for this attempt.</p>
              )}
              {detail.items.map((item) => (
                <div key={item.answerId} className="bg-white border border-primary-100 rounded-xl p-5">
                  <RTLText as="p" text={item.questionText} direction={item.textDirection} className="text-ink font-medium mb-3" />
                  <div className="bg-primary-50/60 rounded-lg p-3 mb-3">
                    <p className="text-xs text-ink/50 mb-1">Student's answer</p>
                    <p dir="auto" className="bidi-auto text-ink whitespace-pre-wrap">{item.studentAnswer || <span className="text-ink/40 italic">No answer given</span>}</p>
                  </div>

                  {item.gradingStatus === 'PENDING_REVIEW' ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="text-xs font-medium text-ink/60">Marks (max {item.marks})</label>
                        <input
                          type="number" min={0} max={item.marks}
                          value={marksDraft[item.answerId]?.marksAwarded ?? ''}
                          onChange={(e) => setMarksDraft((p) => ({ ...p, [item.answerId]: { ...p[item.answerId], marksAwarded: e.target.value } }))}
                          className="w-24 border border-primary-200 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-ink/60">Feedback (optional)</label>
                        <input
                          dir="auto"
                          value={marksDraft[item.answerId]?.feedback ?? ''}
                          onChange={(e) => setMarksDraft((p) => ({ ...p, [item.answerId]: { ...p[item.answerId], feedback: e.target.value } }))}
                          className="w-full bidi-auto border border-primary-200 rounded-lg px-3 py-2"
                        />
                      </div>
                      <button onClick={() => gradeOne(item.answerId, item.marks)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                        Save
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-ink/60">
                      {item.marksAwarded ?? 0} / {item.marks} marks
                      {item.feedback && <span> — “{item.feedback}”</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
