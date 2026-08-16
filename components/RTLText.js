import { resolveDirection } from '@/lib/rtl';

// Renders text with the correct direction per element, not the whole page.
// `direction` is the teacher-set value (LTR/RTL/AUTO); when AUTO, we detect
// from content so mixed Arabic/English strings still render sensibly.
export default function RTLText({ text, direction = 'AUTO', as: Tag = 'span', className = '' }) {
  const dir = resolveDirection(direction, text);
  return (
    <Tag dir={dir} className={`bidi-auto ${dir === 'rtl' ? 'rtl-text' : 'ltr-text'} ${className}`}>
      {text}
    </Tag>
  );
}
