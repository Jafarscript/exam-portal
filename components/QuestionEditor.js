import { useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/hooks/useToast';
import { AlertCircle, Image as ImageIcon, Music, Plus, Trash2, CheckCircle2 } from 'lucide-react';

const TYPE_LABELS = {
  MCQ: 'Multiple choice',
  MULTI_SELECT: 'Multiple select (checkboxes)',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer (manual grading)',
  ESSAY: 'Essay (manual grading)',
  FILL_BLANK: 'Fill in the blank (auto-graded)',
};

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const blankOption = () => ({ id: Math.random().toString(36).slice(2, 8), text: '', textDirection: 'AUTO' });

function stateFromQuestion(q) {
  const base = {
    type: q.type,
    text: q.text,
    textDirection: q.textDirection || 'AUTO',
    marks: q.marks,
    options: q.options?.length ? q.options : [blankOption(), blankOption()],
    correctOptionId: '',
    correctOptionIds: [],
    trueFalseAnswer: 'true',
    fillAnswer: '',
    imageUrl: q.imageUrl || null,
    audioUrl: q.audioUrl || null,
  };
  if (q.type === 'MCQ') base.correctOptionId = q.correctAnswer || '';
  if (q.type === 'MULTI_SELECT') base.correctOptionIds = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
  if (q.type === 'TRUE_FALSE') base.trueFalseAnswer = q.correctAnswer || 'true';
  if (q.type === 'FILL_BLANK') {
    base.fillAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' | ') : q.correctAnswer || '';
  }
  return base;
}

