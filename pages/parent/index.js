import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function ParentOverview() {
  const user = useRequireRole(['PARENT']);
  const [children, setChildren] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/parent/children').then((d) => setChildren(d.children));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">Welcome, {user.fullName}</h1>
      {children === null && <Spinner />}
      {children && children.length === 0 && (
        <EmptyState
          title="No children added yet"
          message="Add your child's profile to see their assigned exams and results."
          action={<Link href="/parent/children" className="text-primary-600 font-medium">Add a child →</Link>}
        />
      )}
      {children && children.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {children.map((c) => (
            <Link key={c._id} href={`/parent/children/${c._id}`} className="bg-white border border-primary-100 rounded-xl p-5 hover:border-primary-300 transition">
              <p className="font-semibold text-ink">{c.fullName}</p>
              <p className="text-sm text-ink/50">{c.classId?.name || 'No class assigned yet'}</p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
