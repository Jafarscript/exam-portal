// Parses a CSV (or TSV — pasting straight out of Excel/Google Sheets gives
// tab-separated text, which is handled the same way) question sheet into
// question drafts.
//
// Expected header row (case/spacing insensitive, any order):
//   type, marks, text, option_a, option_b, option_c, option_d, option_e,
//   option_f, correct, answer, direction
//
// - type: mcq | multi_select | true_false | fill_blank | essay |
//   short_answer — optional, auto-detected from the other columns if blank.
// - marks: number, defaults to 1.
// - text: the question itself (Arabic or English, any script).
// - option_a.. option_f: option text; leave blank columns unused.
// - correct: which option(s) are right — a letter (a, b, c… or أ ب ج د…)
//   matching an option column, multiple separated by "|" for multi-select.
//   For true_false: true/false (or صح/خطأ). Ignored otherwise.
// - answer: accepted answer(s) for fill_blank, separated by "|". Ignored
//   otherwise.
// - direction: rtl | ltr | auto (optional, defaults to auto).

const TYPE_MAP = {
  mcq: 'MCQ',
  multiplechoice: 'MCQ',
  multiselect: 'MULTI_SELECT',
  multipleselect: 'MULTI_SELECT',
  truefalse: 'TRUE_FALSE',
  tf: 'TRUE_FALSE',
  fillblank: 'FILL_BLANK',
  fillintheblank: 'FILL_BLANK',
  essay: 'ESSAY',
  shortanswer: 'SHORT_ANSWER',
};

const OPTION_COLS = ['optiona', 'optionb', 'optionc', 'optiond', 'optione', 'optionf'];
const LATIN_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];
const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و'];

function norm(s) {
  return (s || '').toString().toLowerCase().replace(/[^a-z0-9أ-ي]/gi, '');
}

// Minimal RFC4180-ish parser: handles quoted fields (with embedded
// delimiters/newlines and "" escapes) for both comma- and tab-delimited
// input.
function parseDelimited(input, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c === '\r') {
      // skip; \r\n handled via the \n branch
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

function detectDelimiter(firstLine) {
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

function resolveLetter(token, options) {
  const t = token.trim();
  const latinIdx = LATIN_LETTERS.indexOf(t.toLowerCase());
  if (latinIdx !== -1 && options[latinIdx]) return options[latinIdx];
  const arabicIdx = ARABIC_LETTERS.indexOf(t);
  if (arabicIdx !== -1 && options[arabicIdx]) return options[arabicIdx];
  // Fallback: match against option text itself.
  return options.find((o) => o.text.trim() === t) || null;
}

function parseRow(headerIndex, cells, rowIndex) {
  const get = (key) => (headerIndex[key] !== undefined ? (cells[headerIndex[key]] || '').trim() : '');

  const text = get('text');
  const marksRaw = get('marks');
  const marks = marksRaw && !isNaN(Number(marksRaw)) ? Number(marksRaw) : 1;
  const dirRaw = norm(get('direction'));
  const textDirection = ['rtl', 'ltr'].includes(dirRaw) ? dirRaw.toUpperCase() : 'AUTO';

  const options = OPTION_COLS
    .map((col) => get(col))
    .filter((v) => v !== '')
    .map((v) => ({ id: Math.random().toString(36).slice(2, 8), text: v, textDirection: 'AUTO' }));

  const correctRaw = get('correct');
  const answerRaw = get('answer');

  let type = TYPE_MAP[norm(get('type'))] || null;
  const warnings = [];

  if (!type) {
    if (options.length > 0) {
      const tokenCount = correctRaw ? correctRaw.split('|').map((s) => s.trim()).filter(Boolean).length : 0;
      type = tokenCount > 1 ? 'MULTI_SELECT' : 'MCQ';
    } else if (/^(true|false|صح|خطأ)$/i.test(correctRaw)) {
      type = 'TRUE_FALSE';
    } else if (answerRaw) {
      type = 'FILL_BLANK';
    } else {
      type = 'ESSAY';
    }
  }

  let correctAnswer = null;
  if (type === 'MCQ' || type === 'MULTI_SELECT') {
    if (options.length < 2) warnings.push('Needs at least 2 options');
    const tokens = correctRaw.split('|').map((s) => s.trim()).filter(Boolean);
    const resolved = tokens.map((t) => resolveLetter(t, options)).filter(Boolean);
    if (resolved.length === 0) warnings.push('"correct" column doesn\'t match any option (use a/b/c… or أ/ب/ج…)');
    correctAnswer = type === 'MCQ' ? (resolved[0]?.id || null) : resolved.map((o) => o.id);
  } else if (type === 'TRUE_FALSE') {
    if (!correctRaw) warnings.push('Missing "correct" value (true/false)');
    correctAnswer = /^(true|صح)$/i.test(correctRaw) ? 'true' : 'false';
  } else if (type === 'FILL_BLANK') {
    if (!answerRaw) warnings.push('Missing "answer" value');
    correctAnswer = answerRaw.split('|').map((s) => s.trim()).filter(Boolean);
  }
  // SHORT_ANSWER / ESSAY: graded manually, no answer key stored.

  if (!text) warnings.push('Missing question text');

  return {
    key: `csv-${rowIndex}`,
    type,
    text,
    textDirection,
    marks,
    options: ['MCQ', 'MULTI_SELECT'].includes(type)
      ? options.map(({ id, text: t, textDirection: td }) => ({ id, text: t, textDirection: td }))
      : [],
    correctAnswer,
    imageUrl: null,
    audioUrl: null,
    warnings,
  };
}

export function parseCsvQuestions(input) {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const delimiter = detectDelimiter(trimmed.split('\n')[0]);
  const rows = parseDelimited(trimmed, delimiter);
  if (rows.length < 2) return [];

  const header = rows[0].map(norm);
  const headerIndex = {};
  header.forEach((h, i) => { if (!(h in headerIndex)) headerIndex[h] = i; });

  return rows.slice(1).map((cells, i) => parseRow(headerIndex, cells, i));
}

export function csvTemplate() {
  const header = 'type,marks,text,option_a,option_b,option_c,option_d,option_e,option_f,correct,answer,direction';
  const rows = [
    'mcq,2,"What is the capital of Nigeria?",Lagos,Abuja,Kano,Enugu,,,b,,auto',
    'mcq,1,"من التي كانت حاضنة النبي ﷺ في بني سعد؟",آمنة بنت وهب,حليمة السعدية,أم أيمن,خديجة بنت خويلد,,,ب,,rtl',
    'multi_select,2,Which of these are prophets?,Musa,Fir\'awn,Isa,Abu Jahl,,,a|c,,auto',
    'true_false,1,Lagos is the capital of Nigeria.,,,,,,,false,,auto',
    'fill_blank,1,The Prophet was born in ____.,,,,,,,,Makkah|Mecca,auto',
    'essay,5,Explain the five pillars of Islam.,,,,,,,,,auto',
  ];
  return [header, ...rows].join('\n');
}
