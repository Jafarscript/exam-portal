import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { GraduationCap, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TeacherClasses() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [classes, setClasses] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => apiFetch('/api/teacher/classes').then((d) => setClasses(d.classes));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Class name is required');
      push('Please enter a class name', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/teacher/classes', { method: 'POST', body: { name: name.trim(), description: description.trim() } });
      setName('');
      setDescription('');
      push('Class created successfully', 'success');
      load();
    } catch (err) {
      setError(err.message);
      push(err.message || 'Failed to create class', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cls) => {
    try {
      await apiFetch(`/api/teacher/classes/${cls._id}`, { method: 'PATCH', body: { isActive: !cls.isActive } });
      push(`Class ${cls.isActive ? 'deactivated' : 'reactivated'}`, 'info');
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
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">Classes & Levels</h1>
            <p className="text-xs sm:text-sm text-ink/60">Organize students and assign exams to specific grade levels or groups.</p>
          </div>
        </div>

        {/* Add Class Form */}
        <form onSubmit={add} className="bg-white border border-primary-100 rounded-xl p-4 sm:p-6 mb-8 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-primary-900 border-b border-primary-50 pb-2 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary-600" /> Create a new class or level
          </h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="class-name-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Class Name <span className="text-red-500">*</span>
              </label>
              <input
                id="class-name-input"
                required
                placeholder="e.g. Grade 4 / Beginner Tajweed"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                className="w-full mt-1 border border-primary-200 rounded-lg px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="class-desc-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Description <span className="text-xs text-ink/40">(optional)</span>
              </label>
              <input
                id="class-desc-input"
                placeholder="e.g. Weekend morning cohort"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mt-1 border border-primary-200 rounded-lg px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm shadow-sm transition"
            >
              {saving ? 'Creating…' : 'Add class'}
            </button>
          </div>
        </form>

        {/* Classes List */}
        {classes === null && <Spinner label="Loading classes…" />}
        {classes && (
          <div className="bg-white border border-primary-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-primary-50/50 border-b border-primary-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary-900">Configured Classes ({classes.length})</h3>
            </div>
            {classes.length === 0 ? (
              <div className="p-8 text-center text-ink/50 text-sm">
                No classes created yet. Add your first class using the form above.
              </div>
            ) : (
              <div className="divide-y divide-primary-50">
                {classes.map((c) => (
                  <div key={c._id} className="p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-primary-50/30 transition">
                    <div>
                      <p className={`font-medium text-sm sm:text-base ${c.isActive ? 'text-ink' : 'text-ink/40 line-through'}`}>
                        {c.name}
                      </p>
                      {c.description && <p className="text-xs text-ink/50 mt-0.5">{c.description}</p>}
                    </div>
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                        c.isActive
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {c.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
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
