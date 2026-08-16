import Layout from '@/components/Layout';
import { useRequireRole } from '@/hooks/useAuth';

export default function ParentProfile() {
  const user = useRequireRole(['PARENT']);
  if (!user) return null;
  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">My profile</h1>
      <div className="max-w-sm bg-white border border-primary-100 rounded-xl p-5 space-y-3">
        <div>
          <p className="text-xs text-ink/50 uppercase font-medium">Name</p>
          <p className="text-ink">{user.fullName}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50 uppercase font-medium">Email</p>
          <p className="text-ink">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-ink/50 uppercase font-medium">Status</p>
          <p className="text-ink">{user.status}</p>
        </div>
      </div>
    </Layout>
  );
}
