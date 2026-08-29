// Smart Document Parser for Arabic & English Questions copied from Word, PDF, Google Docs, etc.

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
const ARABIC_LETTER_MAP = {
  'ا': 0, 'أ': 0, 'إ': 0, 'آ': 0,
  'ب': 1,
  'ج': 2,
  'د': 3,
  'ه': 4, 'هـ': 4,
  'و': 5,
};

const LATIN_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

function isArabicText(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text || '');
}

function cleanString(str) {
  return (str || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// Check if a line is a separator
function isSeparatorLine(line) {
  const trimmed = line.trim();
  return /^(?:---+|===+|\*\*\*+|___+|───+|━━━+)$/.test(trimmed);
}

// Detect question start headers like "1. ", "1) ", "١. ", "س1: ", "Q1: ", "Question 1:", etc.
const QUESTION_HEADER_REGEX = /^(?:(?:س\s*\d+|سؤال\s*\d+|السؤال\s*(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)|Q\s*\.?\s*\d+|Question\s*\d+|[0-9]{1,3}|[\u0660-\u0669]{1,3})[\.\-\)\:\/\s]+)/i;

// Match marks like [2 marks], (2 marks), [2 درجات], (1 mark), [3 pts], [5]
const MARKS_REGEX = /(?:\[|\()(\d+(?:\.\d+)?)\s*(?:marks?|mark|pts?|points?|درجات?|درجة|علامات?|علامة)?(?:\s*درجات?|\s*علامات?)?(?:\]|\))/i;

// Match Answer headers
const ANSWER_HEADER_REGEX = /^(?:الإجابة|الاجابة|إجابة|اجابة|الجواب|جواب|الحل|حل|الإجابة\s*الصحيحة|الجواب\s*الصحيح|Answer|Ans|Correct\s*Answer|Correct|Key|Solution)\s*[:：\-–—\.]\s*(.*)$/i;

// Match option prefixes
const OPTION_PREFIX_REGEX = /^(?:[\(\[]?([أ-يa-zA-Z0-9])[\)\]\.\-\:\/]\s*)/;

export function parseTextQuestions(inputText) {
  const clean = cleanString(inputText).trim();
  if (!clean) return [];

  const rawLines = clean.split('\n');
  const blocks = [];
  let currentBlock = [];

  // Group lines into question blocks
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line - if next non-empty line looks like a new question or we have a complete question with answer, we can consider splitting
      if (currentBlock.length > 0) {
        currentBlock.push('');
      }
      continue;
    }

    if (isSeparatorLine(trimmed)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n').trim());
        currentBlock = [];
      }
      continue;
    }

    // Check if this line is the start of a new question
    const isNewQuestionStart = QUESTION_HEADER_REGEX.test(trimmed);
    const hasExistingQuestion = currentBlock.some((l) => l.trim() && !isSeparatorLine(l));
    const hasOptionsOrAnswer = currentBlock.some((l) =>
      ANSWER_HEADER_REGEX.test(l.trim()) ||
      OPTION_PREFIX_REGEX.test(l.trim()) ||
      /^[أ-يa-fA-F]\)/.test(l.trim())
    );

    if (isNewQuestionStart && hasExistingQuestion && hasOptionsOrAnswer) {
      blocks.push(currentBlock.join('\n').trim());
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n').trim());
  }

  // Parse each block into a structured question object
  const results = [];
  blocks.forEach((blockText, blockIndex) => {
    if (!blockText) return;
    const parsed = parseSingleBlock(blockText, blockIndex);
    if (parsed) results.push(parsed);
  });

  return results;
}

