import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import ReportCardView from '@/components/ReportCardView';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';
import { Award, ArrowLeft, Users, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ParentReportCardPage() {
  const user = useRequireRole(['PARENT']);
  const router = useRouter();
  const { studentId: queryStudentId } = router.query;

  const [children, setChildren] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(queryStudentId || '');
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async (targetId) => {
    setLoading(true);
    setError(null);
    try {
      const url = targetId
        ? `/api/parent/report-card?studentId=${targetId}`
        : '/api/parent/report-card';
      const data = await apiFetch(url);
      setChildren(data.children || []);
      setSelectedStudentId(data.selectedStudentId || '');
      setReportCard(data.reportCard || null);
    } catch (err) {
      setError(err.message || 'Failed to load report card');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData(queryStudentId);
    }
  }, [user, queryStudentId]);

  const handleChildSelect = (childId) => {
    setSelectedStudentId(childId);
    router.push(`/parent/report-card?studentId=${childId}`, undefined, { shallow: true });
    loadData(childId);
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Navigation & Child Selector (Hidden in Print) */}
        <div className="no-print mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-900">
                  Student Academic Report Card
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-ink/60 mt-1">
                View official grades, performance metrics, teacher appraisals, and conduct records for your child.
              </p>
            </div>

            <Link
              href="/parent/children"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 font-semibold"
            >
              <Users className="w-3.5 h-3.5" />
              Manage Children
            </Link>
          </div>

          {/* Children Tabs Switcher */}
          {children.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-primary-100">
              <span className="text-xs font-semibold text-ink/60 uppercase tracking-wide mr-1 flex-shrink-0">
                Select Child:
              </span>
              {children.map((child) => {
                const active = child._id === selectedStudentId;
                return (
                  <button
                    key={child._id}
                    onClick={() => handleChildSelect(child._id)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex-shrink-0 flex items-center gap-2 ${
                      active
                        ? 'bg-primary-700 text-white shadow-sm'
                        : 'bg-white border border-primary-200 text-ink/70 hover:bg-primary-50'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{child.fullName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      active ? 'bg-primary-800 text-gold-300' : 'bg-primary-50 text-ink/50'
                    }`}>
                      {child.className}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading && <Spinner label="Generating official report card…" />}

        {error && (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-center">
            <p className="font-semibold mb-1">Could not load report card</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && children.length === 0 && (
          <EmptyState
            title="No children linked to your parent account"
            message="Please contact the school teacher to have your child linked to your account."
          />
        )}

        {!loading && !error && reportCard && (
          <ReportCardView
            reportCard={reportCard}
            role="PARENT"
            canEditRemarks={false}
          />
        )}
      </div>
    </Layout>
  );
}
