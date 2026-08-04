import { motion } from 'framer-motion';
import { fadeInUp } from '../lib/motion';

/**
 * Route-level entrance. Uses the shared motion vocabulary instead of the
 * inline literal it carried before, so page transitions share one duration and
 * easing curve with everything else in the app.
 */
const PageTransition = ({ children }) => (
  <motion.div
    variants={fadeInUp}
    initial="hidden"
    animate="visible"
    exit={{ opacity: 0, transition: { duration: 0.12 } }}
  >
    {children}
  </motion.div>
);

export default PageTransition;