function parseSingleBlock(blockText, blockIndex) {
  const lines = blockText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let questionText = '';
  let marks = 1;
  let rawAnswerLine = '';
  const rawOptions = [];
  const warnings = [];

  // 1. Process first line or leading lines as question text
  let lineIdx = 0;
  let qLine = lines[lineIdx];

  // Extract marks from first line if present
  const marksMatch = qLine.match(MARKS_REGEX);
  if (marksMatch) {
    const m = parseFloat(marksMatch[1]);
    if (!isNaN(m) && m >= 0) marks = m;
    qLine = qLine.replace(MARKS_REGEX, '').trim();
  }

  // Strip leading question numbering (e.g. "1. ", "1) ", "س1: ", "Q1: ")
  qLine = qLine.replace(QUESTION_HEADER_REGEX, '').trim();
  questionText = qLine;
  lineIdx++;

  // Collect subsequent lines: either more question text, options, or answer line
  while (lineIdx < lines.length) {
    const line = lines[lineIdx];

    // Check if answer line
    const ansMatch = line.match(ANSWER_HEADER_REGEX);
    if (ansMatch) {
      rawAnswerLine = ansMatch[1].trim();
      lineIdx++;
      continue;
    }

    // Check if line contains inline multiple options (e.g. "أ) كريس   ب) كرسي   ج) كرسى   د) كرثي")
    const inlineOptions = splitInlineOptions(line);
    if (inlineOptions.length > 1) {
      inlineOptions.forEach((opt) => rawOptions.push(opt));
      lineIdx++;
      continue;
    }

    // Check if line starts with an option prefix (e.g. "أ) ...", "A. ...", "(ب) ...")
    const singleOption = parseOptionLine(line);
    if (singleOption) {
      rawOptions.push(singleOption);
      lineIdx++;
      continue;
    }

    // If we haven't found any options or answers yet, this might be a continuation of the question prompt
    if (rawOptions.length === 0 && !rawAnswerLine) {
      questionText += '\n' + line;
    } else if (rawAnswerLine) {
      // additional text after answer line
    } else {
      // If we already have options, this line might be continuation of previous option or an un-prefixed option
      if (rawOptions.length > 0) {
        rawOptions[rawOptions.length - 1].text += ' ' + line;
      }
    }
    lineIdx++;
  }

  // Determine direction
  const textDirection = isArabicText(questionText) || rawOptions.some((o) => isArabicText(o.text)) ? 'RTL' : 'AUTO';

  // Build options array with random IDs
  const options = rawOptions.map((o) => ({
    id: Math.random().toString(36).slice(2, 8),
    prefix: o.prefix,
    text: o.text.trim(),
    textDirection: isArabicText(o.text) ? 'RTL' : 'AUTO',
  }));

  // Determine type & correctAnswer
  let type = 'MCQ';
  let correctAnswer = null;

  if (options.length >= 2) {
    type = 'MCQ';
    if (rawAnswerLine) {
      const resolved = resolveAnswer(rawAnswerLine, options);
      if (resolved.length > 1) {
        type = 'MULTI_SELECT';
        correctAnswer = resolved.map((o) => o.id);
      } else if (resolved.length === 1) {
        correctAnswer = resolved[0].id;
      } else {
        warnings.push(`Could not match answer "${rawAnswerLine}" to an option. Please select the correct choice.`);
      }
    } else {
      warnings.push('No correct answer specified (e.g. "الإجابة: ب" or "Answer: B")');
    }
  } else {
    // No options provided: check if True/False or Fill Blank or Short Answer / Essay
    const lowerAns = rawAnswerLine.toLowerCase();
    const isTrue = /^(true|صح|صحيح|صواب|yes|نعم|t)$/i.test(lowerAns);
    const isFalse = /^(false|خطأ|خطا|لا|no|f)$/i.test(lowerAns);

    if (isTrue || isFalse || /(صح\s*[\/\\]\s*خطأ|true\s*[\/\\]\s*false)/i.test(questionText)) {
      type = 'TRUE_FALSE';
      correctAnswer = isTrue ? 'true' : isFalse ? 'false' : 'true';
      if (!rawAnswerLine) {
        warnings.push('Please specify whether the answer is True or False');
      }
    } else if (rawAnswerLine || questionText.includes('_____') || questionText.includes('...')) {
      type = 'FILL_BLANK';
      correctAnswer = rawAnswerLine
        ? rawAnswerLine.split(/[|،,]/).map((s) => s.trim()).filter(Boolean)
        : [];
      if (correctAnswer.length === 0) {
        warnings.push('Please specify accepted answer(s) for the fill-in-the-blank question');
      }
    } else {
      type = 'SHORT_ANSWER';
      correctAnswer = null;
    }
  }

  if (!questionText.trim()) {
    warnings.push('Missing question prompt text');
  }

  return {
    key: `text-${blockIndex}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    text: questionText.trim(),
    textDirection,
    marks,
    options: ['MCQ', 'MULTI_SELECT'].includes(type)
      ? options.map(({ id, text, textDirection }) => ({ id, text, textDirection }))
      : [],
    correctAnswer,
    imageUrl: null,
    audioUrl: null,
    warnings,
    rawAnswerLine: rawAnswerLine || null,
  };
}

function parseOptionLine(line) {
  const trimmed = line.trim();
  // Check standard patterns like "أ) كرسي", "أ. كرسي", "أ - كرسي", "(أ) كرسي", "A) option", "1) option"
  const m = trimmed.match(/^([\(\[]?([أ-يa-zA-Z0-9])[\)\]\.\-\:\/])\s*(.*)$/);
  if (m) {
    const rawLetter = m[2];
    const optionContent = m[3].trim();
    if (optionContent) {
      return { prefix: rawLetter, text: optionContent };
    }
  }
  return null;
}

function splitInlineOptions(line) {
  // Checks if a single line contains multiple options like "أ) كريس   ب) كرسي   ج) كرسى   د) كرثي" or "A) one  B) two  C) three"
  const regex = /(?:^|\s+)([\(\[]?([أ-يa-zA-Z0-9])[\)\]\.\-\:\/])\s+([^\s\(\)\[\]]+(?:\s+[^\s\(\)\[\]]+)*?)(?=(?:\s+[\(\[]?[أ-يa-zA-Z0-9][\)\]\.\-\:\/]|\s*$))/g;
  const matches = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    const rawLetter = match[2];
    const text = match[3].trim();
    if (text) {
      matches.push({ prefix: rawLetter, text });
    }
  }
  return matches.length >= 2 ? matches : [];
}

// Resolve answer text to one or more options
function resolveAnswer(answerStr, options) {
  if (!answerStr) return [];
  const trimmed = answerStr.trim();

  // 1. Check for multiple separated answers (e.g. "A, C", "أ و ب", "A | B | C", "A and B")
  // Only split if the string contains actual separators and is not just a sentence
  const multiSplitRegex = /\s*(?:[,|&+]|\band\b|\s+و\s+)\s*/;
  const parts = trimmed.split(multiSplitRegex).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const matched = [];
    for (const part of parts) {
      const single = resolveSingleAnswer(part, options);
      if (single) matched.push(single);
    }
    if (matched.length > 1) {
      return Array.from(new Set(matched));
    }
  }

  // 2. Single token resolve
  const single = resolveSingleAnswer(trimmed, options);
  if (single) return [single];

  return [];
}

function resolveSingleAnswer(token, options) {
  if (!token) return null;
  const trimmed = token.trim();

  // Pattern: "ب) كرسي" or "B) Abuja" or "ب" or "B" or "(ب)"
  const letterMatch = trimmed.match(/^[\(\[]?([أ-يa-zA-Z0-9])[\)\]\.\-\:\/]?\s*(.*)$/);
  if (letterMatch) {
    const letter = letterMatch[1];
    const restText = letterMatch[2].trim();

    // Try match by explicit option prefix
    const optByPrefix = options.find((o) => o.prefix && o.prefix.toLowerCase() === letter.toLowerCase());
    if (optByPrefix) return optByPrefix;

    // Try match by letter mapping index (e.g. أ -> 0, ب -> 1, A -> 0, B -> 1)
    const optByIndex = getOptionByIndexOrLetter(letter, options);
    if (optByIndex) return optByIndex;

    // If rest text is given ("ب) كرسي"), try matching the text against option text
    if (restText) {
      const optByText = options.find((o) => cleanForCompare(o.text) === cleanForCompare(restText));
      if (optByText) return optByText;
    }
  }

  // Exact option text match
  const cleanAns = cleanForCompare(trimmed);
  const byExactText = options.find((o) => cleanForCompare(o.text) === cleanAns);
  if (byExactText) return byExactText;

  // Fuzzy / includes option text match
  const byContainsText = options.find(
    (o) =>
      cleanForCompare(o.text).length > 2 &&
      (cleanAns.includes(cleanForCompare(o.text)) || cleanForCompare(o.text).includes(cleanAns))
  );
  if (byContainsText) return byContainsText;

  return null;
}

function getOptionByIndexOrLetter(token, options) {
  const norm = token.trim();
  // Check Arabic letter
  if (ARABIC_LETTER_MAP[norm] !== undefined) {
    const idx = ARABIC_LETTER_MAP[norm];
    if (options[idx]) return options[idx];
  }
  // Check Latin letter
  const latinIdx = LATIN_LETTERS.indexOf(norm.toLowerCase());
  if (latinIdx !== -1 && options[latinIdx]) {
    return options[latinIdx];
  }
  // Check numeric index like 1, 2, 3
  const num = parseInt(norm, 10);
  if (!isNaN(num) && num >= 1 && options[num - 1]) {
    return options[num - 1];
  }
  return null;
}

function cleanForCompare(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel / diacritics
    .replace(/[^a-z0-9\u0621-\u064A]/gi, '')
    .trim();
}

export const ARABIC_SAMPLE_TEXT = `1. أيُّ الكلمات كُتبت كتابةً صحيحة؟
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

الإجابة: ج) مدرصة

---

3. اختر الكلمة الصحيحة لإكمال الجملة: ذهبَ أحمدُ إلى _____.
أ) المدرسه
ب) المدرسة
ج) المدرسا
د) المدراة

الإجابة: ب) المدرسة

---

4. القرآن الكريم هو كلام الله المعجز المنزل على نبينا محمد ﷺ.
الإجابة: صح

---

5. عاصمة المملكة العربية السعودية هي مدينة _____.
الإجابة: الرياض`;

export const ENGLISH_SAMPLE_TEXT = `1. What is the capital city of Nigeria? [2 marks]
A) Lagos
B) Abuja
C) Kano
D) Port Harcourt

Answer: B) Abuja

---

2. Which of the following are pillars of Islam? [3 marks]
A) Salah
B) Fasting in Ramadan
C) Charity (Zakah)
D) Trading

Answer: A, B, C

---

3. The Prophet Muhammad ﷺ was born in Yathrib (Madinah).
Answer: False

---

4. The Holy Quran was revealed over a period of _____ years.
Answer: 23 | twenty three`;
