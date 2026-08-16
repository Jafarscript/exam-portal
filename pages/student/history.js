import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function StudentHistory() {
  const user = useRequireRole(['STUDENT']);
  const [attempts, setAttempts] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/student/history').then((d) => setAttempts(d.attempts));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Exam history</h1>
      {attempts === null && <Spinner />}
      {attempts && attempts.length === 0 && <EmptyState title="No exam attempts yet" />}
      {attempts && attempts.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {attempts.map((a) => (
            <div key={a._id} className="p-4 flex items-center justify-between">
              <p className="font-medium text-ink">{a.examId?.title}</p>
              <span className="text-xs font-semibold uppercase text-ink/50">{a.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
