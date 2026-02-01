'use client';

import { useState, useEffect, useRef } from 'react';
import { account, databases, DB_ID, CHAT_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Shield, 
  Zap,
  Lock,
  Plus,
  Trash2,
  Send,
  Sun,
  Moon,
  Menu,
  ChevronLeft,
  Users,
  Settings,
  AlertTriangle,
  Terminal,
  Maximize,
  Minimize
} from 'lucide-react';

const DEFAULT_COUNCIL = [
  { id: '1', name: 'DeepSeek V3.1', model: 'lightning-ai/DeepSeek-V3.1', role: 'The Skeptic', color: 'text-red-500' },
  { id: '2', name: 'GPT-OSS 120B', model: 'lightning-ai/gpt-oss-120b', role: 'The Moderator', color: 'text-blue-500', thinking: true },
  { id: '3', name: 'Llama 3.3', model: 'lightning-ai/llama-3.3-70b', role: 'The Visionary', color: 'text-emerald-500' }
];

export default function Home() {
  // Theme & UI Scale
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [uiScale, setUiScale] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  
  const [council, setCouncil] = useState<any[]>(DEFAULT_COUNCIL);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Config Form
  const [lightningKey, setLightningKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<{ role: string, content: string, sender?: string, reasoning?: string, debugInfo?: any }[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // New Model Form State
  const [newModelName, setNewModelName] = useState('');
  const [newModelPath, setNewModelPath] = useState('');
  const [newModelRole, setNewModelRole] = useState('Advisor');
  const [newModelProvider, setNewModelProvider] = useState('lightning'); // 'lightning' | 'openai'

  // Settings UI State
  const [showSettings, setShowSettings] = useState(false);

  const [councilMode, setCouncilMode] = useState<'debate' | 'solo'>('debate');
  const [showReasoning, setShowReasoning] = useState(true);
  const [activeModel, setActiveModel] = useState<string>(DEFAULT_COUNCIL[1].model); 

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load Council & Auth
  useEffect(() => {
    const savedCouncil = localStorage.getItem('zenith_council');
    if (savedCouncil) {
      try { setCouncil(JSON.parse(savedCouncil)); } catch (e) { setCouncil(DEFAULT_COUNCIL); }
    }
    
    // Load persisted settings
    const savedScale = localStorage.getItem('zenith_scale');
    if (savedScale) setUiScale(parseFloat(savedScale));
    const savedDebug = localStorage.getItem('zenith_debug');
    if (savedDebug) setDebugMode(savedDebug === 'true');

    const checkSession = async () => {
      try {
        const session = await account.get();
        setUser(session);
        setIsAuthenticated(true);
        loadChatHistory(session.$id);
        checkConfig(session.$id);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkSession();
  }, []);

  const checkConfig = async (userId: string) => {
      const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
      const collId = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
      try {
        const secrets = await databases.listDocuments(dbId, collId, [Query.equal('userId', userId), Query.limit(10)]);
        const hasLightning = secrets.documents.some(d => d.keyName === 'lightning_api_key');
        const hasOpenAI = secrets.documents.some(d => d.keyName === 'openai_api_key');
        
        if (hasLightning || hasOpenAI) setIsConfigured(true);
        
        // Pre-fill keys if found
        const lKey = secrets.documents.find(d => d.keyName === 'lightning_api_key');
        if (lKey) setLightningKey(lKey.keyValue);
        const oKey = secrets.documents.find(d => d.keyName === 'openai_api_key');
        if (oKey) setOpenaiKey(oKey.keyValue);

      } catch (e) {
        console.error("Config check failed", e);
      }
  };

  const loadChatHistory = async (userId: string) => {
    if (!DB_ID || !CHAT_COLLECTION_ID) return;
    try {
      const response = await databases.listDocuments(
        DB_ID, CHAT_COLLECTION_ID,
        [Query.equal('userId', userId), Query.orderAsc('$createdAt'), Query.limit(100)]
      );
      setMessages(response.documents.map(doc => ({
        role: doc.role,
        content: doc.content,
        sender: doc.sender
      })));
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      if (email && password) await account.createEmailPasswordSession(email, password);
      else await account.createAnonymousSession();
      const session = await account.get();
      setUser(session);
      setIsAuthenticated(true);
      loadChatHistory(session.$id);
      checkConfig(session.$id);
    } catch (err: any) { setError(err.message); } 
    finally { setIsProcessing(false); }
  };

  const saveKey = async (keyName: string, keyValue: string) => {
      if (!user) return;
      const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
      const collId = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
      
      // Check if exists
      const existing = await databases.listDocuments(dbId, collId, [Query.equal('userId', user.$id), Query.equal('keyName', keyName)]);
      if (existing.total > 0) {
          if (keyValue) {
             await databases.updateDocument(dbId, collId, existing.documents[0].$id, { keyValue });
          } else {
             // Optional: delete if empty? No, keep it simple.
          }
      } else if (keyValue) {
          await databases.createDocument(dbId, collId, ID.unique(), { userId: user.$id, keyName, keyValue });
      }
  };

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        await saveKey('lightning_api_key', lightningKey);
        await saveKey('openai_api_key', openaiKey);
        setIsConfigured(true);
        setShowSettings(false); // Close settings if open
    } catch (err: any) { setError(err.message); }
    finally { setIsProcessing(false); }
  };

  const callAI = async (prompt: string, model: string, mode: 'debate' | 'solo', historyMessages?: any[]) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        mode,
        messages: historyMessages,
        debug: debugMode
      }),
    });
    
    const contentType = response.headers.get("content-type");
    if (!response.ok) {
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API Request Failed');
        } else {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} - ${text}`);
        }
    }
    return await response.json();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsProcessing(true);
    setError('');

    try {
      if (councilMode === 'solo') {
        const result = await callAI(userMessage, activeModel, 'solo', newMessages);
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.content, 
            sender: council.find(m => m.model === activeModel)?.name || 'AI',
            debugInfo: result.debug
        }]);
      } else {
        const result = await callAI(userMessage, activeModel, 'debate');
        const { debate, content, debug } = result;
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: content, 
            sender: 'Council',
            reasoning: `Moderator: ${debate.moderator}\n\nSkeptic: ${debate.skeptic}`,
            debugInfo: debug
        }]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send message');
      setMessages(prev => [...prev, { 
          role: 'system', 
          content: `Error: ${err.message}`, 
          sender: 'System' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const addModel = () => {
    if (!newModelName || !newModelPath) return;
    
    // Auto-prefix if needed based on provider
    let finalPath = newModelPath;
    if (newModelProvider === 'lightning' && !finalPath.startsWith('lightning-ai/')) {
        finalPath = `lightning-ai/${finalPath}`;
    }
    // OpenAI usually doesn't need prefix for standard models, but our backend handles it if it's "gpt-..."
    
    const newModel = {
      id: ID.unique(),
      name: newModelName,
      model: finalPath,
      role: newModelRole,
      color: 'text-purple-500'
    };
    const updated = [...council, newModel];
    setCouncil(updated);
    localStorage.setItem('zenith_council', JSON.stringify(updated));
    setNewModelName('');
    setNewModelPath('');
  };

  const deleteModel = (id: string) => {
    const updated = council.filter(m => m.id !== id);
    setCouncil(updated);
    localStorage.setItem('zenith_council', JSON.stringify(updated));
  };

  const updateUiScale = (val: number) => {
      setUiScale(val);
      localStorage.setItem('zenith_scale', val.toString());
  };
  
  const toggleDebug = () => {
      const newVal = !debugMode;
      setDebugMode(newVal);
      localStorage.setItem('zenith_debug', newVal.toString());
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] transition-colors duration-300">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center border border-[var(--accent)]/20">
              <Shield className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ascendancy</h1>
            <p className="text-sm text-[var(--text-muted)]">Secure Access Portal</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full px-4 py-3 rounded-xl text-sm"
            />
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="w-full px-4 py-3 rounded-xl text-sm"
            />
            <div className="flex justify-between items-center text-xs text-[var(--text-muted)] px-1">
                <Link href="/forgot-password" className="hover:text-[var(--foreground)] transition-colors">
                    Forgot Password?
                </Link>
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button type="submit" disabled={isProcessing} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white py-3 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2">
              {isProcessing ? <Zap className="w-4 h-4 animate-spin" /> : 'Enter System'}
            </button>
            <button type="button" onClick={() => handleLogin({ preventDefault: () => {} } as any)} className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]">
              Continue Anonymously
            </button>
            <div className="text-center text-xs text-[var(--text-muted)] mt-4">
                Don't have an account? {' '}
                <Link href="/signup" className="text-[var(--accent)] font-semibold hover:underline">
                    Sign Up
                </Link>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // Config Screen (Initial)
  if (!isConfigured) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] transition-colors duration-300">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 mb-8">
            <Lock className="w-12 h-12 text-[var(--accent)]" />
            <h1 className="text-xl font-bold">System Initialization</h1>
            <p className="text-sm text-[var(--text-muted)] text-center">Configure at least one AI provider to continue.</p>
          </div>
          <form onSubmit={handleSaveApiKeys} className="space-y-4">
            <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Lightning AI API Key</label>
                <input 
                  type="password" value={lightningKey} onChange={(e) => setLightningKey(e.target.value)}
                  placeholder="sk-..." className="w-full px-4 py-3 rounded-xl font-mono text-sm border border-[var(--card-border)] bg-[var(--background)]"
                />
            </div>
            <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 block">OpenAI API Key</label>
                <input 
                  type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..." className="w-full px-4 py-3 rounded-xl font-mono text-sm border border-[var(--card-border)] bg-[var(--background)]"
                />
            </div>
            
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button type="submit" className="w-full bg-[var(--accent)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--accent)]/90 transition-all">
              Initialize System
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Main App
  return (
    <div 
        className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 font-sans"
        style={{ fontSize: `${uiScale * 100}%` }}
    >
      
      {/* Sidebar - Collapsible */}
      <motion.aside 
        initial={{ width: 280 }}
        animate={{ width: sidebarOpen ? 280 : 0 }}
        className="flex-shrink-0 border-r border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden flex flex-col z-20"
      >
        <div className="p-6 flex items-center gap-3 border-b border-[var(--card-border)]">
          <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
             <Shield className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <span className="font-bold tracking-tight text-lg">Ascendancy</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Council Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Council</h3>
              <button onClick={() => setCouncilMode(m => m === 'debate' ? 'solo' : 'debate')} className={`text-[10px] px-2 py-0.5 rounded-full border ${councilMode === 'debate' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--card-border)] text-[var(--text-muted)]'}`}>
                {councilMode === 'debate' ? 'DEBATE' : 'SOLO'}
              </button>
            </div>
            <div className="space-y-2">
              {council.map(member => (
                <div 
                  key={member.id} 
                  onClick={() => setActiveModel(member.model)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    activeModel === member.model && councilMode === 'solo' 
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                    : 'border-[var(--card-border)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{member.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteModel(member.id); }} className="text-[var(--text-muted)] hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{member.model}</div>
                </div>
              ))}
            </div>
            
            {/* Add Model */}
            <div className="mt-4 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-border)]/50 space-y-2">
              <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">Add New Model</h4>
              
              <select 
                value={newModelProvider}
                onChange={e => setNewModelProvider(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-[var(--accent)] mb-2"
              >
                  <option value="lightning">Lightning AI</option>
                  <option value="openai">OpenAI</option>
              </select>

              <input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="Display Name (e.g. GPT-4)" className="w-full bg-transparent border-b border-[var(--card-border)] p-1 text-xs focus:ring-0 mb-2" />
              <input value={newModelPath} onChange={e => setNewModelPath(e.target.value)} placeholder={newModelProvider === 'openai' ? 'Model ID (e.g. gpt-4)' : 'Model ID (e.g. llama-3.1)'} className="w-full bg-transparent border-b border-[var(--card-border)] p-1 text-xs focus:ring-0 text-[var(--text-muted)]" />
              
              <p className="text-[10px] text-[var(--text-muted)] italic">
                  {newModelProvider === 'openai' ? 'Requires OpenAI API Key.' : 'Requires Lightning AI API Key.'}
              </p>

              <button onClick={addModel} disabled={!newModelName || !newModelPath} className="w-full flex items-center justify-center gap-1 text-xs font-medium text-[var(--accent)] pt-2 border-t border-[var(--card-border)] mt-2 hover:bg-[var(--accent)]/10 rounded">
                <Plus className="w-3 h-3" /> Add Member
              </button>
            </div>
          </div>

          {/* Settings Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 px-2">Settings</h3>
            <div className="space-y-2">
              <button onClick={() => setShowReasoning(!showReasoning)} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors hover:bg-[var(--card-border)] ${showReasoning ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}>
                <span>Show Reasoning</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${showReasoning ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showReasoning ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </button>
              
              {/* Debug Mode Toggle */}
              <button onClick={toggleDebug} className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors hover:bg-[var(--card-border)] ${debugMode ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}>
                <span className="flex items-center gap-2"><Terminal className="w-3 h-3" /> Debug Mode</span>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${debugMode ? 'bg-[var(--accent)]' : 'bg-[var(--card-border)]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${debugMode ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </button>

              {/* UI Scale */}
              <div className="p-2">
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                      <span>UI Scale</span>
                      <span>{Math.round(uiScale * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0.8" max="1.2" step="0.05" 
                    value={uiScale} onChange={e => updateUiScale(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent)] h-1 bg-[var(--card-border)] rounded-lg appearance-none cursor-pointer"
                  />
              </div>

              {/* API Keys */}
              <button onClick={() => setShowSettings(!showSettings)} className="w-full text-left p-2 text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                 <Settings className="w-3 h-3" /> Manage API Keys
              </button>

              {showSettings && (
                  <div className="p-3 bg-[var(--card-border)]/50 rounded-xl space-y-3 mt-2 animate-in slide-in-from-top-2">
                      <div>
                        <label className="text-[10px] uppercase text-[var(--text-muted)]">Lightning AI Key</label>
                        <input type="password" value={lightningKey} onChange={e => setLightningKey(e.target.value)} className="w-full bg-[var(--background)] rounded p-1 text-xs border border-[var(--card-border)]" placeholder="sk-..." />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-[var(--text-muted)]">OpenAI Key</label>
                        <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} className="w-full bg-[var(--background)] rounded p-1 text-xs border border-[var(--card-border)]" placeholder="sk-..." />
                      </div>
                      <button onClick={handleSaveApiKeys} className="w-full bg-[var(--accent)] text-white text-xs py-1.5 rounded hover:bg-[var(--accent)]/90">Save Keys</button>
                  </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium truncate">{user?.name || 'Anonymous'}</p>
               <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
             </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--card-border)] bg-[var(--background)]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[var(--card-border)] rounded-lg transition-colors">
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-lg font-semibold tracking-tight">
              {councilMode === 'debate' ? 'Council Debate' : 'Direct Uplink'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 hover:bg-[var(--card-border)] rounded-lg transition-colors">
               {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="max-w-4xl mx-auto w-full space-y-8 pb-4">
             {messages.length === 0 && (
               <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-50">
                 <div className="w-16 h-16 rounded-3xl bg-[var(--card-border)] flex items-center justify-center">
                   <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
                 </div>
                 <p className="text-lg font-medium">System Ready</p>
                 <p className="text-sm text-[var(--text-muted)] max-w-xs">
                   Select a mode from the sidebar and begin transmission.
                 </p>
               </div>
             )}
             
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.role !== 'user' && (
                   <div className="w-8 h-8 rounded-full bg-[var(--card-border)] flex items-center justify-center flex-shrink-0 mt-1">
                     <Users className="w-4 h-4 text-[var(--accent)]" />
                   </div>
                 )}
                 <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                   <div className={`flex items-baseline gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                     <span className="text-xs font-bold uppercase tracking-wider opacity-50">{msg.sender || (msg.role === 'user' ? 'You' : 'Assistant')}</span>
                   </div>
                   
                   <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                     msg.role === 'user' 
                     ? 'bg-[var(--accent)] text-white' 
                     : msg.role === 'system'
                     ? 'bg-red-500/10 border border-red-500/50 text-red-500'
                     : 'bg-[var(--card-bg)] border border-[var(--card-border)]'
                   }`}>
                     {msg.reasoning && showReasoning && (
                       <div className="mb-4 p-3 bg-black/10 rounded-lg text-xs font-mono opacity-70 border-l-2 border-[var(--accent)]">
                         <div className="font-bold mb-1 opacity-50 uppercase tracking-widest text-[10px]">Processing Log</div>
                         {msg.reasoning}
                       </div>
                     )}
                     {msg.content}
                     
                     {/* Debug Info */}
                     {debugMode && msg.debugInfo && (
                         <div className="mt-2 pt-2 border-t border-[var(--card-border)] text-[10px] font-mono opacity-50">
                             DEBUG: {JSON.stringify(msg.debugInfo)}
                         </div>
                     )}
                   </div>
                 </div>
               </div>
             ))}
             {isProcessing && (
               <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--card-border)] flex items-center justify-center flex-shrink-0">
                     <Zap className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce delay-200" />
                  </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[var(--background)]/80 backdrop-blur-md border-t border-[var(--card-border)]">
          <div className="max-w-4xl mx-auto w-full relative">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message..."
                className="w-full pl-5 pr-14 py-4 rounded-2xl shadow-sm transition-all focus:ring-2 focus:ring-[var(--accent)]/20"
                disabled={isProcessing}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isProcessing}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="mt-2 text-center flex justify-center items-center gap-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                {councilMode === 'debate' ? 'Active Protocol: Council Consensus' : `Active Node: ${activeModel.split('/').pop()}`}
              </p>
              {debugMode && <span className="text-[10px] text-red-500 font-bold">[DEBUG ON]</span>}
            </div>
            {error && (
                <div className="absolute -top-12 left-0 right-0 bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-2 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
