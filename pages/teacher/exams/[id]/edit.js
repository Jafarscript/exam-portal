import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Spinner from '@/components/Spinner';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { toLocalDatetimeLocal } from '@/lib/deadlineFormat';
import { AlertCircle, CheckCircle2, ArrowLeft, Save, BookOpen, GraduationCap } from 'lucide-react';

export default function EditExam() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { id } = router.query;
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(null); // null until the exam has loaded
  const [examStatus, setExamStatus] = useState('DRAFT');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const fieldRefs = {
    title: useRef(null),
    subjectId: useRef(null),
    classId: useRef(null),
    deadline: useRef(null),
    passMark: useRef(null),
    duration: useRef(null),
    questionsToShow: useRef(null),
  };

  useEffect(() => {
    if (!user || !id) return;
    apiFetch('/api/teacher/classes').then((d) => setClasses((d.classes || []).filter((c) => c.isActive)));
    apiFetch('/api/teacher/subjects').then((d) => setSubjects((d.subjects || []).filter((s) => s.isActive)));
    apiFetch(`/api/exams/${id}`).then((d) => {
      const exam = d.exam;
      setExamStatus(exam.status);
      setForm({
        title: exam.title || '',
        description: exam.description || '',
        subjectId: exam.subjectId?._id || exam.subjectId || '',
        classId: exam.classId?._id || exam.classId || '',
        isTimed: exam.isTimed !== false,
        duration: exam.duration || 30,
        deadline: toLocalDatetimeLocal(exam.deadline),
        passMark: exam.passMark ?? 50,
        randomizeQuestions: !!exam.randomizeQuestions,
        randomizeAnswers: !!exam.randomizeAnswers,
        questionsToShow: exam.questionsToShow ?? '',
        requiresLiveApproval: exam.requiresLiveApproval !== false,
      });
    }).catch((err) => {
      push('Failed to load exam details: ' + err.message, 'error');
    });
  }, [user, id, push]);

  const validateForm = (data) => {
    const newErrors = {};

    if (!data.title || !data.title.trim()) {
      newErrors.title = 'Exam title is required';
    } else if (data.title.trim().length < 2) {
      newErrors.title = 'Exam title must be at least 2 characters';
    }

    if (!data.subjectId) {
      newErrors.subjectId = 'Please select a subject';
    }

    if (!data.classId) {
      newErrors.classId = 'Please select a class / level';
    }

    if (!data.deadline) {
      newErrors.deadline = 'Please set an exam deadline date and time';
    } else {
      const deadlineDate = new Date(data.deadline);
      if (isNaN(deadlineDate.getTime())) {
        newErrors.deadline = 'Invalid date format';
      }
    }

    if (data.passMark === '' || data.passMark === null || data.passMark === undefined) {
      newErrors.passMark = 'Pass mark is required';
    } else {
      const mark = Number(data.passMark);
      if (isNaN(mark) || mark < 0 || mark > 100) {
        newErrors.passMark = 'Pass mark must be between 0% and 100%';
      }
    }

    if (data.isTimed) {
      if (!data.duration && data.duration !== 0) {
        newErrors.duration = 'Duration is required for timed exams';
      } else {
        const dur = Number(data.duration);
        if (isNaN(dur) || dur <= 0) {
          newErrors.duration = 'Duration must be at least 1 minute';
        } else if (dur > 1440) {
          newErrors.duration = 'Duration cannot exceed 24 hours (1440 min)';
        }
      }
    }

    if (data.questionsToShow !== '' && data.questionsToShow !== null && data.questionsToShow !== undefined) {
      const pool = Number(data.questionsToShow);
      if (isNaN(pool) || pool <= 0) {
        newErrors.questionsToShow = 'Questions per student must be a positive number';
      }
    }

    return newErrors;
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (attemptedSubmit || touched[field]) {
      const currentErrors = validateForm(updated);
      setErrors(currentErrors);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    const errorKeys = Object.keys(validationErrors);
    if (errorKeys.length > 0) {
      const firstErrorField = errorKeys[0];
      if (fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current.focus();
        fieldRefs[firstErrorField].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const labels = {
        title: 'Exam Title',
        subjectId: 'Subject',
        classId: 'Class / Level',
        deadline: 'Deadline',
        passMark: 'Pass Mark',
        duration: 'Duration',
        questionsToShow: 'Questions per student',
      };
      const missingList = errorKeys.map((k) => labels[k] || k).join(', ');
      push(`Please complete all required fields: ${missingList}`, 'error');
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/exams/${id}`, { method: 'PATCH', body: form });
      push('Exam updated successfully', 'success');
      router.push(`/teacher/exams/${id}`);
    } catch (err) {
      push(err.message || 'Failed to update exam', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !form) {
    return (
      <Layout>
        <Spinner label="Loading exam details…" />
      </Layout>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/teacher/exams/${id}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary-600 hover:text-primary-800 mb-4 py-1 px-2 rounded-lg hover:bg-primary-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to exam details
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800">Edit exam</h1>
          <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${
            examStatus === 'DRAFT' ? 'bg-ink/10 text-ink/60' : examStatus === 'PUBLISHED' ? 'bg-primary-100 text-primary-700' : 'bg-red-50 text-red-600'
          }`}>
            {examStatus}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-ink/60 mb-6">
          Update the settings, schedule, proctoring rules, or randomize options for this exam.
        </p>

        {attemptedSubmit && errorCount > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Please fix {errorCount} {errorCount === 1 ? 'issue' : 'issues'} before saving:
              </h3>
              <ul className="mt-1.5 list-disc list-inside text-xs text-red-700 space-y-0.5">
                {Object.entries(errors).map(([key, msg]) => (
                  <li key={key}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={submit} noValidate className="bg-white border border-primary-100 rounded-xl p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
          {/* 1. Basic Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900/70 border-b border-primary-50 pb-2">
              1. Basic Information
            </h2>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="edit-title" className="text-sm font-medium text-ink/80 flex items-center gap-1">
                  Exam Title <span className="text-red-500">*</span>
                </label>
                {touched.title && !errors.title && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid
                  </span>
                )}
              </div>
              <input
                id="edit-title"
                ref={fieldRefs.title}
                dir="auto"
                type="text"
                value={form.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`w-full mt-1.5 bidi-auto border rounded-lg px-3.5 py-2.5 text-ink text-sm sm:text-base transition focus:outline-none focus:ring-2 ${
                  errors.title
                    ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                    : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                }`}
              />
              {errors.title && (
                <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="edit-description" className="text-sm font-medium text-ink/80">
                Description / Instructions <span className="text-xs text-ink/40 font-normal">(Optional)</span>
              </label>
              <textarea
                id="edit-description"
                dir="auto"
                rows={3}
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full mt-1.5 bidi-auto border border-primary-200 rounded-lg px-3.5 py-2.5 text-ink text-sm transition focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-subject" className="text-sm font-medium text-ink/80">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-subject"
                  ref={fieldRefs.subjectId}
                  value={form.subjectId}
                  onChange={(e) => handleFieldChange('subjectId', e.target.value)}
                  className={`w-full mt-1.5 border rounded-lg px-3.5 py-2.5 text-ink text-sm transition focus:outline-none focus:ring-2 bg-white ${
                    errors.subjectId
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                      : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                >
                  <option value="">-- Select a subject --</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                {errors.subjectId && (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.subjectId}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="edit-class" className="text-sm font-medium text-ink/80">
                  Class / Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-class"
                  ref={fieldRefs.classId}
                  value={form.classId}
                  onChange={(e) => handleFieldChange('classId', e.target.value)}
                  className={`w-full mt-1.5 border rounded-lg px-3.5 py-2.5 text-ink text-sm transition focus:outline-none focus:ring-2 bg-white ${
                    errors.classId
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                      : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                >
                  <option value="">-- Select target class --</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {errors.classId && (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.classId}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Timing & Parameters */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900/70 border-b border-primary-50 pb-2">
              2. Timing & Grading Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-deadline" className="text-sm font-medium text-ink/80">
                  Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-deadline"
                  ref={fieldRefs.deadline}
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => handleFieldChange('deadline', e.target.value)}
                  className={`w-full mt-1.5 border rounded-lg px-3.5 py-2 text-ink text-sm transition focus:outline-none focus:ring-2 ${
                    errors.deadline
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                      : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                />
                {errors.deadline ? (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.deadline}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink/40 mt-1">Your local timezone</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-passmark" className="text-sm font-medium text-ink/80">
                  Pass mark (%) <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-passmark"
                  ref={fieldRefs.passMark}
                  type="number"
                  min={0}
                  max={100}
                  value={form.passMark}
                  onChange={(e) => handleFieldChange('passMark', e.target.value)}
                  className={`w-full mt-1.5 border rounded-lg px-3.5 py-2 text-ink text-sm transition focus:outline-none focus:ring-2 ${
                    errors.passMark
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                      : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                />
                {errors.passMark && (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.passMark}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="edit-duration" className="text-sm font-medium text-ink/80">
                  Duration (mins) {form.isTimed && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="edit-duration"
                  ref={fieldRefs.duration}
                  type="number"
                  min={1}
                  max={1440}
                  disabled={!form.isTimed}
                  value={form.duration}
                  onChange={(e) => handleFieldChange('duration', e.target.value)}
                  className={`w-full mt-1.5 border rounded-lg px-3.5 py-2 text-ink text-sm transition focus:outline-none focus:ring-2 disabled:bg-ink/5 disabled:text-ink/40 ${
                    errors.duration
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                      : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                  }`}
                />
                {errors.duration && (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.duration}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <label htmlFor="edit-questions-to-show" className="text-sm font-medium text-ink/80 flex items-center gap-1">
                <span>Questions per student</span>
                <span className="text-xs text-ink/40 font-normal">(Optional random bank draw)</span>
              </label>
              <input
                id="edit-questions-to-show"
                ref={fieldRefs.questionsToShow}
                type="number"
                min={1}
                placeholder="Leave blank to show all questions in the bank"
                value={form.questionsToShow}
                onChange={(e) => handleFieldChange('questionsToShow', e.target.value)}
                className={`w-full sm:max-w-md mt-1.5 border rounded-lg px-3.5 py-2 text-ink text-sm transition focus:outline-none focus:ring-2 ${
                  errors.questionsToShow
                    ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100'
                    : 'border-primary-200 focus:border-primary-500 focus:ring-primary-100'
                }`}
              />
              {errors.questionsToShow ? (
                <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.questionsToShow}
                </p>
              ) : (
                <p className="text-xs text-ink/50 mt-1">
                  Leave blank to show all questions, or set a number (e.g. 20) to randomly assign a subset to each student.
                </p>
              )}
            </div>
          </div>

          {/* 3. Security & Proctoring Options */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900/70 border-b border-primary-50 pb-2">
              3. Security & Proctoring Options
            </h2>

            <div className="p-4 bg-primary-50/60 rounded-xl border border-primary-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresLiveApproval}
                  onChange={(e) => handleFieldChange('requiresLiveApproval', e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-primary-600 rounded"
                />
                <div>
                  <span className="text-sm font-semibold text-primary-900">
                    Require Live Teacher Admittance & Screen-Share Verification
                  </span>
                  <p className="text-xs text-ink/60 mt-1">
                    When enabled, students entering the exam will be held in a live waiting room until you verify their screen share.
                  </p>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-primary-100 hover:bg-primary-50/40 cursor-pointer text-sm text-ink/80 transition">
                <input
                  type="checkbox"
                  checked={form.isTimed}
                  onChange={(e) => handleFieldChange('isTimed', e.target.checked)}
                  className="w-4 h-4 accent-primary-600 rounded"
                />
                <span className="font-medium">Timed exam</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-primary-100 hover:bg-primary-50/40 cursor-pointer text-sm text-ink/80 transition">
                <input
                  type="checkbox"
                  checked={form.randomizeQuestions}
                  onChange={(e) => handleFieldChange('randomizeQuestions', e.target.checked)}
                  className="w-4 h-4 accent-primary-600 rounded"
                />
                <span className="font-medium">Randomize question order</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-primary-100 hover:bg-primary-50/40 cursor-pointer text-sm text-ink/80 transition">
                <input
                  type="checkbox"
                  checked={form.randomizeAnswers}
                  onChange={(e) => handleFieldChange('randomizeAnswers', e.target.checked)}
                  className="w-4 h-4 accent-primary-600 rounded"
                />
                <span className="font-medium">Randomize choices</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-primary-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <Link
              href={`/teacher/exams/${id}`}
              className="w-full sm:w-auto text-center px-4 py-2.5 rounded-lg border border-primary-200 text-sm font-medium text-ink/70 hover:bg-primary-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Saving changes…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
