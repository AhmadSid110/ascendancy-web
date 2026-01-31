'use client';

import { motion } from 'framer-motion';

export default function CoreNode() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"
      />
      
      {/* Middle Ring */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute w-48 h-48 border border-blue-400/30 rounded-full border-dashed"
      />

      {/* Inner Pulse */}
      <motion.div
        animate={{
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full shadow-[0_0_50px_rgba(59,130,246,0.5)] flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]" />
        <span className="text-white font-bold text-xl tracking-widest z-10">CORE</span>
      </motion.div>
    </div>
  );
}
