import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import './Dock.css';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  // ✅ FIX: Safer mouse distance calculation
  const mouseDistance = useTransform(mouseX, (val) => {
    if (!ref.current || val === Infinity) return distance;
    
    const rect = ref.current.getBoundingClientRect();
    const itemCenter = rect.x + rect.width / 2;
    return val - itemCenter;
  });

  // ✅ FIX: Clamped size transform to prevent overshooting
  const targetSize = useTransform(
    mouseDistance,
    [-distance * 2, -distance, 0, distance, distance * 2],
    [baseItemSize, baseItemSize, magnification, baseItemSize, baseItemSize]
  );

  // ✅ FIX: Optimized spring with better damping
  const size = useSpring(targetSize, {
    ...spring,
    restDelta: 0.001,
    restSpeed: 0.01
  });

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-label="Dock item"
    >
      {Children.map(children, child => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = isHovered?.on?.('change', (latest) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      if (latest === 1) {
        // Show immediately on hover
        setIsVisible(true);
      } else {
        // Hide with small delay to prevent flicker
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 150);
      }
    });
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribe?.();
    };
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.9 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`dock-label ${className}`}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { 
    mass: 0.1, 
    stiffness: 170,
    damping: 18,        // ✅ Increased damping to reduce oscillation
    restDelta: 0.001,
    restSpeed: 0.01
  },
  magnification = 70,
  distance = 150,       // ✅ Reduced distance for smoother effect
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  // ✅ FIX: Throttled mouse movement with RAF
  const rafIdRef = useRef(null);
  
  const handleMouseMove = (e) => {
    if (rafIdRef.current) return;
    
    rafIdRef.current = requestAnimationFrame(() => {
      isHovered.set(1);
      mouseX.set(e.pageX);
      rafIdRef.current = null;
    });
  };

  const handleMouseLeave = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isHovered.set(0);
    mouseX.set(Infinity);
  };

  return (
    <motion.div 
      style={{ height }} 
      className="dock-outer"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={item.label || index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}