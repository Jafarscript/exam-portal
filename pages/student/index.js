import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function StudentOverview() {
  const user = useRequireRole(['STUDENT']);
  const [profile, setProfile] = useState(null);
  const [exams, setExams] = useState(null);

  useEffect(() => {
    if (user) {
      apiFetch('/api/student/profile').then((d) => setProfile(d.student));
      apiFetch('/api/student/exams').then((d) => setExams(d.exams));
    }
  }, [user]);

  if (!user) return null;

  const upcoming = exams?.filter((e) => e.attemptStatus === 'NOT_STARTED' || e.attemptStatus === 'IN_PROGRESS') || [];

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-1">Welcome, {user.fullName}</h1>
      <p className="text-sm text-ink/50 mb-6">{profile?.classId?.name || 'No class assigned yet'}</p>

      <h2 className="font-semibold text-ink mb-3">Exams awaiting you</h2>
      {exams === null && <Spinner />}
      {exams && upcoming.length === 0 && <p className="text-sm text-ink/50">Nothing due right now — check back later.</p>}
      {exams && upcoming.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {upcoming.map(({ exam, attemptStatus, attemptId }) => (
            <Link key={exam._id} href={attemptStatus === 'IN_PROGRESS' ? `/student/exams/${exam._id}/take` : `/student/exams/${exam._id}`} className="bg-white border border-primary-100 rounded-xl p-5 hover:border-primary-300 transition">
              <p className="font-semibold text-ink">{exam.title}</p>
              <p className="text-sm text-ink/50">{exam.subjectId?.name}</p>
              {attemptStatus === 'IN_PROGRESS' && <span className="inline-block mt-2 text-xs font-semibold text-gold-500 uppercase">Resume in progress</span>}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
