import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { BookOpen, Plus, AlertCircle } from 'lucide-react';

export default function TeacherSubjects() {
  const user = useRequireRole(['TEACHER']);
  const { push } = useToast();
  const [subjects, setSubjects] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => apiFetch('/api/teacher/subjects').then((d) => setSubjects(d.subjects));
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line

  const add = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Subject name is required');
      push('Please enter a subject name', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/teacher/subjects', { method: 'POST', body: { name: name.trim(), description: description.trim() } });
      setName('');
      setDescription('');
      push('Subject created successfully', 'success');
      load();
    } catch (err) {
      setError(err.message);
      push(err.message || 'Failed to create subject', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (subject) => {
    try {
      await apiFetch(`/api/teacher/subjects/${subject._id}`, { method: 'PATCH', body: { isActive: !subject.isActive } });
      push(`Subject ${subject.isActive ? 'deactivated' : 'reactivated'}`, 'info');
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
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">Subjects</h1>
            <p className="text-xs sm:text-sm text-ink/60">Create and manage curriculum subjects with full Arabic and English support.</p>
          </div>
        </div>

        {/* Add Subject Form */}
        <form onSubmit={add} className="bg-white border border-primary-100 rounded-xl p-4 sm:p-6 mb-8 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-primary-900 border-b border-primary-50 pb-2 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary-600" /> Create a new subject
          </h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject-name-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                id="subject-name-input"
                required
                dir="auto"
                placeholder="e.g. Hadith الحديث or Quranic Arabic"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                className="w-full mt-1 bidi-auto border border-primary-200 rounded-lg px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="subject-desc-input" className="text-xs sm:text-sm font-medium text-ink/70">
                Description <span className="text-xs text-ink/40">(optional)</span>
              </label>
              <input
                id="subject-desc-input"
                placeholder="e.g. Core Islamic Studies curriculum"
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
              {saving ? 'Creating…' : 'Add subject'}
            </button>
          </div>
        </form>

        {/* Subjects List */}
        {subjects === null && <Spinner label="Loading subjects…" />}
        {subjects && (
          <div className="bg-white border border-primary-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-primary-50/50 border-b border-primary-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-primary-900">Configured Subjects ({subjects.length})</h3>
            </div>
            {subjects.length === 0 ? (
              <div className="p-8 text-center text-ink/50 text-sm">
                No subjects created yet. Add your first subject using the form above.
              </div>
            ) : (
              <div className="divide-y divide-primary-50">
                {subjects.map((s) => (
                  <div key={s._id} className="p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-primary-50/30 transition">
                    <div>
                      <p dir="auto" className={`font-medium text-sm sm:text-base bidi-auto ${s.isActive ? 'text-ink' : 'text-ink/40 line-through'}`}>
                        {s.name}
                      </p>
                      {s.description && <p className="text-xs text-ink/50 mt-0.5">{s.description}</p>}
                    </div>
                    <button
                      onClick={() => toggleActive(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                        s.isActive
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {s.isActive ? 'Deactivate' : 'Reactivate'}
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
