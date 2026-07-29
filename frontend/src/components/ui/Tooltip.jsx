import { useState, useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Promoted from the local implementation inside Screener.jsx rather than
 * written fresh — it already worked, it just lived in the wrong file and was
 * mouse-only.
 *
 * Added here: focus/blur so keyboard users can reach it, Escape to dismiss,
 * and `role="tooltip"` + aria-describedby so the text is actually announced.
 * The Screener's indicator descriptions were invisible to anyone not using a
 * mouse.
 */
export default function Tooltip({ text, side = 'top', className, children }) {
  const [show, setShow] = useState(false);
  const id = useId();

  if (!text) return children;

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <span
        tabIndex={0}
        aria-describedby={show ? id : undefined}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onKeyDown={(e) => e.key === 'Escape' && setShow(false)}
        className="inline-flex items-center outline-none"
      >
        {children}
      </span>

      {show && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'absolute z-50 left-1/2 -translate-x-1/2 w-max max-w-xs',
            'px-2.5 py-1.5 rounded-lg pointer-events-none',
            'bg-surface-700 border border-surface-600 shadow-md',
            'text-xs font-normal text-gray-200 normal-case tracking-normal',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <span className="block whitespace-normal">{text}</span>
        </span>
      )}
    </span>
  );
}
