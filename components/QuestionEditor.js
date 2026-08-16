import { useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/hooks/useToast';

const TYPE_LABELS = {
  MCQ: 'Multiple choice',
  MULTI_SELECT: 'Multiple select',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
  ESSAY: 'Essay',
  FILL_BLANK: 'Fill in the blank',
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

// Rebuilds the editor's local state from an existing question doc, so
// editing starts from what's already saved rather than a blank form.
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
  if (q.type === 'MULTI_SELECT') base.correctOptionIds = q.correctAnswer || [];
  if (q.type === 'TRUE_FALSE') base.trueFalseAnswer = q.correctAnswer || 'true';
  if (q.type === 'FILL_BLANK') {
    base.fillAnswer = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' | ') : q.correctAnswer || '';
  }
  return base;
}

// Pass `existingQuestion` to edit that question in place (PATCH); omit it
// to create a new one (POST), as before. `onCancel` is only used in edit
// mode, to let the caller close the editor without saving.
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

  const reset = () => {
    setText('');
    setMarks(1);
    setOptions([blankOption(), blankOption()]);
    setCorrectOptionId('');
    setCorrectOptionIds([]);
    setFillAnswer('');
    setImageUrl(null);
    setAudioUrl(null);
  };

  const handleUpload = async (e, kind) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUri = await fileToDataUri(file);
      const { url } = await apiFetch('/api/upload', { method: 'POST', body: { dataUri } });
      kind === 'image' ? setImageUrl(url) : setAudioUrl(url);
      push('Upload complete', 'success');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!text.trim()) return push('Question text is required', 'error');
    let correctAnswer = null;
    if (type === 'MCQ') {
      if (!correctOptionId) return push('Select the correct option', 'error');
      correctAnswer = correctOptionId;
    } else if (type === 'MULTI_SELECT') {
      if (correctOptionIds.length === 0) return push('Select at least one correct option', 'error');
      correctAnswer = correctOptionIds;
    } else if (type === 'TRUE_FALSE') {
      correctAnswer = trueFalseAnswer;
    } else if (type === 'FILL_BLANK') {
      if (!fillAnswer.trim()) return push('Provide the accepted answer', 'error');
      correctAnswer = fillAnswer.split('|').map((s) => s.trim()).filter(Boolean);
    }
    if (['MCQ', 'MULTI_SELECT'].includes(type) && options.some((o) => !o.text.trim())) {
      return push('All options need text', 'error');
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
        push('Question updated', 'success');
        onSaved?.(question);
      } else {
        const { question } = await apiFetch(`/api/exams/${examId}/questions`, { method: 'POST', body: payload });
        push('Question added', 'success');
        reset();
        onCreated?.(question);
      }
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-primary-100 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-ink">{isEditing ? 'Edit question' : 'Add a question'}</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink/70">Question type</label>
          <select value={type} onChange={(e) => { setType(e.target.value); reset(); }} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2">
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70">Marks</label>
          <input type="number" min={0} value={marks} onChange={(e) => setMarks(e.target.value)} className="w-full mt-1 border border-primary-200 rounded-lg px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-ink/70">Question text</label>
        <textarea dir="auto" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="w-full mt-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2" placeholder="Arabic, English, or mixed" />
        <div className="flex gap-3 mt-1">
          {['AUTO', 'RTL', 'LTR'].map((d) => (
            <label key={d} className="text-xs flex items-center gap-1">
              <input type="radio" checked={textDirection === d} onChange={() => setTextDirection(d)} /> {d}
            </label>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-ink/70">Image (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'image')} className="w-full mt-1 text-sm" />
          {imageUrl && <p className="text-xs text-primary-600 mt-1">Uploaded ✓</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70">Audio (optional — e.g. recitation)</label>
          <input type="file" accept="audio/*" onChange={(e) => handleUpload(e, 'audio')} className="w-full mt-1 text-sm" />
          {audioUrl && <p className="text-xs text-primary-600 mt-1">Uploaded ✓</p>}
        </div>
      </div>

      {['MCQ', 'MULTI_SELECT'].includes(type) && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink/70">Options — mark the correct one(s)</label>
          {options.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              {type === 'MCQ' ? (
                <input type="radio" checked={correctOptionId === opt.id} onChange={() => setCorrectOptionId(opt.id)} />
              ) : (
                <input
                  type="checkbox"
                  checked={correctOptionIds.includes(opt.id)}
                  onChange={(e) =>
                    setCorrectOptionIds((prev) => (e.target.checked ? [...prev, opt.id] : prev.filter((id) => id !== opt.id)))
                  }
                />
              )}
              <input
                dir="auto"
                value={opt.text}
                onChange={(e) => setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2"
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions((prev) => prev.filter((o) => o.id !== opt.id))} className="text-red-500 text-sm">
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setOptions((prev) => [...prev, blankOption()])} className="text-sm text-primary-600 font-medium">
            + Add option
          </button>
        </div>
      )}

      {type === 'TRUE_FALSE' && (
        <div>
          <label className="text-sm font-medium text-ink/70">Correct answer</label>
          <div className="flex gap-4 mt-1">
            {['true', 'false'].map((v) => (
              <label key={v} className="text-sm flex items-center gap-1 capitalize">
                <input type="radio" checked={trueFalseAnswer === v} onChange={() => setTrueFalseAnswer(v)} /> {v}
              </label>
            ))}
          </div>
        </div>
      )}

      {type === 'FILL_BLANK' && (
        <div>
          <label className="text-sm font-medium text-ink/70">Accepted answer(s) — separate alternatives with |</label>
          <input dir="auto" value={fillAnswer} onChange={(e) => setFillAnswer(e.target.value)} className="w-full mt-1 bidi-auto border border-primary-200 rounded-lg px-3 py-2" />
        </div>
      )}

      {['SHORT_ANSWER', 'ESSAY'].includes(type) && (
        <p className="text-xs text-ink/50">This question type is graded manually by the teacher after submission.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving || uploading}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add question'}
        </button>
        {isEditing && (
          <button type="button" onClick={onCancel} className="text-sm font-medium text-ink/60 hover:text-ink">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
