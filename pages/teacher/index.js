import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function TeacherOverview() {
  const user = useRequireRole(['TEACHER']);
  const [pendingParents, setPendingParents] = useState(null);
  const [grading, setGrading] = useState(null);
  const [exams, setExams] = useState(null);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/teacher/parents?status=PENDING').then((d) => setPendingParents(d.parents));
    apiFetch('/api/teacher/grading').then((d) => setGrading(d.attempts));
    apiFetch('/api/exams').then((d) => setExams(d.exams));
    apiFetch('/api/teacher/integrity-events').then((d) => setIntegrity(d.events.slice(0, 5)));
  }, [user]);

  if (!user) return null;

  const published = exams?.filter((e) => e.status === 'PUBLISHED').length ?? '—';

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Overview</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Published exams" value={published} href="/teacher/exams" />
        <StatCard label="Parents awaiting approval" value={pendingParents?.length ?? '—'} href="/teacher/parents" highlight={pendingParents?.length > 0} />
        <StatCard label="Attempts awaiting grading" value={grading?.length ?? '—'} href="/teacher/grading" highlight={grading?.length > 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-primary-100 rounded-xl p-5">
          <h2 className="font-semibold text-ink mb-3">Pending manual grading</h2>
          {grading === null && <Spinner />}
          {grading && grading.length === 0 && <p className="text-sm text-ink/50">Nothing to grade right now.</p>}
          {grading && grading.slice(0, 5).map((a) => (
            <Link key={a._id} href="/teacher/grading" className="flex items-center justify-between py-2 border-b border-primary-50 last:border-0 text-sm">
              <span>{a.studentId?.fullName} — {a.examId?.title}</span>
              <span className="text-primary-600 font-medium">Grade →</span>
            </Link>
          ))}
        </div>

        <div className="bg-white border border-primary-100 rounded-xl p-5">
          <h2 className="font-semibold text-ink mb-3">Recent integrity flags</h2>
          {integrity === null && <Spinner />}
          {integrity && integrity.length === 0 && <p className="text-sm text-ink/50">No flags logged.</p>}
          {integrity && integrity.map((e) => (
            <div key={e._id} className="flex items-center justify-between py-2 border-b border-primary-50 last:border-0 text-sm">
              <span>{e.studentId?.fullName} — {e.attemptId?.examId?.title}</span>
              <span className="text-ink/50 text-xs uppercase">{e.type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, href, highlight }) {
  return (
    <Link href={href} className={`bg-white border rounded-xl p-5 hover:border-primary-300 transition ${highlight ? 'border-gold-400' : 'border-primary-100'}`}>
      <p className="text-3xl font-display font-semibold text-primary-800">{value}</p>
      <p className="text-sm text-ink/50">{label}</p>
    </Link>
  );
}
