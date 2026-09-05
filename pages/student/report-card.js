import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ReportCardView from '@/components/ReportCardView';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import { Award, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudentReportCardPage() {
  const user = useRequireRole(['STUDENT']);
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setLoading(true);
      apiFetch('/api/student/report-card')
        .then((data) => {
          setReportCard(data.reportCard);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load report card');
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="no-print mb-4 flex items-center justify-between">
          <Link
            href="/student/results"
            className="inline-flex items-center gap-1.5 text-xs text-primary-700 hover:text-primary-900 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Results
          </Link>
        </div>

        {loading && <Spinner label="Generating your official academic report card…" />}

        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-center">
            <p className="font-semibold mb-1">Could not load report card</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && !reportCard && (
          <EmptyState
            title="Report card not available yet"
            message="Your academic evaluations will be aggregated into this official report card as soon as your exams are submitted."
          />
        )}

        {!loading && reportCard && (
          <ReportCardView
            reportCard={reportCard}
            role="STUDENT"
            canEditRemarks={false}
          />
        )}
      </div>
    </Layout>
  );
}
