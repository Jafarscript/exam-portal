import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';

const NAV = {
  TEACHER: [
    ['/teacher', 'Overview'],
    ['/teacher/parents', 'Parents'],
    ['/teacher/students', 'Students'],
    ['/teacher/classes', 'Classes'],
    ['/teacher/subjects', 'Subjects'],
    ['/teacher/exams', 'Exams'],
    ['/teacher/grading', 'Grading'],
    ['/teacher/statistics', 'Statistics'],
  ],
  PARENT: [
    ['/parent', 'Overview'],
    ['/parent/children', 'Children'],
    ['/parent/results', 'Results'],
    ['/parent/history', 'History'],
  ],
  STUDENT: [
    ['/student', 'Overview'],
    ['/student/exams', 'My Exams'],
    ['/student/results', 'Results'],
    ['/student/history', 'History'],
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const links = user ? NAV[user.role] || [] : [];

  return (
    <header className="bg-primary-800 text-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? `/${user.role.toLowerCase()}` : '/'} className="flex items-center gap-2">
            <span className="font-display text-xl font-semibold tracking-wide">Al-Huda Exam Portal</span>
          </Link>
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    router.pathname === href ? 'bg-primary-700 text-white' : 'text-primary-100 hover:bg-primary-700/60'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="hidden sm:inline text-sm text-primary-100">{user.fullName}</span>
                <button onClick={logout} className="text-sm font-medium bg-primary-700 hover:bg-primary-600 px-3 py-1.5 rounded-md">
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
        {user && (
          <div className="md:hidden flex gap-1 overflow-x-auto pb-2 -mt-1">
            {links.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium ${
                  router.pathname === href ? 'bg-primary-700 text-white' : 'text-primary-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
