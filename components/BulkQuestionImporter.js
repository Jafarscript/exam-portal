import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/hooks/useToast';
import { parseCsvQuestions, csvTemplate } from '@/lib/parseCsvQuestions';
import { parseTextQuestions, ARABIC_SAMPLE_TEXT, ENGLISH_SAMPLE_TEXT } from '@/lib/parseTextQuestions';
import RTLText from '@/components/RTLText';
import {
  FileText,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  ArrowLeft,
  Copy,
  Info,
  HelpCircle,
} from 'lucide-react';

const TYPE_LABELS = {
  MCQ: 'Multiple choice',
  MULTI_SELECT: 'Multiple select',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
  ESSAY: 'Essay',
  FILL_BLANK: 'Fill in the blank',
};

function downloadCsvTemplate() {
  const blob = new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exam-question-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkQuestionImporter({ examId, onImported, onCancel }) {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState('text'); // 'text' (Word/Text) | 'csv' (Spreadsheet/CSV)
  const [textInput, setTextInput] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [fileName, setFileName] = useState(null);
  const [drafts, setDrafts] = useState(null); // null = not parsed yet
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleCsvFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const content = await file.text();
      setCsvInput(content);
      push(`Loaded ${file.name}`, 'info');
    } catch {
      push('Failed to read file', 'error');
    }
  };

  const handleParse = () => {
    let parsed = [];
    if (activeTab === 'text') {
      if (!textInput.trim()) {
        push('Please paste your questions from Word or type them in the box', 'error');
        return;
      }
      parsed = parseTextQuestions(textInput);
      if (parsed.length === 0) {
        push('Could not parse any questions. Please check the formatting or load an example to see the expected structure.', 'error');
        return;
      }
    } else {
      if (!csvInput.trim()) {
        push('Upload a CSV file or paste your spreadsheet rows first', 'error');
        return;
      }
      parsed = parseCsvQuestions(csvInput);
      if (parsed.length === 0) {
        push('Could not find any question rows — ensure the header row matches the template.', 'error');
        return;
      }
    }

    setDrafts(parsed);
    push(`Parsed ${parsed.length} question${parsed.length !== 1 ? 's' : ''} successfully! Review them below.`, 'success');
  };

  const updateDraft = (key, updater) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        const updated = typeof updater === 'function' ? updater(d) : { ...d, ...updater };
        // Recalculate warnings
        const warnings = [];
        if (!updated.text?.trim()) warnings.push('Missing question text');
        if (['MCQ', 'MULTI_SELECT'].includes(updated.type)) {
          if (!updated.options || updated.options.length < 2) warnings.push('Needs at least 2 options');
          if (updated.type === 'MCQ' && !updated.correctAnswer) warnings.push('Please select the correct option');
          if (updated.type === 'MULTI_SELECT' && (!updated.correctAnswer || updated.correctAnswer.length === 0)) {
            warnings.push('Please select at least one correct option');
          }
        } else if (updated.type === 'TRUE_FALSE') {
          if (!updated.correctAnswer) warnings.push('Please select True or False');
        } else if (updated.type === 'FILL_BLANK') {
          if (!updated.correctAnswer || updated.correctAnswer.length === 0) {
            warnings.push('Please provide accepted answer(s)');
          }
        }
        return { ...updated, warnings };
      })
    );
  };

  const removeDraft = (key) => setDrafts((prev) => prev.filter((d) => d.key !== key));

  const hasErrors = drafts?.some((d) => d.warnings && d.warnings.length > 0);

  const confirmImport = async () => {
    if (hasErrors) {
      push('Please fix or remove the highlighted questions before importing.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = drafts.map(({ warnings, key, prefix, rawAnswerLine, ...rest }) => rest);
      const { questions } = await apiFetch(`/api/exams/${examId}/questions/bulk`, {
        method: 'POST',
        body: { questions: payload },
      });
      push(`${questions.length} questions successfully added to the bank!`, 'success');
      onImported?.();
    } catch (err) {
      push(err.message || 'Failed to import questions', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Review & Confirmation Screen
  if (drafts) {
    return (
      <div className="bg-white border border-primary-100 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-primary-50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-display font-semibold text-lg sm:text-xl text-primary-900">
                Review & Confirm Questions ({drafts.length})
              </h3>
            </div>
            <p className="text-xs text-ink/60 mt-0.5">
              Verify answers and marks. You can select different correct choices or adjust marks before adding to the bank.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrafts(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Edit Raw Text
          </button>
        </div>

        {hasErrors && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Some questions require your attention:</p>
              <p className="mt-0.5 text-amber-800">
                Please select the correct choice on the marked questions below, or click Remove to discard them.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
          {drafts.map((d, i) => {
            const hasWarning = d.warnings?.length > 0;
            return (
              <div
                key={d.key}
                className={`border rounded-xl p-4 transition ${
                  hasWarning ? 'border-amber-300 bg-amber-50/30' : 'border-primary-100 bg-white hover:border-primary-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badge Row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary-100 text-primary-800">
                        Q{i + 1}
                      </span>
                      <span className="text-xs font-semibold text-ink/70">
                        {TYPE_LABELS[d.type] || d.type}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-ink/60 ml-auto sm:ml-0">
                        <span>Marks:</span>
                        <input
                          type="number"
                          min={0}
                          value={d.marks}
                          onChange={(e) => updateDraft(d.key, { marks: Number(e.target.value) || 1 })}
                          className="w-14 border border-primary-200 rounded px-1.5 py-0.5 text-xs text-center font-semibold focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <RTLText
                      as="p"
                      text={d.text || '(Missing question text)'}
                      direction={d.textDirection}
                      className="font-medium text-ink text-sm sm:text-base mb-3 leading-relaxed"
                    />

                    {/* Multiple Choice / Multi Select Options */}
                    {['MCQ', 'MULTI_SELECT'].includes(d.type) && d.options?.length > 0 && (
                      <div className="space-y-1.5 pl-1">
                        <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider mb-1">
                          Choices (Click to select correct answer):
                        </p>
                        {d.options.map((opt, optIdx) => {
                          const isCorrect =
                            d.type === 'MCQ'
                              ? d.correctAnswer === opt.id
                              : Array.isArray(d.correctAnswer) && d.correctAnswer.includes(opt.id);

                          return (
                            <label
                              key={opt.id}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs sm:text-sm cursor-pointer transition ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                                  : 'border-primary-100 bg-primary-50/30 text-ink/80 hover:bg-primary-50'
                              }`}
                            >
                              {d.type === 'MCQ' ? (
                                <input
                                  type="radio"
                                  name={`correct-${d.key}`}
                                  checked={isCorrect}
                                  onChange={() => updateDraft(d.key, { correctAnswer: opt.id })}
                                  className="accent-emerald-600 cursor-pointer w-4 h-4 flex-shrink-0"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isCorrect}
                                  onChange={(e) => {
                                    const current = Array.isArray(d.correctAnswer) ? d.correctAnswer : [];
                                    const next = e.target.checked
                                      ? [...current, opt.id]
                                      : current.filter((id) => id !== opt.id);
                                    updateDraft(d.key, { correctAnswer: next });
                                  }}
                                  className="accent-emerald-600 cursor-pointer w-4 h-4 flex-shrink-0"
                                />
                              )}
                              <span className="text-xs font-bold text-ink/40">
                                {opt.prefix ? `${opt.prefix})` : `${optIdx + 1}.`}
                              </span>
                              <RTLText text={opt.text} direction={opt.textDirection} className="flex-1" />
                              {isCorrect && (
                                <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded">
                                  Correct Choice
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* True / False Choice */}
                    {d.type === 'TRUE_FALSE' && (
                      <div className="flex gap-2 pt-1">
                        {['true', 'false'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => updateDraft(d.key, { correctAnswer: v })}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold capitalize transition ${
                              d.correctAnswer === v
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-ink/70 border-primary-200 hover:bg-primary-50'
                            }`}
                          >
                            {v === 'true' ? '✓ True (صح)' : '✗ False (خطأ)'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Fill in Blank accepted answers */}
                    {d.type === 'FILL_BLANK' && (
                      <div className="pt-1">
                        <span className="text-xs font-semibold text-ink/70 block mb-1">
                          Accepted answer(s):
                        </span>
                        <input
                          dir="auto"
                          value={Array.isArray(d.correctAnswer) ? d.correctAnswer.join(' | ') : d.correctAnswer || ''}
                          onChange={(e) =>
                            updateDraft(d.key, {
                              correctAnswer: e.target.value.split('|').map((s) => s.trim()).filter(Boolean),
                            })
                          }
                          placeholder="e.g. Medina | Madinah | المدينة"
                          className="w-full bidi-auto border border-primary-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm"
                        />
                      </div>
                    )}

                    {/* Warnings List */}
                    {hasWarning && (
                      <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{d.warnings.join(' · ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeDraft(d.key)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    title="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-primary-100">
          <button
            type="button"
            onClick={() => setDrafts(null)}
            className="px-4 py-2 rounded-lg border border-primary-200 text-sm font-medium text-ink/70 hover:bg-primary-50 transition text-center"
          >
            ← Back to edit text
          </button>

          <button
            type="button"
            onClick={confirmImport}
            disabled={saving || hasErrors || drafts.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Importing questions…</span>
              </>
            ) : (
              <span>Add {drafts.length} Question{drafts.length !== 1 ? 's' : ''} to Bank</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Input & Parsing Form Screen
  return (
    <div className="bg-white border border-primary-100 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-primary-50 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h3 className="font-display font-semibold text-lg sm:text-xl text-primary-900">
            Bulk Question Importer
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-ink/60 hover:text-ink px-2.5 py-1 rounded-md hover:bg-primary-50 transition"
        >
          Cancel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-primary-100 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
            activeTab === 'text'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-ink/70 hover:bg-primary-50 hover:text-ink'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste from Word / Document</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
            activeTab === 'csv'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'text-ink/70 hover:bg-primary-50 hover:text-ink'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Spreadsheet / CSV</span>
        </button>
      </div>

      {/* Tab 1: Word / Plain Text Importer */}
      {activeTab === 'text' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs sm:text-sm text-ink/70">
              Copy questions directly from Microsoft Word, Google Docs, or PDF and paste below. Arabic <code className="bg-primary-50 px-1 py-0.5 rounded text-primary-800">أ) ب) ج) د)</code> and English formats are fully auto-detected!
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTextInput(ARABIC_SAMPLE_TEXT)}
                className="text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-2.5 py-1 rounded-md transition"
              >
                📋 Load Arabic Sample
              </button>
              <button
                type="button"
                onClick={() => setTextInput(ENGLISH_SAMPLE_TEXT)}
                className="text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-2.5 py-1 rounded-md transition"
              >
                📋 Load English Sample
              </button>
              {textInput && (
                <button
                  type="button"
                  onClick={() => setTextInput('')}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              dir="auto"
              rows={12}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Example Arabic Format:

1. أيُّ الكلمات كُتبت كتابةً صحيحة؟
أ) كريس
ب) كرسي
ج) كرسى
د) كرثي

الإجابة: ب) كرسي

---

2. أيُّ كلمة فيها خطأ إملائي؟
أ) كتاب
ب) قلم
ج) مدرصة
د) دفتر

الإجابة: ج) مدرصة`}
              className="w-full bidi-auto font-sans text-sm sm:text-base border border-primary-200 rounded-xl p-3.5 text-ink leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-inner"
            />
          </div>

          {/* Tips Box */}
          <div className="p-3.5 bg-primary-50/50 border border-primary-100 rounded-xl text-xs text-ink/70 space-y-1">
            <div className="font-semibold text-primary-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary-600" /> Supported Formatting Tips:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-ink/60">
              <li>
                <strong>Arabic Choices:</strong> <code className="text-primary-800">أ) ب) ج) د)</code> or <code className="text-primary-800">أ- ب- ج- د-</code> or <code className="text-primary-800">أ. ب. ج. د.</code>
              </li>
              <li>
                <strong>English Choices:</strong> <code className="text-primary-800">A) B) C) D)</code> or <code className="text-primary-800">A. B. C. D.</code>
              </li>
              <li>
                <strong>Correct Answer:</strong> <code className="text-primary-800">الإجابة: ب) كرسي</code>, <code className="text-primary-800">الجواب: ج</code>, or <code className="text-primary-800">Answer: B</code>
              </li>
              <li>
                <strong>Custom Marks (Optional):</strong> add <code className="text-primary-800">[2 marks]</code> or <code className="text-primary-800">[2 درجات]</code> after the question prompt.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: CSV / Spreadsheet Importer */}
      {activeTab === 'csv' && (
        <div className="space-y-3 animate-fadeIn">
          <p className="text-xs sm:text-sm text-ink/70">
            Download our CSV template, fill it in Excel or Google Sheets, then upload the file or paste the table columns directly.
          </p>

          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-lg transition"
          >
            ⬇ Download CSV template
          </button>

          <div>
            <label className="text-xs font-medium text-ink/70 block mb-1">Upload CSV file</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFile}
              className="w-full text-xs text-ink/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"
            />
            {fileName && <p className="text-xs text-emerald-600 font-semibold mt-1">Loaded {fileName} ✓</p>}
          </div>

          <div className="relative pt-1">
            <label className="text-xs font-medium text-ink/70 block mb-1">Or paste copied spreadsheet cells directly:</label>
            <textarea
              dir="auto"
              rows={6}
              value={csvInput}
              onChange={(e) => {
                setCsvInput(e.target.value);
                setFileName(null);
              }}
              placeholder="type,marks,text,option_a,option_b,option_c,option_d,correct..."
              className="w-full bidi-auto font-mono text-xs border border-primary-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {/* Parse & Preview Button */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleParse}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm shadow-sm transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Parse & Preview Questions</span>
        </button>
      </div>
    </div>
  );
}
