import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(`/${user.role.toLowerCase()}`);
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="font-display text-4xl font-semibold text-primary-800 mb-3">Al-Huda Exam Portal</h1>
        <p className="text-ink/60 mb-8">Online examinations for Arabic and Islamic Studies.</p>
        <div className="flex flex-col gap-3">
          <Link href="/login" className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg">
            Log in
          </Link>
          <Link href="/register/parent" className="border border-primary-200 hover:bg-primary-50 text-primary-800 font-medium py-3 rounded-lg">
            Register as a parent
          </Link>
          <Link href="/register/student" className="border border-primary-200 hover:bg-primary-50 text-primary-800 font-medium py-3 rounded-lg">
            Register as an independent student
          </Link>
        </div>
      </div>
    </div>
  );
}
