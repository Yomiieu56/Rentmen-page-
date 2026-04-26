import React from 'react';
import { motion } from 'motion/react';

interface WaveformVisualizerProps {
  isAnimating: boolean;
  color?: string;
  count?: number;
}

export function WaveformVisualizer({ isAnimating, color = '#F27D26', count = 40 }: WaveformVisualizerProps) {
  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full max-w-sm mx-auto overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={isAnimating ? {
            height: [
              Math.random() * 20 + 4 + 'px',
              Math.random() * 40 + 8 + 'px',
              Math.random() * 10 + 2 + 'px'
            ],
            opacity: [0.4, 1, 0.4]
          } : {
            height: '4px',
            opacity: 0.3
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05
          }}
        />
      ))}
    </div>
  );
}
