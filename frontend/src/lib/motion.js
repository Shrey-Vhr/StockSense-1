/**
 * Shared framer-motion vocabulary.
 *
 * The codebase had zero `variants` — all 36 motion elements carried inline
 * literals, with durations spread across 0.15 / 0.3 / 0.5 / 0.6 / 1.5s and no
 * shared easing. These are the same three durations and one curve defined in
 * tokens.css, expressed in seconds for framer.
 *
 * Keep this list short. A variant earns its place by being used on at least
 * three surfaces; anything more specific belongs inline at the call site.
 */

/** Matches --dur-fast / --dur-base / --dur-slow in tokens.css */
export const DUR = { fast: 0.12, base: 0.18, slow: 0.26 };

/** Matches --ease-out in tokens.css */
export const EASE_OUT = [0.16, 1, 0.3, 1];

const transition = { duration: DUR.base, ease: EASE_OUT };

/** Panels, cards and page sections settling into place. */
export const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition },
};

/** Parent of a list whose children should arrive in sequence. */
export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
};

/** Child of `stagger` — rows, nav items, result entries. */
export const listItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Modal and popover surfaces. Paired with `overlay` for the scrim. */
export const surfaceIn = {
  hidden: { opacity: 0, scale: 0.98, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DUR.fast } },
};

export const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.fast } },
  exit: { opacity: 0, transition: { duration: DUR.fast } },
};
