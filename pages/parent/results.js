import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import Link from 'next/link';
import { Award, ArrowRight } from 'lucide-react';

export default function ParentResults() {
  const user = useRequireRole(['PARENT']);
  const [children, setChildren] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/parent/children').then((d) => { setChildren(d.children); if (d.children[0]) setStudentId(d.children[0]._id); });
  }, [user]);

  useEffect(() => {
    if (studentId) apiFetch(`/api/parent/results?studentId=${studentId}`).then((d) => setResults(d.results));
  }, [studentId]);

  if (!user) return null;

  const currentChild = children.find((c) => c._id === studentId);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary-800">Children Examination Results</h1>
          <p className="text-xs sm:text-sm text-ink/60 mt-0.5">
            Monitor scores across subjects and view full official report cards.
          </p>
        </div>

        {studentId && (
          <Link
            href={`/parent/report-card?studentId=${studentId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-xs sm:text-sm font-semibold shadow-sm transition self-start sm:self-auto"
          >
            <Award className="w-4 h-4 text-gold-400" />
            <span>View {currentChild?.fullName ? `${currentChild.fullName}'s` : 'Official'} Report Card</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState title="No children added yet" />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-semibold text-ink/60 uppercase">Select Child:</span>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="border border-primary-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>
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
        </>
      )}
    </Layout>
  );
}
