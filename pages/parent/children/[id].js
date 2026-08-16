import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

const TABS = ['Profile', 'Exams', 'Results', 'History'];

export default function ChildDetail() {
  const user = useRequireRole(['PARENT']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [tab, setTab] = useState('Profile');
  const [child, setChild] = useState(null);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState({ fullName: '' });

  useEffect(() => {
    if (user && id) {
      apiFetch(`/api/parent/children/${id}`).then((d) => {
        setChild(d.child);
        setForm({ fullName: d.child.fullName });
      });
    }
  }, [user, id]);

  useEffect(() => {
    if (!id) return;
    if (tab === 'Results') apiFetch(`/api/parent/results?studentId=${id}`).then((d) => setResults(d.results));
    if (tab === 'History') apiFetch(`/api/parent/history?studentId=${id}`).then((d) => setHistory(d.attempts));
  }, [tab, id]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const d = await apiFetch(`/api/parent/children/${id}`, { method: 'PATCH', body: form });
      setChild(d.child);
      push('Saved', 'success');
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user || !child) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-1">{child.fullName}</h1>
      <p className="text-sm text-ink/50 mb-6">{child.classId?.name || 'No class assigned yet'}</p>

      <div className="flex gap-1 border-b border-primary-100 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink/50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <form onSubmit={saveProfile} className="max-w-sm bg-white border border-primary-100 rounded-xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-ink/70">Full name</label>
            <input value={form.fullName} onChange={(e) => setForm({ fullName: e.target.value })} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
          </div>
          <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg">Save</button>
        </form>
      )}

      {tab === 'Exams' && (
        <p className="text-sm text-ink/60">Exams are taken from the child's own login. This tab is informational only — {child.fullName} needs their own device access to sit an exam.</p>
      )}

      {tab === 'Results' && (
        <>
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
                  <div className="text-right">
                    {r.status === 'PENDING' ? (
                      <span className="text-xs font-semibold text-gold-500 uppercase">Pending review</span>
                    ) : (
                      <>
                        <p className="font-semibold text-ink">{r.percentage}%</p>
                        <span className={`text-xs font-semibold uppercase ${r.passed ? 'text-primary-600' : 'text-red-600'}`}>{r.passed ? 'Pass' : 'Fail'}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'History' && (
        <>
          {history === null && <Spinner />}
          {history && history.length === 0 && <EmptyState title="No exam attempts yet" />}
          {history && history.length > 0 && (
            <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
              {history.map((a) => (
                <div key={a._id} className="p-4 flex items-center justify-between">
                  <p className="font-medium text-ink">{a.examId?.title}</p>
                  <span className="text-xs font-semibold uppercase text-ink/50">{a.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
