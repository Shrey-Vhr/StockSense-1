import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { surfaceIn, overlay } from '../../lib/motion';
import Button from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Accessible dialog.
 *
 * The app had three hand-rolled modals (Screener save, StockDetail alert,
 * CommandPalette). Between them: no focus trap, no aria-modal, no scroll lock,
 * no focus restore, and only CommandPalette handled Escape. Tabbing inside any
 * of them walked straight out into the page behind.
 *
 * Rendered through a portal so it escapes the `overflow-hidden` on the layout
 * shell, which is what forced the previous ones to use z-index escalation.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  children,
  className,
}) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement;

    // Scroll lock. Compensating for the scrollbar keeps the page behind from
    // shifting sideways as the dialog opens.
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
      target?.focus?.();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
        >
          <motion.div
            variants={overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeOnBackdrop ? onClose : undefined}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            variants={surfaceIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative w-full bg-surface-900 border border-surface-700',
              'rounded-2xl shadow-overlay outline-none',
              WIDTHS[size],
              className,
            )}
          >
            {(title || onClose) && (
              <div className="flex items-start justify-between gap-4 p-5 pb-0">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-base font-semibold text-gray-100">{title}</h2>
                  )}
                  {description && (
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                  )}
                </div>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={X}
                    aria-label="Close dialog"
                    onClick={onClose}
                    className="-mr-1 -mt-1"
                  />
                )}
              </div>
            )}

            <div className="p-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 px-5 pb-5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
