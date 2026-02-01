'use client';

import CoreNode from '@/components/CoreNode';
import GlassCard from '@/components/GlassCard';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Globe, 
  Layers, 
  MessageSquare, 
  Shield, 
  Terminal,
  Zap
} from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Ambient Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 right-8 flex justify-between items-center z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter">ASCENDANCY</h1>
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.2em]">Black Box Protocol</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="px-4 py-2 glass-panel rounded-full flex items-center gap-2 text-xs text-white/60">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            SYSTEM ONLINE
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl z-10">
        
        {/* Left Column: Stats */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <GlassCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Metrics</span>
            </div>
            <div className="space-y-4">
              <StatItem label="CPU LOAD" value="12.4%" progress={12.4} />
              <StatItem label="MEMORY" value="482MB" progress={48.2} />
              <StatItem label="LATENCY" value="24ms" progress={15} />
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Network</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-2xl font-mono text-white/90">CONNECTED</div>
              <div className="text-[10px] text-white/40 font-mono">ENCRYPTED END-TO-END</div>
            </div>
          </GlassCard>
        </div>

        {/* Center: Core */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center min-h-[400px]">
          <CoreNode />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 text-center"
          >
            <p className="text-white/40 text-sm font-light tracking-[0.3em] uppercase">Awaiting Command</p>
            <div className="mt-4 flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Console/Chat */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <GlassCard className="h-full flex flex-col">
            <div className="flex items-center gap-2 text-emerald-400 mb-4">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Console</span>
            </div>
            <div className="flex-1 font-mono text-[10px] text-white/50 space-y-2 overflow-y-auto max-h-[300px] pr-2">
              <p className="text-emerald-400/80">&gt; Initializing neural bridge...</p>
              <p>&gt; Syncing with OpenClaw Gateway</p>
              <p>&gt; Authentication verified</p>
              <p>&gt; Loading memory modules...</p>
              <p className="text-blue-400/80">&gt; Welcome back, Ahmad.</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Enter command..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <Zap className="absolute right-3 top-2.5 w-3 h-3 text-white/20" />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Bottom Nav */}
      <motion.nav 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-8 flex gap-4"
      >
        <NavButton icon={<Cpu className="w-4 h-4" />} active />
        <NavButton icon={<MessageSquare className="w-4 h-4" />} />
        <NavButton icon={<Layers className="w-4 h-4" />} />
      </motion.nav>
    </main>
  );
}

function StatItem({ label, value, progress }: { label: string, value: string, progress: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-white/40 tracking-widest">{label}</span>
        <span className="text-xs font-mono text-white/80">{value}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-blue-500/50"
        />
      </div>
    </div>
  );
}

function NavButton({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={`p-4 rounded-2xl transition-all ${active ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'glass-panel text-white/40 hover:text-white/80'}`}>
      {icon}
    </button>
  );
}
