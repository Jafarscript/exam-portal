import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

const STATUS_LABEL = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  PENDING_REVIEW: 'Pending review',
  FINALIZED: 'Completed',
};

export default function StudentExams() {
  const user = useRequireRole(['STUDENT']);
  const [exams, setExams] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/student/exams').then((d) => setExams(d.exams));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">My exams</h1>
      {exams === null && <Spinner />}
      {exams && exams.length === 0 && <EmptyState title="No exams assigned yet" message="Your teacher hasn't published any exams for your class yet." />}
      {exams && exams.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {exams.map(({ exam, attemptStatus, attemptId }) => (
            <div key={exam._id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{exam.title}</p>
                <p className="text-xs text-ink/50">{exam.subjectId?.name} · Due {new Date(exam.deadline).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-ink/50">{STATUS_LABEL[attemptStatus]}</span>
                {(attemptStatus === 'NOT_STARTED' || attemptStatus === 'IN_PROGRESS') && (
                  <Link href={attemptStatus === 'IN_PROGRESS' ? `/student/exams/${exam._id}/take` : `/student/exams/${exam._id}`} className="text-sm font-medium text-primary-600 hover:underline">
                    {attemptStatus === 'IN_PROGRESS' ? 'Resume →' : 'View →'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
