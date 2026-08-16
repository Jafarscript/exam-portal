import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/hooks/useToast';
import { parseCsvQuestions, csvTemplate } from '@/lib/parseCsvQuestions';
import RTLText from '@/components/RTLText';

const TYPE_LABELS = {
  MCQ: 'Multiple choice',
  MULTI_SELECT: 'Multiple select',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
  ESSAY: 'Essay',
  FILL_BLANK: 'Fill in the blank',
};

function downloadTemplate() {
  const blob = new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'question-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkQuestionImporter({ examId, onImported, onCancel }) {
  const { push } = useToast();
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState(null);
  const [drafts, setDrafts] = useState(null); // null = not parsed yet
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setRaw(await file.text());
  };

  const parse = () => {
    if (!raw.trim()) return push('Upload a CSV file or paste your sheet first', 'error');
    const parsed = parseCsvQuestions(raw);
    if (parsed.length === 0) {
      push('Could not find any question rows — check the header row matches the template', 'error');
      return;
    }
    setDrafts(parsed);
  };

  const removeDraft = (key) => setDrafts((prev) => prev.filter((d) => d.key !== key));

  const hasErrors = drafts?.some((d) => d.warnings.length > 0);

  const confirmImport = async () => {
    setSaving(true);
    try {
      const payload = drafts.map(({ warnings, key, ...rest }) => rest);
      const { questions } = await apiFetch(`/api/exams/${examId}/questions/bulk`, {
        method: 'POST',
        body: { questions: payload },
      });
      push(`${questions.length} questions added`, 'success');
      onImported?.();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (drafts) {
    return (
      <div className="bg-white border border-primary-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Review {drafts.length} question{drafts.length !== 1 ? 's' : ''}</h3>
          <button onClick={() => setDrafts(null)} className="text-xs font-semibold text-primary-600">← Back to sheet</button>
        </div>

        {hasErrors && (
          <p className="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg">
            Some rows have issues below — fix them in the sheet and re-upload, or remove the row before importing.
          </p>
        )}

        <div className="space-y-2 max-h-[28rem] overflow-y-auto">
          {drafts.map((d, i) => (
            <div key={d.key} className={`border rounded-lg p-3 ${d.warnings.length ? 'border-red-200 bg-red-50/40' : 'border-primary-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-primary-600">
                    Row {i + 1} · {TYPE_LABELS[d.type] || d.type} · {d.marks} mark{d.marks !== 1 ? 's' : ''}
                  </span>
                  <RTLText as="p" text={d.text || '(missing text)'} direction={d.textDirection} className="text-ink text-sm mt-1" />
                  {d.options?.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {d.options.map((o) => (
                        <li key={o.id} className={`text-xs flex items-center gap-2 ${
                          (d.type === 'MCQ' ? d.correctAnswer === o.id : d.correctAnswer?.includes(o.id))
                            ? 'text-primary-700 font-medium' : 'text-ink/60'
                        }`}>
                          <span>{(d.type === 'MCQ' ? d.correctAnswer === o.id : d.correctAnswer?.includes(o.id)) ? '✓' : '·'}</span>
                          <RTLText text={o.text} direction={o.textDirection} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {d.warnings.length > 0 && (
                    <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                      {d.warnings.map((w) => <li key={w}>{w}</li>)}
                    </ul>
                  )}
                </div>
                <button onClick={() => removeDraft(d.key)} className="text-red-500 text-xs font-semibold whitespace-nowrap">Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={confirmImport}
            disabled={saving || hasErrors || drafts.length === 0}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
          >
            {saving ? 'Importing…' : `Add ${drafts.length} question${drafts.length !== 1 ? 's' : ''}`}
          </button>
          <button type="button" onClick={() => setDrafts(null)} className="text-sm font-medium text-ink/60 hover:text-ink">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-primary-100 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink">Bulk import from CSV / spreadsheet</h3>
        <button onClick={onCancel} className="text-xs font-medium text-ink/50 hover:text-ink">Cancel</button>
      </div>
      <p className="text-sm text-ink/60">
        Download the template, fill it in Excel or Google Sheets, then upload the CSV — or just select your
        questions in the sheet, copy, and paste them below.
      </p>
      <button type="button" onClick={downloadTemplate} className="text-sm font-semibold text-primary-600">
        ⬇ Download CSV template
      </button>

      <div>
        <label className="text-sm font-medium text-ink/70">Upload CSV file</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="w-full mt-1 text-sm"
        />
        {fileName && <p className="text-xs text-primary-600 mt-1">Loaded {fileName} ✓</p>}
      </div>

      <div className="relative">
        <div className="text-center text-xs text-ink/40 my-1">— or paste directly —</div>
        <textarea
          dir="auto"
          rows={8}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setFileName(null); }}
          placeholder="Paste rows copied from Excel/Google Sheets (include the header row), or raw CSV text"
          className="w-full bidi-auto font-mono text-sm border border-primary-200 rounded-lg px-3 py-2"
        />
      </div>

      <button
        type="button"
        onClick={parse}
        className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-lg"
      >
        Preview
      </button>
    </div>
  );
}
