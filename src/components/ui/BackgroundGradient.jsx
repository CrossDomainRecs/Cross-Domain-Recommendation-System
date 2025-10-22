import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

export const BackgroundGradient = ({
  children,
  className,
  containerClassName,
  animate = true
}) => {
  return (
    <div className={cn("relative p-[2px] group", containerClassName)}>
      {animate && (
        <motion.div
          className="absolute inset-0 rounded-3xl opacity-70 blur-lg group-hover:opacity-100 transition-opacity"
          style={{
            background: "linear-gradient(90deg, #5227FF, #7cff67, #5227FF)"
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
      <div className={cn("relative rounded-3xl", className)}>
        {children}
      </div>
    </div>
  );
};
