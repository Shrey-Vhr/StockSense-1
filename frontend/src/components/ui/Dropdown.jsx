import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';
import { surfaceIn } from '../../lib/motion';

/**
 * Click-outside menu.
 *
 * There were three hand-rolled versions of this (Screener presets, Screener
 * load, Header notifications), each behaving differently: one used a full-screen
 * transparent div to catch outside clicks, one a mousedown listener, one nothing
 * at all. None closed on Escape and none returned focus to the trigger.
 *
 * `trigger` is a render function receiving the props the trigger must spread,
 * so the aria wiring cannot be forgotten.
 */
export default function Dropdown({
  trigger,
  align = 'right',
  width = 'w-72',
  className,
  children,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((v) => !v),
        'aria-expanded': open,
        'aria-haspopup': 'menu',
      })}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={surfaceIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'absolute top-full mt-2 z-50 overflow-hidden',
              'bg-surface-850 border border-surface-700 rounded-xl shadow-lg',
              align === 'right' ? 'right-0' : 'left-0',
              width,
            )}
          >
            {typeof children === 'function' ? children({ close }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A row inside a Dropdown. Keeps the 3-line-per-item markup in one place. */
export function DropdownItem({ title, description, icon: Icon, onClick, actions, className }) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      className={cn(
        'w-full text-left px-4 py-2.5 cursor-pointer group flex items-start justify-between gap-3',
        'border-b border-surface-800 last:border-0',
        'transition-colors duration-fast hover:bg-surface-800',
        className,
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && <Icon size={14} className="mt-0.5 text-gray-500 shrink-0" aria-hidden="true" />}
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-100 truncate">{title}</div>
          {description && (
            <div className="text-xs text-gray-500 mt-0.5 truncate">{description}</div>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
