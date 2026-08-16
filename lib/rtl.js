// Detects text direction for mixed Arabic/English content so RTL is applied
// per element rather than the whole page. Uses the first strongly-directional
// character (Unicode bidi classes), which correctly handles content like
// "Surah 2 - البقرة" (starts with Latin -> LTR container, Arabic runs render
// RTL internally via `unicode-bidi: plain-text`).
const RTL_CHAR = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const LTR_CHAR = /[A-Za-z]/;

export function detectDirection(text = '') {
  for (const ch of text) {
    if (RTL_CHAR.test(ch)) return 'rtl';
    if (LTR_CHAR.test(ch)) return 'ltr';
  }
  return 'ltr';
}

// Resolves a question/option's stored textDirection, falling back to
// auto-detection when the teacher left it as AUTO.
export function resolveDirection(storedDirection, text) {
  if (storedDirection === 'RTL') return 'rtl';
  if (storedDirection === 'LTR') return 'ltr';
  return detectDirection(text);
}
