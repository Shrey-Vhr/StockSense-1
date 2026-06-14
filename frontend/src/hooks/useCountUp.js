import { useEffect, useState, useRef } from 'react';

const useCountUp = (
  end, 
  duration = 1000, 
  decimals = 0,
  start = 0
) => {
  const [count, setCount] = useState(start);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!end && end !== 0) return;
    
    const startVal = start;
    const endVal = parseFloat(end);
    
    if (isNaN(endVal)) return;

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const progress = Math.min(
        (timestamp - startTimeRef.current) / duration,
        1
      );
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * eased;
      
      setCount(
        decimals > 0 
          ? parseFloat(current.toFixed(decimals))
          : Math.floor(current)
      );
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, decimals]);

  return count;
};

export default useCountUp;
