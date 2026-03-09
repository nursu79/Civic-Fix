'use client';

import { forwardRef, HTMLAttributes, useRef } from 'react';
import { motion, HTMLMotionProps, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: React.ReactNode;
  variant?: 'glass' | 'solid' | 'outline';
  hover?: boolean;
  glow?: boolean;
  tilt?: boolean;
  accentColor?: 'emerald' | 'cyan' | 'teal' | 'white';
  sectionVariant?: 'light' | 'dark';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', hover = true, glow = false, tilt = true, accentColor = 'white', sectionVariant = 'dark', children, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    
    // 3D Tilt Logic
    const xMo = useMotionValue(0);
    const yMo = useMotionValue(0);

    const xSpring = useSpring(xMo);
    const ySpring = useSpring(yMo);

    const rotateXValue = useTransform(ySpring, [-0.5, 0.5], ['10deg', '-10deg']);
    const rotateYValue = useTransform(xSpring, [-0.5, 0.5], ['-10deg', '10deg']);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const mX = e.clientX - rect.left;
      const mY = e.clientY - rect.top;
      
      const xPct = mX / rect.width - 0.5;
      const yPct = mY / rect.height - 0.5;
      
      xMo.set(xPct);
      yMo.set(yPct);
      mouseX.set(mX);
      mouseY.set(mY);
    };

    const handleMouseLeave = () => {
      xMo.set(0);
      yMo.set(0);
    };

    const shineBg = useTransform(
      [mouseX, mouseY],
      ([lX, lY]) => `radial-gradient(circle at ${lX}px ${lY}px, rgba(20, 184, 166, 0.1) 0%, transparent 80%)`
    );

    return (
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: (tilt ? rotateXValue : 0) as any,
          rotateY: (tilt ? rotateYValue : 0) as any,
          transformStyle: 'preserve-3d',
        } as any}
        className={cn(
          'relative overflow-hidden rounded-[2rem] p-10 transition-all duration-500 ease-out',
          variant === 'glass' && 'bg-white border border-zinc-100 shadow-sm',
          variant === 'solid' && 'bg-zinc-50 border border-zinc-100',
          hover && 'hover:-translate-y-2 hover:shadow-xl hover:shadow-black/5 hover:border-teal-primary/30',
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={hover ? { scale: 1.02 } : undefined}
        viewport={{ once: true }}
        transition={{ 
          type: 'spring', 
          duration: 0.8,
          bounce: 0.2
        }}
        {...props}
      >
        <div className="relative z-10">
          {children as React.ReactNode}
        </div>
      </motion.div>
    );

  }
);

Card.displayName = 'Card';

// Card Header
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-2 pb-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

// Card Title
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-bold tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

// Card Description
export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-text-secondary font-light leading-relaxed', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

// Card Content & Footer maintained for compatibility
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative z-10', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center pt-8 border-t border-zinc-100 mt-8 relative z-10', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';
