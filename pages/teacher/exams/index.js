import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

const STATUS_COLOR = {
  DRAFT: 'bg-ink/10 text-ink/60',
  PUBLISHED: 'bg-primary-100 text-primary-700',
  CLOSED: 'bg-red-50 text-red-600',
};

export default function TeacherExams() {
  const user = useRequireRole(['TEACHER']);
  const [exams, setExams] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/exams').then((d) => setExams(d.exams));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-semibold text-primary-800">Exams</h1>
        <Link href="/teacher/exams/create" className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + New exam
        </Link>
      </div>

      {exams === null && <Spinner />}
      {exams && exams.length === 0 && <EmptyState title="No exams yet" action={<Link href="/teacher/exams/create" className="text-primary-600 font-medium">Create your first exam →</Link>} />}
      {exams && exams.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {exams.map((e) => (
            <Link key={e._id} href={`/teacher/exams/${e._id}`} className="p-4 flex items-center justify-between hover:bg-primary-50/40">
              <div>
                <p className="font-medium text-ink">{e.title}</p>
                <p className="text-xs text-ink/50">{e.subjectId?.name} · {e.classId?.name}</p>
              </div>
              <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${STATUS_COLOR[e.status]}`}>{e.status}</span>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
