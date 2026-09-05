import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { Users, Plus, AlertCircle, Trash2, UserPlus, GraduationCap, Award } from 'lucide-react';
import Link from 'next/link';

export default function TeacherStudents() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [students, setStudents] = useState(null);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [form, setForm] = useState({ fullName: '', classId: '', parentId: '', createAccount: false, email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const load = () => apiFetch('/api/teacher/students').then((d) => setStudents(d.students));

  useEffect(() => {
    if (user) {
      load();
      apiFetch('/api/teacher/classes').then((d) => setClasses((d.classes || []).filter((c) => c.isActive)));
      apiFetch('/api/teacher/parents').then((d) => setParents(d.parents || []));
    }
  }, [user]);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) {
      errs.fullName = 'Full name is required';
    } else if (form.fullName.trim().length < 2) {
      errs.fullName = 'Name must be at least 2 characters';
    }

    if (form.createAccount) {
      if (!form.email.trim()) {
        errs.email = 'Email is required for independent account login';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errs.email = 'Please enter a valid email address';
      }

      if (!form.password) {
        errs.password = 'Password is required';
      } else if (form.password.length < 8) {
        errs.password = 'Password must be at least 8 characters';
      }
    }

    return errs;
  };

  const addStudent = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      push(Object.values(validationErrors)[0], 'error');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/teacher/students', { method: 'POST', body: form });
      setForm({ fullName: '', classId: '', parentId: '', createAccount: false, email: '', password: '' });
      setErrors({});
      push('Student registered successfully', 'success');
      load();
    } catch (err) {
      push(err.message || 'Failed to add student', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveClass = async (studentId, classId) => {
    try {
      await apiFetch(`/api/teacher/students/${studentId}`, { method: 'PATCH', body: { classId } });
      push('Student class assignment updated', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const saveParent = async (studentId, parentId) => {
    try {
      await apiFetch(`/api/teacher/students/${studentId}`, {
        method: 'PATCH',
        body: { parentId: parentId || null },
      });
      push('Student parent matching updated', 'success');
      load();
    } catch (err) {
      push(err.message || 'Failed to update parent matching', 'error');
    }
  };

  const remove = async (studentId, studentName) => {
    if (!confirm(`Are you sure you want to remove student "${studentName}"?`)) return;
    try {
      await apiFetch(`/api/teacher/students/${studentId}`, { method: 'DELETE' });
      push('Student removed', 'success');
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">Students</h1>
            <p className="text-xs sm:text-sm text-ink/60">Enroll students, assign them to classes, or issue independent student credentials.</p>
          </div>
        </div>

        {/* Add Student Form */}
        <form onSubmit={addStudent} noValidate className="bg-white border border-primary-100 rounded-xl p-4 sm:p-6 mb-8 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-primary-900 border-b border-primary-50 pb-2 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary-600" /> Enroll a new student
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="student-name-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="student-name-input"
                required
                placeholder="e.g. Zaid Ali"
                value={form.fullName}
                onChange={(e) => {
                  setForm({ ...form, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: null });
                }}
                className={`w-full mt-1 border rounded-lg px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 ${
                  errors.fullName ? 'border-red-400 bg-red-50/20 focus:ring-red-100' : 'border-primary-200 focus:ring-primary-500'
                }`}
              />
              {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="student-class-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Assign Class / Level
              </label>
              <select
                id="student-class-input"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                className="w-full mt-1 border border-primary-200 rounded-lg px-3.5 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No class yet (unassigned)</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="student-parent-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Match to Parent (Optional)
              </label>
              <select
                id="student-parent-input"
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full mt-1 border border-primary-200 rounded-lg px-3.5 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No parent assigned (Unlinked)</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.fullName} ({p.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3.5 bg-primary-50/50 rounded-xl border border-primary-100">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm text-ink/80">
              <input
                type="checkbox"
                checked={form.createAccount}
                onChange={(e) => setForm({ ...form, createAccount: e.target.checked })}
                className="w-4 h-4 mt-0.5 accent-primary-600 rounded"
              />
              <div>
                <span className="font-semibold text-primary-900">Create login credentials for this student</span>
                <p className="text-xs text-ink/50 mt-0.5">Allows older students to log into their own portal directly without parent mediation.</p>
              </div>
            </label>

            {form.createAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-primary-100 animate-fadeIn">
                <div>
                  <label className="text-xs font-medium text-ink/70">Login Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    className={`w-full mt-1 border rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 ${
                      errors.email ? 'border-red-400 bg-red-50/20' : 'border-primary-200 focus:ring-primary-500'
                    }`}
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-ink/70">Password (min 8 chars) <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    className={`w-full mt-1 border rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 ${
                      errors.password ? 'border-red-400 bg-red-50/20' : 'border-primary-200 focus:ring-primary-500'
                    }`}
                  />
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm shadow-sm transition"
            >
              {saving ? 'Adding…' : 'Enroll student'}
            </button>
          </div>
        </form>

        {/* Students List */}
        {students === null && <Spinner label="Loading students…" />}
        {students && (
          <div className="bg-white border border-primary-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-primary-50/50 border-b border-primary-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary-900">Enrolled Students ({students.length})</h3>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center text-ink/50 text-sm">
                No students enrolled yet. Add your first student using the form above.
              </div>
            ) : (
              <div className="divide-y divide-primary-50">
                {students.map((s) => (
                  <div key={s._id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-primary-50/30 transition">
                    <div>
                      <p className="font-semibold text-sm sm:text-base text-ink">{s.fullName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          s.isIndependent ? 'bg-primary-100 text-primary-800' : 'bg-gold-500/10 text-gold-700'
                        }`}>
                          {s.isIndependent ? 'Independent Account' : 'Parent Managed'}
                        </span>
                        {s.userId?.email && (
                          <span className="text-xs text-primary-700 font-mono">({s.userId.email})</span>
                        )}
                        {s.parentId ? (
                          <span className="text-xs text-ink/60 font-medium">
                            Parent: <strong className="text-ink/80">{s.parentId.fullName || s.parentId.email}</strong>
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700/70 italic">No parent linked</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
                      {/* Parent Selector */}
                      <div className="flex items-center gap-1.5" title="Match or change parent">
                        <Users className="w-4 h-4 text-ink/40" />
                        <select
                          value={s.parentId?._id || s.parentId || ''}
                          onChange={(e) => saveParent(s._id, e.target.value)}
                          className="border border-primary-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 max-w-[190px]"
                        >
                          <option value="">No parent linked</option>
                          {parents.map((p) => (
                            <option key={p._id} value={p._id}>
                              Parent: {p.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Class Selector */}
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-ink/40" />
                        <select
                          defaultValue={s.classId?._id || s.classId || ''}
                          onChange={(e) => saveClass(s._id, e.target.value)}
                          className="border border-primary-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">No class assigned</option>
                          {classes.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Report Card Button */}
                      <Link
                        href={`/teacher/report-cards`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200 text-xs font-semibold transition"
                        title="View academic report card"
                      >
                        <Award className="w-3.5 h-3.5 text-primary-600" />
                        <span>Report Card</span>
                      </Link>

                      {/* Remove Button */}
                      <button
                        onClick={() => remove(s._id, s.fullName)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Remove student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
