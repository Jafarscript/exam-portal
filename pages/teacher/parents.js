import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED'];

export default function TeacherParents() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [filter, setFilter] = useState('PENDING');
  const [parents, setParents] = useState(null);

  const load = () => apiFetch(`/api/teacher/parents?status=${filter}`).then((d) => setParents(d.parents));

  useEffect(() => { if (user) load(); }, [user, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id, action) => {
    try {
      await apiFetch(`/api/teacher/parents/${id}/${action}`, { method: 'PATCH' });
      push(`Parent ${action}d`, 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Parents</h1>
      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase ${filter === f ? 'bg-primary-600 text-white' : 'bg-white border border-primary-100 text-ink/60'}`}>
            {f}
          </button>
        ))}
      </div>

      {parents === null && <Spinner />}
      {parents && parents.length === 0 && <EmptyState title={`No ${filter.toLowerCase()} parents`} />}
      {parents && parents.length > 0 && (
        <div className="bg-white border border-primary-100 rounded-xl divide-y divide-primary-50">
          {parents.map((p) => (
            <div key={p._id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{p.fullName}</p>
                <p className="text-xs text-ink/50">{p.email}</p>
              </div>
              {filter === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => act(p._id, 'approve')} className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold">Approve</button>
                  <button onClick={() => act(p._id, 'reject')} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
