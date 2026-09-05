import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import Link from 'next/link';
import { Award, ArrowRight } from 'lucide-react';

export default function StudentResults() {
  const user = useRequireRole(['STUDENT']);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/student/results').then((d) => setResults(d.results));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary-800">My Exam Results</h1>
          <p className="text-xs sm:text-sm text-ink/60 mt-0.5">
            Individual assessment scores and comprehensive academic evaluation.
          </p>
        </div>

        <Link
          href="/student/report-card"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-xs sm:text-sm font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Award className="w-4 h-4 text-gold-400" />
          <span>View Official Report Card</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>

      {/* Featured Report Card Banner */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-800 text-white rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-gold-400 flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold">Academic Report Card Available</h2>
            <p className="text-xs sm:text-sm text-primary-100/80 mt-0.5">
              Access your cumulative GPA, letter grades, subject proficiencies, and teacher appraisals.
            </p>
          </div>
        </div>
        <Link
          href="/student/report-card"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-primary-950 font-bold text-xs sm:text-sm transition flex-shrink-0"
        >
          <span>Open Report Card</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
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
    </Layout>
  );
}
