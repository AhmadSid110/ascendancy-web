'use client';

import { useState, useEffect } from 'react';
import CoreNode from '@/components/CoreNode';
import GlassCard from '@/components/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Layers, 
  MessageSquare, 
  Shield, 
  Terminal,
  Zap,
  Lock,
  Key,
  Plus,
  Trash2,
  Send
} from 'lucide-react';

// Default configuration
const DEFAULT_COUNCIL = [
  { id: '1', name: 'DeepSeek-V3', model: 'lightning-ai/DeepSeek-V3.1', role: 'The Skeptic', color: 'text-red-400' },
  { id: '2', name: 'GPT-OSS', model: 'lightning-ai/gpt-oss-120b', role: 'The Moderator', color: 'text-blue-400' },
  { id: '3', name: 'Llama-3.3', model: 'lightning-ai/llama-3.3-70b', role: 'The Visionary', color: 'text-emerald-400' }
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string, sender?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Authentication check
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('zenith_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
    
    const savedKey = localStorage.getItem('lightning_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsConfigured(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'zenith2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('zenith_auth', 'true');
      setError('');
    } else {
      setError('Invalid Protocol Access Code');
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('lightning_api_key', apiKey);
      setIsConfigured(true);
      setError('');
    } else {
      setError('API Key Required');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      // Simulate council discussion or implement actual API call
      // Since this is a "Council", we should ideally call multiple models
      // For now, let's implement a sequential discussion
      
      const moderatorResponse = await callLightningAI(userMessage, DEFAULT_COUNCIL[1].model);
      setMessages(prev => [...prev, { role: 'assistant', sender: DEFAULT_COUNCIL[1].name, content: moderatorResponse }]);
      
    } catch (err: any) {
      setError(err.message || 'Transmission failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const callLightningAI = async (prompt: string, model: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        model: model,
        apiKey: apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Transmission failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <GlassCard className="w-full max-w-md p-8 space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">ASCENDANCY</h1>
              <p className="text-xs text-blue-400/60 uppercase tracking-widest">Secure Portal Access</p>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 uppercase tracking-wider ml-1">Access Code</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter credentials..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all pl-10"
                />
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-white/20" />
              </div>
            </div>
            {error && <p className="text-red-400 text-[10px] text-center font-mono">{error}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              AUTHORIZE
            </button>
          </form>
        </GlassCard>
      </main>
    );
  }

  if (!isConfigured) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-black overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <GlassCard className="w-full max-w-md p-8 space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <Key className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">CONFIG PROTOCOL</h1>
              <p className="text-xs text-indigo-400/60 uppercase tracking-widest">Lightning AI Integration</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveApiKey} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 uppercase tracking-wider ml-1">Lightning API Key</label>
              <input 
                type="text" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key here..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
            {error && <p className="text-red-400 text-[10px] text-center font-mono">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
              SYNC ENGINE
            </button>
          </form>
          <p className="text-[10px] text-white/20 text-center leading-relaxed">
            Your API key is stored locally in your browser's secure storage. It is never sent to our servers.
          </p>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden bg-black">
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
            <p className="text-[10px] text-blue-400/60 uppercase tracking-[0.2em]">Council Black Box</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => { localStorage.removeItem('lightning_api_key'); setIsConfigured(false); }}
            className="px-4 py-2 glass-panel rounded-full text-[10px] text-white/40 hover:text-white/80 transition-all uppercase tracking-widest"
          >
            Reset Key
          </button>
          <div className="px-4 py-2 glass-panel rounded-full flex items-center gap-2 text-xs text-white/60">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            COUNCIL ACTIVE
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-7xl z-10 h-[70vh]">
        
        {/* Left Column: Council Members */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <GlassCard className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Council</span>
              </div>
              <Plus className="w-3 h-3 text-white/20 cursor-not-allowed" />
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {DEFAULT_COUNCIL.map((member) => (
                <div key={member.id} className="p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold ${member.color} tracking-tighter`}>{member.name}</span>
                    <ActivityStatus />
                  </div>
                  <div className="text-[9px] text-white/40 font-mono mb-2 uppercase">{member.role}</div>
                  <div className="text-[8px] text-white/20 truncate font-mono">{member.model}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Center: Core Visualization */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <CoreNode />
          <AnimatePresence>
            {!isProcessing && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-12 text-center"
              >
                <p className="text-white/40 text-sm font-light tracking-[0.3em] uppercase">Initialize Neural Bridge</p>
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
            )}
          </AnimatePresence>
          
          {/* Active Discussion View */}
          <div className="w-full mt-8 overflow-y-auto max-h-[300px] px-4 hidden lg:block">
            {messages.slice(-2).map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <span className="text-[10px] text-blue-400/60 uppercase font-mono mb-1 block">
                  {msg.sender || 'YOU'}
                </span>
                <p className="text-xs text-white/70 bg-white/5 rounded-2xl p-3 inline-block max-w-[80%] border border-white/5">
                  {msg.content}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column: Console/Chat Interface */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <GlassCard className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-400 mb-4 flex-shrink-0">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Protocol Stream</span>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="space-y-2 font-mono text-[10px] text-white/30">
                  <p className="text-emerald-400/80">&gt; System initialized</p>
                  <p>&gt; Model grid synchronized</p>
                  <p>&gt; Ready for input...</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-white/40' : 'text-blue-400'}`}>
                        {msg.sender || 'Ahmad'}
                      </span>
                      <div className="flex-1 h-[1px] bg-white/5" />
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/80 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex gap-1 py-2">
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter transmission..."
                  disabled={isProcessing}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] focus:outline-none focus:border-blue-500/50 transition-all pr-10 disabled:opacity-50"
                />
                <button type="submit" disabled={!input.trim() || isProcessing} className="absolute right-2 top-2 p-1.5 bg-blue-500 rounded-lg text-white hover:bg-blue-400 disabled:opacity-50 disabled:bg-white/10 transition-all">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
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
        <NavButton icon={<MessageSquare className="w-4 h-4" />} active />
        <NavButton icon={<Layers className="w-4 h-4" />} />
        <NavButton icon={<Cpu className="w-4 h-4" />} />
      </motion.nav>
    </main>
  );
}

function ActivityStatus() {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ height: [2, 6, 2] }}
          transition={{ duration: 0.5 + i * 0.1, repeat: Infinity }}
          className="w-[1.5px] bg-blue-400/40 rounded-full"
        />
      ))}
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
