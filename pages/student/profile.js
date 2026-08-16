import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/apiClient';

export default function StudentProfile() {
  const user = useRequireRole(['STUDENT']);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    if (user) apiFetch('/api/student/profile').then((d) => setStudent(d.student));
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <h1 className="font-display text-3xl font-semibold text-primary-800 mb-6">My profile</h1>
      {!student ? <Spinner /> : (
        <div className="max-w-sm bg-white border border-primary-100 rounded-xl p-5 space-y-3">
          <div><p className="text-xs text-ink/50 uppercase font-medium">Name</p><p className="text-ink">{student.fullName}</p></div>
          <div><p className="text-xs text-ink/50 uppercase font-medium">Email</p><p className="text-ink">{user.email}</p></div>
          <div><p className="text-xs text-ink/50 uppercase font-medium">Class / level</p><p className="text-ink">{student.classId?.name || 'Not yet assigned'}</p></div>
        </div>
      )}
    </Layout>
  );
}
