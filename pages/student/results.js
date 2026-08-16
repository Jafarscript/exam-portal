import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function StudentResults() {
  const user = useRequireRole(['STUDENT']);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/student/results').then((d) => setResults(d.results));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">My results</h1>
      {results === null && <Spinner />}
      {results && results.length === 0 && <EmptyState title="No results yet" />}
      {results && results.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {results.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{r.examId?.title}</p>
                <p className="text-xs text-ink/50">{r.examId?.subjectId?.name}</p>
              </div>
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
    </Layout>
  );
}
