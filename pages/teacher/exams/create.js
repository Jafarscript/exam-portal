import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useRequireRole } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiFetch } from '@/lib/apiClient';
import { AlertCircle, CheckCircle2, ArrowRight, BookOpen, GraduationCap, Clock, HelpCircle } from 'lucide-react';

export default function CreateExam() {
  const user = useRequireRole(['TEACHER']);
  const router = useRouter();
  const { push } = useToast();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingPrereqs, setLoadingPrereqs] = useState(true);

  const [form, setForm] = useState({
    title: '',
    description: '',
    subjectId: '',
    classId: '',
    isTimed: true,
    duration: 30,
    deadline: '',
    passMark: 50,
    randomizeQuestions: false,
    randomizeAnswers: false,
    questionsToShow: '',
    requiresLiveApproval: true,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Field refs for auto-focusing on first error
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
    if (user) {
      setLoadingPrereqs(true);
      Promise.all([
        apiFetch('/api/teacher/classes'),
        apiFetch('/api/teacher/subjects'),
      ])
        .then(([classesData, subjectsData]) => {
          setClasses((classesData.classes || []).filter((c) => c.isActive));
          setSubjects((subjectsData.subjects || []).filter((s) => s.isActive));
        })
        .catch((err) => {
          push('Failed to load classes or subjects: ' + err.message, 'error');
        })
        .finally(() => {
          setLoadingPrereqs(false);
        });
    }
  }, [user, push]);

  // Validation engine
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

    // Re-validate field on the fly if user already attempted submit or touched it
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
      // Focus the first invalid field
      const firstErrorField = errorKeys[0];
      if (fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current.focus();
        fieldRefs[firstErrorField].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Build a friendly message of missing items
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
      const { exam } = await apiFetch('/api/exams', { method: 'POST', body: form });
      push('Exam created as draft! You can now add questions.', 'success');
      router.push(`/teacher/exams/${exam._id}`);
    } catch (err) {
      push(err.message || 'Failed to create exam', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const hasMissingPrereqs = !loadingPrereqs && (subjects.length === 0 || classes.length === 0);
  const errorCount = Object.keys(errors).length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header Breadcrumb & Title */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-primary-600 font-medium mb-2">
          <Link href="/teacher/exams" className="hover:underline">Exams</Link>
          <span>/</span>
          <span className="text-ink/60">New</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-primary-800 mb-2">Create new exam</h1>
        <p className="text-xs sm:text-sm text-ink/60 mb-6">
          Set up the exam parameters. You can add, edit, or import questions right after creating this draft.
        </p>

        {/* Prerequisites Warnings if subjects or classes are missing */}
        {hasMissingPrereqs && (
          <div className="mb-6 p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900 mb-1">Prerequisites needed before creating an exam</h3>
                <p className="text-xs text-amber-700 mb-3">
                  You need at least one active subject and one class / level to assign this exam to.
                </p>
                <div className="flex flex-wrap gap-3">
                  {subjects.length === 0 && (
                    <Link
                      href="/teacher/subjects"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> + Create Subject
                    </Link>
                  )}
                  {classes.length === 0 && (
                    <Link
                      href="/teacher/classes"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      <GraduationCap className="w-3.5 h-3.5" /> + Create Class
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Validation Error Banner */}
        {attemptedSubmit && errorCount > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Please fix {errorCount} {errorCount === 1 ? 'issue' : 'issues'} before creating the exam draft:
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
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900/70 border-b border-primary-50 pb-2">
              1. Basic Information
            </h2>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="exam-title" className="text-sm font-medium text-ink/80 flex items-center gap-1">
                  Exam Title <span className="text-red-500">*</span>
                </label>
                {touched.title && !errors.title && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid
                  </span>
                )}
              </div>
              <input
                id="exam-title"
                ref={fieldRefs.title}
                dir="auto"
                type="text"
                placeholder="e.g. Mid-Term Islamic Studies Exam — Term 1"
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

            {/* Description / Instructions */}
            <div>
              <label htmlFor="exam-description" className="text-sm font-medium text-ink/80 flex items-center justify-between">
                <span>Description / Instructions <span className="text-xs text-ink/40 font-normal">(Optional)</span></span>
              </label>
              <textarea
                id="exam-description"
                dir="auto"
                rows={3}
                placeholder="Provide test instructions for students (e.g. Read each question carefully, no books allowed)..."
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full mt-1.5 bidi-auto border border-primary-200 rounded-lg px-3.5 py-2.5 text-ink text-sm transition focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-100"
              />
            </div>

            {/* Subject & Class Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="exam-subject" className="text-sm font-medium text-ink/80">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  {touched.subjectId && !errors.subjectId && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  )}
                </div>
                <select
                  id="exam-subject"
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
                {errors.subjectId ? (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.subjectId}
                  </p>
                ) : subjects.length === 0 && !loadingPrereqs ? (
                  <p className="text-xs text-amber-600 mt-1">No subjects created yet.</p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="exam-class" className="text-sm font-medium text-ink/80">
                    Class / Level <span className="text-red-500">*</span>
                  </label>
                  {touched.classId && !errors.classId && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  )}
                </div>
                <select
                  id="exam-class"
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
                {errors.classId ? (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.classId}
                  </p>
                ) : classes.length === 0 && !loadingPrereqs ? (
                  <p className="text-xs text-amber-600 mt-1">No classes created yet.</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Section: Timing & Grading Parameters */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900/70 border-b border-primary-50 pb-2">
              2. Timing & Grading Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Deadline */}
              <div>
                <label htmlFor="exam-deadline" className="text-sm font-medium text-ink/80">
                  Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  id="exam-deadline"
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

              {/* Pass Mark */}
              <div>
                <label htmlFor="exam-passmark" className="text-sm font-medium text-ink/80">
                  Pass mark (%) <span className="text-red-500">*</span>
                </label>
                <input
                  id="exam-passmark"
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
                {errors.passMark ? (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.passMark}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink/40 mt-1">Percentage required to pass</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="exam-duration" className="text-sm font-medium text-ink/80">
                  Duration (mins) {form.isTimed && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="exam-duration"
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
                {errors.duration ? (
                  <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errors.duration}
                  </p>
                ) : (
                  <p className="text-[11px] text-ink/40 mt-1">{form.isTimed ? 'Total timer per attempt' : 'Untimed exam'}</p>
                )}
              </div>
            </div>

            {/* Questions to show / Question pool */}
            <div className="pt-2">
              <label htmlFor="exam-questions-to-show" className="text-sm font-medium text-ink/80 flex items-center gap-1">
                <span>Questions per student</span>
                <span className="text-xs text-ink/40 font-normal">(Optional random bank draw)</span>
              </label>
              <input
                id="exam-questions-to-show"
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
                  Example: Create a bank of 40 questions and enter 20 here. Each student will receive a unique random set of 20 questions.
                </p>
              )}
            </div>
          </div>

          {/* Section: Proctoring & Randomization Options */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900/70 border-b border-primary-50 pb-2">
              3. Security & Proctoring Options
            </h2>

            {/* Screen Share Admittance Gate */}
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
                    When enabled, students entering the exam will be held in a secure waiting room until you verify their screen share on your video call and click "Admit".
                  </p>
                </div>
              </label>
            </div>

            {/* Checkboxes: Timed, Randomize Questions, Randomize Answers */}
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
          <div className="pt-4 border-t border-primary-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-ink/50">
              * Required fields must be completed to save the draft.
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/teacher/exams"
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
                    <span>Creating draft…</span>
                  </>
                ) : (
                  <>
                    <span>Create draft</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
