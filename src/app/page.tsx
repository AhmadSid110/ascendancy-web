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
  const [modelHealth, setModelHealth] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  const [activeView, setActiveView] = useState<'council' | 'chat' | 'settings'>('chat');

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

  const performHealthCheck = async () => {
    const results: Record<string, 'online' | 'offline' | 'checking'> = {};
    DEFAULT_COUNCIL.forEach(m => results[m.id] = 'checking');
    setModelHealth({...results});

    for (const member of DEFAULT_COUNCIL) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: "Say 'ok'",
            model: member.model,
            apiKey: apiKey,
          }),
        });
        if (response.ok) {
          results[member.id] = 'online';
        } else {
          results[member.id] = 'offline';
        }
      } catch (e) {
        results[member.id] = 'offline';
      }
      setModelHealth({...results});
    }
  };

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
    setActiveView('chat'); // Switch to chat view on mobile when sending

    try {
      // Step 1: Moderator
      const modResponse = await callLightningAI(`Respond to this query as a Moderator of the Zenith Council: "${userMessage}"`, DEFAULT_COUNCIL[1].model);
      setMessages(prev => [...prev, { role: 'assistant', sender: DEFAULT_COUNCIL[1].name, content: modResponse }]);

      // Step 2: Skeptic
      const skepticResponse = await callLightningAI(`As the Skeptic, challenge the following moderator's stance on "${userMessage}": "${modResponse}"`, DEFAULT_COUNCIL[0].model);
      setMessages(prev => [...prev, { role: 'assistant', sender: DEFAULT_COUNCIL[0].name, content: skepticResponse }]);

      // Step 3: Visionary
      const visionaryResponse = await callLightningAI(`As the Visionary, synthesize a futuristic solution considering the debate between the Moderator and the Skeptic on "${userMessage}". Moderator: "${modResponse}". Skeptic: "${skepticResponse}"`, DEFAULT_COUNCIL[2].model);
      setMessages(prev => [...prev, { role: 'assistant', sender: DEFAULT_COUNCIL[2].name, content: visionaryResponse }]);
      
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
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 overflow-hidden bg-black">
      {/* Background Ambient Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 lg:top-8 left-4 lg:left-8 right-4 lg:right-8 flex justify-between items-center z-50 bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/5 lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:border-none lg:static"
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
        
        <div className="flex gap-2 lg:gap-4">
          <button 
            onClick={performHealthCheck}
            className="hidden lg:flex px-4 py-2 glass-panel rounded-full text-[10px] text-emerald-400 hover:text-emerald-300 transition-all uppercase tracking-widest border border-emerald-500/20"
          >
            Debug
          </button>
          <button 
            onClick={() => { localStorage.removeItem('lightning_api_key'); setIsConfigured(false); }}
            className="px-3 py-2 glass-panel rounded-full text-[10px] text-white/40 hover:text-white/80 transition-all uppercase tracking-widest"
          >
            Reset
          </button>
          <div className="hidden lg:flex px-4 py-2 glass-panel rounded-full items-center gap-2 text-xs text-white/60">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ONLINE
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full max-w-7xl z-10 h-full lg:h-[70vh] mt-24 lg:mt-0">
        
        {/* Left Column: Council Members (Visible on Desktop or when activeView is 'council') */}
        <div className={`${activeView === 'council' ? 'flex' : 'hidden lg:flex'} lg:col-span-3 flex-col gap-6 overflow-hidden h-[60vh] lg:h-full`}>
          <GlassCard className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Council members</span>
              </div>
              <button onClick={performHealthCheck} className="lg:hidden p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Zap className="w-3 h-3 text-blue-400" />
              </button>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {DEFAULT_COUNCIL.map((member) => (
                <div key={member.id} className="p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold ${member.color} tracking-tighter uppercase`}>{member.name}</span>
                    <div className="flex items-center gap-1.5">
                      {modelHealth[member.id] === 'checking' && (
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                      )}
                      {modelHealth[member.id] === 'online' && (
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                      )}
                      {modelHealth[member.id] === 'offline' && (
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      )}
                      <ActivityStatus />
                    </div>
                  </div>
                  <div className="text-[9px] text-white/40 font-mono mb-2 uppercase">{member.role}</div>
                  <div className="text-[8px] text-white/20 truncate font-mono">{member.model}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Center: Core Visualization (Only on Desktop or specific view) */}
        <div className={`${activeView === 'chat' ? 'hidden lg:flex' : 'hidden lg:flex'} lg:col-span-6 flex-col items-center justify-center`}>
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
        </div>

        {/* Right Column: Console/Chat Interface */}
        <div className={`${activeView === 'chat' ? 'flex' : 'hidden lg:flex'} lg:col-span-6 flex flex-col gap-6 overflow-hidden h-[70vh] lg:h-full`}>
          <GlassCard className="h-full flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-emerald-400">
                <Terminal className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Protocol Stream</span>
              </div>
              {isProcessing && (
                <div className="flex gap-1.5 items-center">
                  <span className="text-[8px] text-blue-400 animate-pulse font-mono">PROCESSING TRANSMISSION</span>
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="space-y-4 font-mono text-[10px] text-white/30 p-4 border border-white/5 rounded-xl bg-white/[0.02]">
                  <p className="text-emerald-400/80">&gt; System initialized v1.0.4</p>
                  <p>&gt; Model grid synchronized with Lightning AI</p>
                  <p>&gt; Encryption protocols active</p>
                  <p>&gt; Waiting for mission parameters...</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${
                        msg.role === 'user' ? 'text-white/40' : 
                        msg.sender === DEFAULT_COUNCIL[0].name ? 'text-red-400' :
                        msg.sender === DEFAULT_COUNCIL[1].name ? 'text-blue-400' :
                        'text-emerald-400'
                      }`}>
                        {msg.sender || 'Ahmad'}
                      </span>
                      <div className="flex-1 h-[1px] bg-white/10" />
                      <span className="text-[8px] text-white/10 font-mono">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className={`text-[12px] leading-relaxed text-white/80 whitespace-pre-wrap p-3 rounded-xl ${msg.role === 'user' ? 'bg-white/5 border border-white/5' : 'bg-blue-500/5 border border-blue-500/10'}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="flex-shrink-0 pt-4">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter transmission..."
                  disabled={isProcessing}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-[12px] focus:outline-none focus:border-blue-500/50 transition-all pr-12 disabled:opacity-50 font-mono"
                />
                <button type="submit" disabled={!input.trim() || isProcessing} className="absolute right-2 top-2 bottom-2 px-3 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-white/10 transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 glass-panel p-2 rounded-2xl border border-white/10 z-50 backdrop-blur-xl bg-black/40"
      >
        <button 
          onClick={() => setActiveView('council')}
          className={`p-4 rounded-xl transition-all ${activeView === 'council' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'text-white/40'}`}
        >
          <Layers className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setActiveView('chat')}
          className={`p-4 rounded-xl transition-all ${activeView === 'chat' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'text-white/40'}`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
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
