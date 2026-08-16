import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function ExamResults() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { id } = router.query;
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (user && id) {
      apiFetch(`/api/teacher/statistics?examId=${id}`).then(setStats);
      apiFetch(`/api/teacher/results?examId=${id}`).then((d) => setResults(d.results));
    }
  }, [user, id]);

  if (!user || !stats || !results) return <Layout><Spinner /></Layout>;

  const { exam, summary, perQuestion } = stats;

  return (
    <Layout>
      <Link href={`/teacher/exams/${id}`} className="text-sm text-primary-600 mb-4 inline-block">← Back to exam</Link>
      <h1 dir="auto" className="font-display text-3xl font-semibold text-ink mb-6 bidi-auto">{exam.title} — Results</h1>

      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Metric label="Submitted" value={summary.submittedCount} />
        <Metric label="Pending" value={summary.pendingCount} />
        <Metric label="Finalized" value={summary.finalizedCount} />
        <Metric label="Average" value={summary.averageScore !== null ? `${summary.averageScore}%` : '—'} />
        <Metric label="Highest" value={summary.highestScore !== null ? `${summary.highestScore}%` : '—'} />
        <Metric label="Lowest" value={summary.lowestScore !== null ? `${summary.lowestScore}%` : '—'} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <Metric label="Pass rate" value={summary.passRate !== null ? `${summary.passRate}%` : '—'} />
        <Metric label="Fail rate" value={summary.failRate !== null ? `${summary.failRate}%` : '—'} />
      </div>

      <h2 className="font-semibold text-ink mb-3">Per-student results</h2>
      {results.length === 0 ? <EmptyState title="No submissions yet" /> : (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50 mb-8">
          {results.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between">
              <p className="font-medium text-ink">{r.studentId?.fullName}</p>
              {r.status === 'PENDING' ? (
                <span className="text-xs font-semibold text-gold-500 uppercase">Pending review</span>
              ) : (
                <div className="text-right">
                  <p className="font-semibold text-ink">{r.percentage}%</p>
                  <span className={`text-xs font-semibold uppercase ${r.passed ? 'text-primary-600' : 'text-red-600'}`}>{r.passed ? 'Pass' : 'Fail'}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-ink mb-3">Per-question difficulty</h2>
      <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
        {perQuestion.map((q, i) => (
          <div key={q.questionId} className="p-4">
            <p dir="auto" className="text-sm text-ink bidi-auto mb-1">Q{i + 1}. {q.text}</p>
            <p className="text-xs text-ink/50">
              {q.difficultyPercent !== null ? `${q.difficultyPercent}% correct` : 'Not yet graded'} · {q.numCorrect} correct / {q.numIncorrect} incorrect
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white border border-primary-100 rounded-xl p-4 text-center">
      <p className="text-2xl font-display font-semibold text-primary-800">{value}</p>
      <p className="text-xs text-ink/50 mt-1">{label}</p>
    </div>
  );
}
