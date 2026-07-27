/**
 * lib/motion.js — Shared Framer Motion Variants (Task 2H)
 *
 * Reused wherever a group of cards should fade/slide in staggered on mount,
 * instead of each page redefining its own entrance animation.
 */

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/** Stagger each direct child of a motion container by `stagger` seconds. */
export function staggerContainer(stagger = 0.05) {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };
}