export default function QuestionEditor({ examId, existingQuestion, onCreated, onSaved, onCancel }) {
  const { push } = useToast();
  const isEditing = !!existingQuestion;
  const initial = isEditing ? stateFromQuestion(existingQuestion) : null;

  const [type, setType] = useState(initial?.type || 'MCQ');
  const [text, setText] = useState(initial?.text || '');
  const [textDirection, setTextDirection] = useState(initial?.textDirection || 'AUTO');
  const [marks, setMarks] = useState(initial?.marks ?? 1);
  const [options, setOptions] = useState(initial?.options || [blankOption(), blankOption()]);
  const [correctOptionId, setCorrectOptionId] = useState(initial?.correctOptionId || '');
  const [correctOptionIds, setCorrectOptionIds] = useState(initial?.correctOptionIds || []);
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(initial?.trueFalseAnswer || 'true');
  const [fillAnswer, setFillAnswer] = useState(initial?.fillAnswer || '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || null);
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  const reset = () => {
    setText('');
    setMarks(1);
    setOptions([blankOption(), blankOption()]);
    setCorrectOptionId('');
    setCorrectOptionIds([]);
    setFillAnswer('');
    setImageUrl(null);
    setAudioUrl(null);
    setErrors({});
    setAttempted(false);
  };

  const handleUpload = async (e, kind) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUri = await fileToDataUri(file);
      const { url } = await apiFetch('/api/upload', { method: 'POST', body: { dataUri } });
      if (kind === 'image') setImageUrl(url);
      else setAudioUrl(url);
      push('File uploaded successfully', 'success');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!text.trim()) {
      errs.text = 'Question text is required';
    }

    const numMarks = Number(marks);
    if (isNaN(numMarks) || numMarks < 0) {
      errs.marks = 'Marks must be 0 or more';
    }

    if (type === 'MCQ') {
      if (!correctOptionId) {
        errs.correctAnswer = 'Please mark the correct option';
      }
      if (options.some((o) => !o.text.trim())) {
        errs.options = 'All options must have text';
      }
    } else if (type === 'MULTI_SELECT') {
      if (correctOptionIds.length === 0) {
        errs.correctAnswer = 'Please select at least one correct option';
      }
      if (options.some((o) => !o.text.trim())) {
        errs.options = 'All options must have text';
      }
    } else if (type === 'FILL_BLANK') {
      if (!fillAnswer.trim()) {
        errs.fillAnswer = 'Please provide the correct accepted answer(s)';
      }
    }

    return errs;
  };

  const submit = async () => {
    setAttempted(true);
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      push(Object.values(errs)[0], 'error');
      return;
    }

    let correctAnswer = null;
    if (type === 'MCQ') {
      correctAnswer = correctOptionId;
    } else if (type === 'MULTI_SELECT') {
      correctAnswer = correctOptionIds;
    } else if (type === 'TRUE_FALSE') {
      correctAnswer = trueFalseAnswer;
    } else if (type === 'FILL_BLANK') {
      correctAnswer = fillAnswer.split('|').map((s) => s.trim()).filter(Boolean);
    }

    const payload = {
      type,
      text,
      textDirection,
      marks: Number(marks),
      options: ['MCQ', 'MULTI_SELECT'].includes(type) ? options : [],
      correctAnswer,
      imageUrl,
      audioUrl,
    };

    setSaving(true);
    try {
      if (isEditing) {
        const { question } = await apiFetch(`/api/questions/${existingQuestion._id}`, { method: 'PATCH', body: payload });
        push('Question updated successfully', 'success');
        onSaved?.(question);
      } else {
        const { question } = await apiFetch(`/api/exams/${examId}/questions`, { method: 'POST', body: payload });
        push('Question added successfully', 'success');
        reset();
        onCreated?.(question);
      }
    } catch (err) {
      push(err.message || 'Failed to save question', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-primary-100 rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-primary-50 pb-3">
        <h3 className="font-display font-semibold text-lg text-primary-900">
          {isEditing ? 'Edit Question' : 'Add a Question to Bank'}
        </h3>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-ink/60 hover:text-ink px-2.5 py-1 rounded-md hover:bg-primary-50 transition"
          >
            Cancel
          </button>
        )}
      </div>

      {attempted && Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Please resolve the following before saving:</p>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {Object.values(errors).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Type & Marks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs sm:text-sm font-medium text-ink/70">Question type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setErrors({});
            }}
            className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs sm:text-sm font-medium text-ink/70">Marks allocated</label>
          <input
            type="number"
            min={0}
            value={marks}
            onChange={(e) => {
              setMarks(e.target.value);
              if (errors.marks) setErrors((prev) => ({ ...prev, marks: null }));
            }}
            className={`w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.marks ? 'border-red-400 bg-red-50/20' : 'border-primary-200 focus:ring-primary-500'
            }`}
          />
          {errors.marks && <p className="text-xs text-red-600 mt-1">{errors.marks}</p>}
        </div>
      </div>

      {/* Question Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs sm:text-sm font-medium text-ink/70">Question text <span className="text-red-500">*</span></label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink/40">Direction:</span>
            {['AUTO', 'RTL', 'LTR'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTextDirection(d)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                  textDirection === d
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-ink/60 border-primary-200 hover:bg-primary-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <textarea
          dir="auto"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (errors.text) setErrors((prev) => ({ ...prev, text: null }));
          }}
          className={`w-full bidi-auto border rounded-lg px-3.5 py-2.5 text-ink text-sm sm:text-base focus:outline-none focus:ring-2 ${
            errors.text ? 'border-red-400 bg-red-50/20 focus:ring-red-100' : 'border-primary-200 focus:ring-primary-500'
          }`}
          placeholder="Type question prompt (Arabic, English, or mixed supported with full auto-bidi formatting)..."
        />
        {errors.text && <p className="text-xs text-red-600 mt-1">{errors.text}</p>}
      </div>

      {/* Attachments: Image / Audio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-primary-50/40 rounded-xl border border-primary-100">
        <div>
          <label className="text-xs font-semibold text-primary-900 flex items-center gap-1.5 mb-1">
            <ImageIcon className="w-3.5 h-3.5 text-primary-600" /> Image attachment (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleUpload(e, 'image')}
            className="w-full text-xs text-ink/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"
          />
          {imageUrl && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Image attached
              </span>
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-primary-900 flex items-center gap-1.5 mb-1">
            <Music className="w-3.5 h-3.5 text-primary-600" /> Audio recitation / prompt (optional)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleUpload(e, 'audio')}
            className="w-full text-xs text-ink/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"
          />
          {audioUrl && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Audio attached
              </span>
              <button
                type="button"
                onClick={() => setAudioUrl(null)}
                className="text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options for MCQ / MULTI_SELECT */}
      {['MCQ', 'MULTI_SELECT'].includes(type) && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-ink/80">
              Options — {type === 'MCQ' ? 'select the single correct radio option' : 'check all correct answers'}{' '}
              <span className="text-red-500">*</span>
            </label>
          </div>

          {errors.correctAnswer && (
            <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.correctAnswer}
            </p>
          )}

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div
                key={opt.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition ${
                  (type === 'MCQ' && correctOptionId === opt.id) ||
                  (type === 'MULTI_SELECT' && correctOptionIds.includes(opt.id))
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-primary-100 bg-white'
                }`}
              >
                {type === 'MCQ' ? (
                  <input
                    type="radio"
                    name="mcq-correct-choice"
                    checked={correctOptionId === opt.id}
                    onChange={() => {
                      setCorrectOptionId(opt.id);
                      if (errors.correctAnswer) setErrors((prev) => ({ ...prev, correctAnswer: null }));
                    }}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={correctOptionIds.includes(opt.id)}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...correctOptionIds, opt.id]
                        : correctOptionIds.filter((id) => id !== opt.id);
                      setCorrectOptionIds(newIds);
                      if (errors.correctAnswer) setErrors((prev) => ({ ...prev, correctAnswer: null }));
                    }}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                )}

                <input
                  dir="auto"
                  value={opt.text}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, text: newText } : o)));
                    if (errors.options) setErrors((prev) => ({ ...prev, options: null }));
                  }}
                  placeholder={`Choice option ${i + 1} text`}
                  className="flex-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />

                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
                      if (correctOptionId === opt.id) setCorrectOptionId('');
                      setCorrectOptionIds((prev) => prev.filter((id) => id !== opt.id));
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                    title="Delete option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {errors.options && <p className="text-xs text-red-600">{errors.options}</p>}

          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, blankOption()])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 py-1.5 px-3 rounded-lg border border-dashed border-primary-300 hover:bg-primary-50 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add another choice
          </button>
        </div>
      )}

      {/* True / False */}
      {type === 'TRUE_FALSE' && (
        <div className="pt-2">
          <label className="text-xs sm:text-sm font-medium text-ink/80 block mb-2">
            Correct Answer
          </label>
          <div className="flex gap-3">
            {['true', 'false'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTrueFalseAnswer(v)}
                className={`flex-1 py-2.5 rounded-lg border font-semibold text-sm capitalize transition ${
                  trueFalseAnswer === v
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-primary-200 text-ink/70 hover:bg-primary-50'
                }`}
              >
                {v === 'true' ? '✓ True' : '✗ False'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fill in the blank */}
      {type === 'FILL_BLANK' && (
        <div className="pt-2">
          <label className="text-xs sm:text-sm font-medium text-ink/80 block mb-1">
            Accepted Answer(s) <span className="text-red-500">*</span>
          </label>
          <input
            dir="auto"
            value={fillAnswer}
            onChange={(e) => {
              setFillAnswer(e.target.value);
              if (errors.fillAnswer) setErrors((prev) => ({ ...prev, fillAnswer: null }));
            }}
            placeholder="e.g. Medina | Madinah | المدينة"
            className={`w-full bidi-auto border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
              errors.fillAnswer ? 'border-red-400 bg-red-50/20' : 'border-primary-200 focus:ring-primary-500'
            }`}
          />
          {errors.fillAnswer ? (
            <p className="text-xs text-red-600 mt-1">{errors.fillAnswer}</p>
          ) : (
            <p className="text-xs text-ink/50 mt-1">
              Separate acceptable synonyms or spelling variants with a vertical bar <code className="bg-primary-50 px-1 py-0.5 rounded">|</code>.
            </p>
          )}
        </div>
      )}

      {/* Short Answer / Essay info */}
      {['SHORT_ANSWER', 'ESSAY'].includes(type) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          💡 This question type will be automatically routed to your <strong>Manual Grading Queue</strong> once the student submits the exam.
        </div>
      )}

      {/* Submit / Cancel buttons */}
      <div className="pt-3 border-t border-primary-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium text-ink/70 hover:bg-primary-50 transition text-center"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={saving || uploading}
          className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg shadow-sm transition"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Saving question…</span>
            </>
          ) : (
            <span>{isEditing ? 'Save changes' : 'Add question to bank'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
