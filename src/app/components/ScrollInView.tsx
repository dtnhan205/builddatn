import React, { useEffect, useRef } from 'react';
import './ScrollInView.css';

const ScrollInView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom >= 0;
        console.log("Element in view:", isInView); // Debug log
        if (isInView && !elementRef.current.classList.contains('visible')) {
          elementRef.current.classList.add('visible');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={elementRef} className="scroll-item" style={{ overflow: 'hidden', maxWidth: '100%' }}>
      {children}
    </div>
  );
};

export default ScrollInView;