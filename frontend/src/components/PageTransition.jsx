import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const PageTransition = ({ children }) => {
  const [isInitial, setIsInitial] = useState(
    !sessionStorage.getItem('app_loaded')
  );

  useEffect(() => {
    if (isInitial) {
      sessionStorage.setItem('app_loaded', 'true');
    }
  }, []);

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: isInitial ? 20 : 12 
      }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ 
        duration: isInitial ? 0.5 : 0.25,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
