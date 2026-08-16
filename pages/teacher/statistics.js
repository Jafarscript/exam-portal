import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function TeacherStatistics() {
  const user = useRequireRole(['TEACHER']);
  const [exams, setExams] = useState(null);
  const [events, setEvents] = useState(null);

  useEffect(() => {
    if (user) {
      apiFetch('/api/exams?status=PUBLISHED').then((d) => setExams(d.exams));
      apiFetch('/api/teacher/integrity-events').then((d) => setEvents(d.events));
    }
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Class statistics</h1>
      <p className="text-sm text-ink/60 mb-4">Choose a published exam to see its full breakdown, scores, and pass rate.</p>

      {exams === null && <Spinner />}
      {exams && exams.length === 0 && <EmptyState title="No published exams yet" />}
      {exams && exams.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50 mb-10">
          {exams.map((e) => (
            <Link key={e._id} href={`/teacher/exams/${e._id}/results`} className="p-4 flex items-center justify-between hover:bg-primary-50/40">
              <div>
                <p className="font-medium text-ink">{e.title}</p>
                <p className="text-xs text-ink/50">{e.subjectId?.name} · {e.classId?.name}</p>
              </div>
              <span className="text-primary-600 text-sm font-medium">View →</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-ink mb-3">Integrity flags — all exams</h2>
      {events === null && <Spinner />}
      {events && events.length === 0 && <EmptyState title="No flags logged" />}
      {events && events.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {events.map((e) => (
            <div key={e._id} className="p-4 flex items-center justify-between text-sm">
              <span>{e.studentId?.fullName} — {e.attemptId?.examId?.title}</span>
              <span className="text-ink/50">{e.type.replace('_', ' ')} · {new Date(e.timestamp).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
