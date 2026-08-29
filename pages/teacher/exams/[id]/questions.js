import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import RTLText from '@/components/RTLText';
import QuestionEditor from '@/components/QuestionEditor';
import BulkQuestionImporter from '@/components/BulkQuestionImporter';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

export default function ExamQuestions() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [editingId, setEditingId] = useState(null); // _id of the question currently being edited, or null
  const [mode, setMode] = useState('single'); // 'single' | 'bulk' — which add form is showing

  const load = () => {
    apiFetch(`/api/exams/${id}`).then((d) => setExam(d.exam));
    apiFetch(`/api/exams/${id}/questions`).then((d) => setQuestions(d.questions));
  };
  useEffect(() => { if (user && id) load(); }, [user, id]); // eslint-disable-line

  const removeQuestion = async (qid) => {
    if (!confirm('Remove this question?')) return;
    try {
      await apiFetch(`/api/questions/${qid}`, { method: 'DELETE' });
      push('Question removed', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user || !exam || !questions) return <Layout><Spinner /></Layout>;

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const poolNote = exam.questionsToShow && exam.questionsToShow < questions.length
    ? ` · each student sees a random ${exam.questionsToShow} of these`
    : '';

  return (
    <Layout>
      <Link href={`/teacher/exams/${id}`} className="text-sm text-primary-600 mb-4 inline-block">← Back to exam</Link>
      <h1 dir="auto" className="font-display text-3xl font-semibold text-ink mb-1 bidi-auto">{exam.title}</h1>
      <p className="text-sm text-ink/50 mb-6">{questions.length} questions in the bank · {totalMarks} total marks{poolNote}</p>

      {exam.status === 'PUBLISHED' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-lg mb-6 flex items-center justify-between">
          <span>📢 <strong>Live Exam:</strong> You can add, edit, or remove questions at any time. Updates take effect immediately.</span>
        </div>
      )}

      {exam.status === 'CLOSED' && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded-lg mb-6 flex items-center justify-between">
          <span>🔒 <strong>Closed Exam:</strong> You can edit questions before reopening.</span>
        </div>
      )}

      {!editingId && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                mode === 'single'
                  ? 'bg-primary-700 text-white shadow-xs'
                  : 'bg-white text-ink/70 hover:bg-primary-50 border border-primary-100'
              }`}
            >
              ✍️ Add Single Question
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                mode === 'bulk'
                  ? 'bg-primary-700 text-white shadow-xs'
                  : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-200'
              }`}
            >
              <span>📋 Bulk Import (Word / Text / CSV)</span>
              <span className="text-[10px] bg-gold-400/20 text-gold-700 font-bold px-1.5 py-0.5 rounded-full border border-gold-300">
                New
              </span>
            </button>
          </div>

          {mode === 'single' ? (
            <QuestionEditor examId={id} onCreated={load} />
          ) : (
            <BulkQuestionImporter
              examId={id}
              onImported={() => { setMode('single'); load(); }}
              onCancel={() => setMode('single')}
            />
          )}
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, i) =>
          editingId === q._id ? (
            <QuestionEditor
              key={q._id}
              existingQuestion={q}
              onSaved={() => { setEditingId(null); load(); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={q._id} className="bg-white border border-primary-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-primary-600">Q{i + 1} · {q.type.replace('_', ' ')} · {q.marks} marks</span>
                  <RTLText as="p" text={q.text} direction={q.textDirection} className="text-ink mt-1" />
                  {q.options?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {q.options.map((o) => (
                        <li key={o.id} className={`text-sm flex items-center gap-2 ${JSON.stringify(q.correctAnswer).includes(o.id) ? 'text-primary-700 font-medium' : 'text-ink/60'}`}>
                          <span>{JSON.stringify(q.correctAnswer).includes(o.id) ? '✓' : '·'}</span>
                          <RTLText text={o.text} direction={o.textDirection} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <button onClick={() => setEditingId(q._id)} className="text-primary-600 hover:text-primary-800 text-xs font-semibold px-2 py-1 rounded-md hover:bg-primary-50">Edit</button>
                  <button onClick={() => removeQuestion(q._id)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded-md hover:bg-red-50">Remove</button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
