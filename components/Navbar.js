import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, LogOut, User, Sparkles } from 'lucide-react';

const NAV = {
  TEACHER: [
    ['/teacher', 'Overview'],
    ['/teacher/exams', 'Exams'],
    ['/teacher/grading', 'Grading'],
    ['/teacher/statistics', 'Statistics'],
    ['/teacher/students', 'Students'],
    ['/teacher/report-cards', 'Report Cards'],
    ['/teacher/parents', 'Parents'],
    ['/teacher/classes', 'Classes'],
    ['/teacher/subjects', 'Subjects'],
  ],
  PARENT: [
    ['/parent', 'Overview'],
    ['/parent/children', 'Children'],
    ['/parent/report-card', 'Report Card'],
    ['/parent/results', 'Results'],
    ['/parent/history', 'History'],
  ],
  STUDENT: [
    ['/student', 'Overview'],
    ['/student/exams', 'My Exams'],
    ['/student/report-card', 'Report Card'],
    ['/student/results', 'Results'],
    ['/student/history', 'History'],
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = user ? NAV[user.role] || [] : [];

  const isActive = (href) => {
    if (href === '/teacher' || href === '/parent' || href === '/student') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  return (
    <header className="bg-primary-900 text-cream sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link
            href={user ? `/${user.role.toLowerCase()}` : '/'}
            className="flex items-center gap-2 group flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 group-hover:bg-gold-500/30 transition">
              <Sparkles className="w-4 h-4 text-gold-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base sm:text-xl font-bold tracking-wide text-white leading-tight">
                Al-Huda
              </span>
              <span className="text-[10px] text-primary-200 uppercase tracking-wider font-semibold">
                Exam Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation (Changed from lg:flex to xl:flex) */}
          {user && (
            <nav className="hidden xl:flex items-center gap-1 mx-4 overflow-hidden">
              {links.map(([href, label]) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                      active
                        ? 'bg-primary-800 text-white shadow-inner font-semibold border border-primary-700'
                        : 'text-primary-100/80 hover:text-white hover:bg-primary-800/60'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg bg-primary-800/80 border border-primary-700/50">
                  <User className="w-3.5 h-3.5 text-primary-300" />
                  <span className="font-medium text-cream truncate max-w-[90px] md:max-w-[130px]">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary-700 text-gold-300">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Log out"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-primary-800 hover:bg-primary-700 text-primary-100 hover:text-white px-3 py-2 rounded-lg border border-primary-700 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>

                {/* Mobile Menu Toggle Button (Changed from lg:hidden to xl:hidden) */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  className="xl:hidden p-2 rounded-lg text-primary-200 hover:text-white hover:bg-primary-800 transition"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-semibold bg-primary-800 hover:bg-primary-700 text-white px-3.5 py-2 rounded-lg transition"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Quick Bar (Changed from md:hidden to xl:hidden) */}
        {user && !mobileMenuOpen && (
          <div className="xl:hidden flex gap-1 overflow-x-auto pb-2.5 pt-0.5 no-scrollbar -mx-1 px-1 border-t border-primary-800/40">
            {links.map(([href, label]) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                    active
                      ? 'bg-primary-700 text-white font-semibold shadow-sm'
                      : 'text-primary-200 hover:text-white bg-primary-950/40'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile Full Dropdown Menu (Changed from lg:hidden to xl:hidden) */}
        {user && mobileMenuOpen && (
          <div className="xl:hidden pt-2 pb-4 border-t border-primary-800 animate-fadeIn">
            {/* User Details in Mobile Drawer */}
            <div className="flex items-center justify-between p-3 mb-3 bg-primary-800/80 rounded-xl border border-primary-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-primary-200">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{user.fullName}</p>
                  <p className="text-[11px] text-primary-300">{user.email || user.role}</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary-700 text-gold-300">
                {user.role}
              </span>
            </div>

            {/* Nav Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {links.map(([href, label]) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-2.5 rounded-lg text-xs font-medium text-center transition ${
                      active
                        ? 'bg-primary-700 text-white font-semibold border border-primary-600'
                        : 'bg-primary-800/40 text-primary-100 hover:bg-primary-800'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Logout button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-900/40 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
