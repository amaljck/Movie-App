import { motion, useReducedMotion } from 'framer-motion';
import { easings } from '../../animations/variants';

export default function LoadingScreen() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="auth-loading-screen"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.35, ease: easings.smooth } }}
    >
      <div className={`loading-mark${reducedMotion ? ' reduced-motion' : ''}`}>
        <span>C</span>
      </div>
      <motion.p
        className="loading-label"
        animate={reducedMotion ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        Loading<span className="loading-dots">...</span>
      </motion.p>
    </motion.div>
  );
}
