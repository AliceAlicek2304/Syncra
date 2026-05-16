import { motion, useReducedMotion } from 'framer-motion';

interface PageWrapperProps {
  children: React.ReactNode;
  'data-testid'?: string;
}

const fullVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};

export function PageWrapper({ children, 'data-testid': testId }: PageWrapperProps) {
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced ? reducedVariants : fullVariants;

  return (
    <motion.div
      data-testid={testId ?? 'page-wrapper'}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}
