/**
 * Conditional className joiner.
 *
 * Hand-written rather than pulling in `clsx` — it is fourteen lines and this
 * project takes no new runtime dependencies.
 *
 * There is deliberately no `tailwind-merge` equivalent. Component variants are
 * built from explicit, non-overlapping maps, so two conflicting utilities never
 * end up on the same element from inside a component. The contract for callers
 * is therefore:
 *
 *   `className` is for ADDITIVE utilities — layout, width, margin
 *   (`w-full`, `mt-4`, `col-span-2`) — not for overriding a variant's padding
 *   or colour. If you find yourself needing an override, the component is
 *   missing a variant; add one there instead.
 *
 * @param  {...(string|false|null|undefined|string[]|Record<string,boolean>)} args
 * @returns {string}
 */
export function cn(...args) {
  const out = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') {
      out.push(arg);
    } else if (Array.isArray(arg)) {
      const nested = cn(...arg);
      if (nested) out.push(nested);
    } else if (typeof arg === 'object') {
      for (const key in arg) if (arg[key]) out.push(key);
    }
  }
  return out.join(' ');
}

export default cn;
