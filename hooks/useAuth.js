import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    if (data.token && typeof window !== 'undefined') {
      try {
        localStorage.setItem('exam_portal_token', data.token);
      } catch {
        // ignore
      }
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('exam_portal_token');
      } catch {
        // ignore
      }
    }
    setUser(null);
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, refresh, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Redirects to /login if not authenticated, or to the person's own dashboard
// if their role doesn't match. Renders nothing while the auth check is in
// flight so protected pages never flash their content to a logged-out user.
export function useRequireRole(allowedRoles) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(`/${user.role.toLowerCase()}`);
    }
  }, [user, allowedRoles, router]);

  return user;
}
