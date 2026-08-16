import RTLText from './RTLText';

export default function QuestionRenderer({ question, value, onChange, index, total }) {
  const q = question;

  return (
    <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-600">
          Question {index + 1} of {total}
        </span>
        <span className="text-xs text-ink/50">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
      </div>

      <RTLText as="p" text={q.text} direction={q.textDirection} className="text-lg text-ink mb-4 leading-relaxed" />

      {q.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.imageUrl} alt="" className="max-w-full rounded-lg border border-primary-100 mb-4" />
      )}
      {q.audioUrl && (
        <audio controls className="w-full mb-4">
          <source src={q.audioUrl} />
          Your browser does not support audio playback.
        </audio>
      )}

      {q.type === 'MCQ' && (
        <div className="space-y-2">
          {q.options.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                value === opt.id ? 'border-primary-500 bg-primary-50' : 'border-primary-100 hover:bg-primary-50/50'
              }`}
            >
              <input type="radio" name={`q-${q.id}`} checked={value === opt.id} onChange={() => onChange(opt.id)} className="accent-primary-600" />
              <RTLText text={opt.text} direction={opt.textDirection} />
            </label>
          ))}
        </div>
      )}

      {q.type === 'MULTI_SELECT' && (
        <div className="space-y-2">
          {q.options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                  selected ? 'border-primary-500 bg-primary-50' : 'border-primary-100 hover:bg-primary-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(e.target.checked ? [...current, opt.id] : current.filter((v) => v !== opt.id));
                  }}
                  className="accent-primary-600"
                />
                <RTLText text={opt.text} direction={opt.textDirection} />
              </label>
            );
          })}
        </div>
      )}

      {q.type === 'TRUE_FALSE' && (
        <div className="flex gap-3">
          {['true', 'false'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 py-3 rounded-lg border font-medium capitalize transition ${
                value === v ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-primary-100 hover:bg-primary-50/50'
              }`}
            >
              {v === 'true' ? 'True' : 'False'}
            </button>
          ))}
        </div>
      )}

      {q.type === 'FILL_BLANK' && (
        <input
          type="text"
          dir="auto"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          className="w-full bidi-auto border border-primary-200 rounded-lg px-4 py-3 focus:border-primary-500 outline-none"
        />
      )}

      {q.type === 'SHORT_ANSWER' && (
        <textarea
          dir="auto"
          rows={3}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write a short answer"
          className="w-full bidi-auto border border-primary-200 rounded-lg px-4 py-3 focus:border-primary-500 outline-none resize-y"
        />
      )}

      {q.type === 'ESSAY' && (
        <textarea
          dir="auto"
          rows={8}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer"
          className="w-full bidi-auto border border-primary-200 rounded-lg px-4 py-3 focus:border-primary-500 outline-none resize-y"
        />
      )}
    </div>
  );
}
