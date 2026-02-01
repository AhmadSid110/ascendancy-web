'use client';

import { motion } from 'framer-motion';

export default function CoreNode() {
  return (
    <div className="relative flex items-center justify-center scale-75 lg:scale-100">
      {/* Hyper-ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"
      />
      
      {/* Outer Orbitals */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            rotate: i % 2 === 0 ? 360 : -360,
          }}
          transition={{
            duration: 15 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            width: `${240 + i * 40}px`,
            height: `${240 + i * 40}px`,
          }}
          className="absolute border border-blue-400/10 rounded-full border-dashed"
        />
      ))}

      {/* Logic Gates Rings */}
      <motion.div
        animate={{
          rotate: -360,
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute w-56 h-56 border-2 border-blue-500/20 rounded-full border-t-transparent border-b-transparent"
      />
      
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute w-48 h-48 border-2 border-indigo-500/20 rounded-full border-l-transparent border-r-transparent"
      />

      {/* The Central Singularity */}
      <div className="relative flex items-center justify-center">
        {/* Main Pulse Sphere */}
        <motion.div
          animate={{
            scale: [0.9, 1.1, 0.9],
            boxShadow: [
              "0 0 20px rgba(59,130,246,0.3)",
              "0 0 60px rgba(59,130,246,0.6)",
              "0 0 20px rgba(59,130,246,0.3)"
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-32 h-32 rounded-full flex items-center justify-center z-10 overflow-hidden"
        >
          {/* Glass Face */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 backdrop-blur-sm border border-white/20 rounded-full" />
          
          {/* Inner Energy Core */}
          <motion.div
            animate={{
              rotate: [0, 180, 360],
              borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "30% 60% 30% 70% / 50% 60% 30% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 blur-[2px] opacity-80"
          />

          <span className="absolute text-white font-black text-xs tracking-[0.5em] z-20 mix-blend-overlay opacity-80">ZENITH</span>
        </motion.div>

        {/* Floating Data Bits */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -40, 0],
              x: [0, (i % 2 === 0 ? 20 : -20), 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            className="absolute w-1 h-1 bg-blue-300 rounded-full blur-[1px]"
            style={{
              top: `${Math.sin(i) * 60}px`,
              left: `${Math.cos(i) * 60}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
