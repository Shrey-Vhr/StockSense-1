import { useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Label + control + hint/error, wired together properly.
 *
 * Not one form in the app associated its label with its input — every one used
 * a bare `<label>` with no `htmlFor`, so clicking a label did nothing and
 * screen readers announced the control as unlabelled. None had an error state
 * either; Portfolio used `alert()`.
 *
 * `children` is a render function receiving the props the control must spread,
 * which keeps the id/aria wiring impossible to forget:
 *
 *   <Field label="Quantity" error={err}>
 *     {(p) => <Input type="number" {...p} />}
 *   </Field>
 */
export default function Field({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  const controlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    invalid: Boolean(error),
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-400">
          {label}
          {required && <span className="text-down ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      {typeof children === 'function' ? children(controlProps) : children}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-down">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
