// Pure grading functions - no DB access - so they're easy to reason about
// and unit test. `question` is a lean Mongoose doc, `answer` is whatever the
// student submitted for that question (shape depends on type).

const AUTO_GRADABLE = ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'FILL_BLANK'];

export function isAutoGradable(type) {
  return AUTO_GRADABLE.includes(type);
}

function normalize(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    // Normalize Arabic alef/ya variants and diacritics so minor typing
    // differences (e.g. أ vs ا) don't fail an otherwise-correct fill-blank.
    .normalize('NFKC')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function arraysEqualUnordered(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sa = [...a].map(String).sort();
  const sb = [...b].map(String).sort();
  return sa.every((v, i) => v === sb[i]);
}

/**
 * Returns { marksAwarded, gradingStatus } for a single answer.
 * Essay/short-answer always come back PENDING_REVIEW - a teacher must grade
 * those before the result can be finalized.
 */
export function gradeAnswer(question, answer) {
  const marks = question.marks;

  switch (question.type) {
    case 'MCQ': {
      const correct = String(question.correctAnswer) === String(answer);
      return { marksAwarded: correct ? marks : 0, gradingStatus: 'AUTO_GRADED' };
    }
    case 'TRUE_FALSE': {
      const correct = String(question.correctAnswer) === String(answer);
      return { marksAwarded: correct ? marks : 0, gradingStatus: 'AUTO_GRADED' };
    }
    case 'MULTI_SELECT': {
      const correct = arraysEqualUnordered(question.correctAnswer || [], answer || []);
      return { marksAwarded: correct ? marks : 0, gradingStatus: 'AUTO_GRADED' };
    }
    case 'FILL_BLANK': {
      const accepted = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      const correct = accepted.some((a) => normalize(a) === normalize(answer));
      return { marksAwarded: correct ? marks : 0, gradingStatus: 'AUTO_GRADED' };
    }
    case 'SHORT_ANSWER':
    case 'ESSAY':
    default:
      return { marksAwarded: null, gradingStatus: 'PENDING_REVIEW' };
  }
}

// Fisher-Yates shuffle seeded off attempt id + salt so re-computation (should
// it ever be needed) is deterministic; in practice we persist the resulting
// order on the attempt so this only runs once, at start time.
export function shuffle(array, seed) {
  const arr = [...array];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}
