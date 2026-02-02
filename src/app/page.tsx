'use client';

import { useState, useEffect, useRef } from 'react';
import { account, databases, DB_ID, CHAT_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  Minimize,
  Pencil,
  Check,
  X,
  Search,
  Globe,
  BookOpen,
  Paperclip,
  FileUp,
  MessageCircle,
  PlusCircle
} from 'lucide-react';
import LibraryTab from '@/components/LibraryTab';

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
  const [lightningUsername, setLightningUsername] = useState('');
  const [lightningTeamspace, setLightningTeamspace] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<{ role: string, content: string, sender?: string, reasoning?: string, debugInfo?: any }[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Multi-Chat State
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
      setMessages(prev => [...prev, { role: 'system', content: 'Transmission terminated by user.', sender: 'System' }]);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setError('');
  };
  
  // Paperclip State
  const [attachedFile, setAttachedFile] = useState<{ name: string, content: string } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  
  // New Model Form State
  const [newModelName, setNewModelName] = useState('');
  const [newModelPath, setNewModelPath] = useState('');
  const [newModelRole, setNewModelRole] = useState('Advisor');
  const [newModelProvider, setNewModelProvider] = useState('lightning'); // 'lightning' | 'openai'

  // Settings UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Edit Model State
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editRole, setEditRole] = useState('');

  const [councilMode, setCouncilMode] = useState<'debate' | 'solo'>('debate');
  const [showReasoning, setShowReasoning] = useState(true);
  const [activeModel, setActiveModel] = useState<string>(DEFAULT_COUNCIL[1].model); 

  // Search Settings
  const [searchProvider, setSearchProvider] = useState<'serper' | 'tavily'>('serper');

  // Google Linking State
  const [linkingProvider, setLinkingProvider] = useState<'antigravity' | 'cli' | null>(null);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');
  const [googleVerifier, setGoogleVerifier] = useState('');
  const [googleCodeInput, setGoogleCodeInput] = useState('');
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

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

  const checkSession = async () => {
    try {
      // Get JWT for syncing if possible
      let jwt = null;
      try {
          const jwtResponse = await account.createJWT();
          jwt = jwtResponse.jwt;
      } catch (e) {}

      // Try server-side session check
      const res = await fetch('/api/auth/session', {
          headers: jwt ? { 'x-appwrite-jwt': jwt } : {}
      });
      if (res.ok) {
        const session = await res.json();
        setUser(session);
        setIsAuthenticated(true);
        loadChatHistory(session.$id);
        checkConfig(session.$id);
        return;
      }
      
      // Fallback to client SDK if server check fails (shouldn't happen with JWT sync)
      const session = await account.get();
      setUser(session);
      setIsAuthenticated(true);
      loadChatHistory(session.$id);
      checkConfig(session.$id);
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

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
    const savedSearch = localStorage.getItem('zenith_search_provider');
    if (savedSearch === 'serper' || savedSearch === 'tavily') setSearchProvider(savedSearch);

    checkSession();
  }, []);

  const checkConfig = async (userId: string) => {
      const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
      const collId = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
      try {
        // Try with query first (efficient)
        let secrets;
        try {
            secrets = await databases.listDocuments(dbId, collId, [Query.equal('userId', userId), Query.limit(100)]);
        } catch (e) {
            console.warn("Query failed (missing index?), falling back to full list search", e);
            // Fallback: list all and filter (for cases where indexes aren't set up yet)
            const allSecrets = await databases.listDocuments(dbId, collId, [Query.limit(100)]);
            secrets = {
                ...allSecrets,
                documents: allSecrets.documents.filter(d => d.userId === userId)
            };
        }

        const hasLightning = secrets.documents.some(d => d.keyName === 'lightning_api_key');
        const hasOpenAI = secrets.documents.some(d => d.keyName === 'openai_api_key');
        
        if (hasLightning || hasOpenAI) setIsConfigured(true);
        
        // Pre-fill keys if found
        const findVal = (name: string) => secrets.documents.find(d => d.keyName === name)?.keyValue;
        
        if (findVal('lightning_api_key')) setLightningKey(findVal('lightning_api_key'));
        if (findVal('lightning_username')) setLightningUsername(findVal('lightning_username'));
        if (findVal('lightning_teamspace')) setLightningTeamspace(findVal('lightning_teamspace'));
        if (findVal('openai_api_key')) setOpenaiKey(findVal('openai_api_key'));

      } catch (e) {
        console.error("Config check failed", e);
      }
  };

  const loadChatHistory = async (userId: string) => {
    if (!DB_ID || !CHAT_COLLECTION_ID) return;
    try {
      let response;
      try {
        response = await databases.listDocuments(
            DB_ID, CHAT_COLLECTION_ID,
            [Query.equal('userId', userId), Query.orderAsc('$createdAt'), Query.limit(100)]
        );
      } catch (e) {
          console.warn("Chat history query failed, falling back", e);
          const allDocs = await databases.listDocuments(DB_ID, CHAT_COLLECTION_ID, [Query.limit(100)]);
          response = {
              ...allDocs,
              documents: allDocs.documents
                .filter(d => d.userId === userId)
                .sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime())
          };
      }
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
      if (email && password) {
        // 1. Server-side login to set session cookie for API routes
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        
        // 2. Client-side SDK login (optional sync, helps with local state)
        // We do this AFTER the server login so that even if this fails (CORS), 
        // the server-side session is already established.
        try {
          await account.createEmailPasswordSession(email, password);
        } catch (syncErr) {
          console.warn("Client-side session sync failed, but server session is set.", syncErr);
        }
      } else {
        // Use server-side anonymous login to set cookies
        const res = await fetch('/api/auth/anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Anonymous login failed');
        
        // Also sync client-side SDK if needed
        try {
          await account.get(); // Check if already has session
        } catch (e) {
          // If no client session, it will be automatically handled by cookies if domains match,
          // but Appwrite Cloud usually needs a direct login or session sync.
          // However, for now, the server session is what matters for /api/chat.
        }
      }
      
      // 3. Verify session
      await checkSession();
      
    } catch (err: any) { 
      setError(err.message); 
    } 
    finally { setIsProcessing(false); }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch (e) { console.error('Logout error', e); }
    setIsAuthenticated(false);
    setUser(null);
    setMessages([]);
    setIsConfigured(false); // Reset config state to force re-check or re-login
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        setAttachedFile({ name: file.name, content: content.slice(0, 50000) }); // Limit to 50k chars for stability
        setIsReadingFile(false);
    };
    reader.onerror = () => {
        setError("Failed to read file");
        setIsReadingFile(false);
    };
    reader.readAsText(file);
  };

  const saveKey = async (keyName: string, keyValue: string) => {
      if (!user) return;
      const dbId = process.env.NEXT_PUBLIC_APPWRITE_DB_ID || 'ascendancy_db';
      const collId = process.env.NEXT_PUBLIC_APPWRITE_SECRETS_COLLECTION_ID || 'user_secrets';
      
      try {
        // Try listing with queries (requires indexes)
        let existing;
        try {
            existing = await databases.listDocuments(dbId, collId, [Query.equal('userId', user.$id), Query.equal('keyName', keyName)]);
        } catch (e) {
            console.warn(`Query for ${keyName} failed, falling back to full list check`);
            const all = await databases.listDocuments(dbId, collId, [Query.limit(100)]);
            const filtered = all.documents.filter(d => d.userId === user.$id && d.keyName === keyName);
            existing = { ...all, documents: filtered, total: filtered.length };
        }

        if (existing.total > 0) {
            if (keyValue) {
                await databases.updateDocument(dbId, collId, existing.documents[0].$id, { keyValue });
            }
        } else if (keyValue) {
            await databases.createDocument(dbId, collId, ID.unique(), { userId: user.$id, keyName, keyValue });
        }
      } catch (err) {
          console.error(`Failed to save key ${keyName}:`, err);
          throw err;
      }
  };

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        await saveKey('lightning_api_key', lightningKey);
        await saveKey('lightning_username', lightningUsername);
        await saveKey('lightning_teamspace', lightningTeamspace);
        await saveKey('openai_api_key', openaiKey);
        setIsConfigured(true);
        setShowSettings(false); // Close settings if open
    } catch (err: any) { setError(err.message); }
    finally { setIsProcessing(false); }
  };

  const callAI = async (prompt: string, model: string, mode: 'debate' | 'solo', historyMessages?: any[], role?: string) => {
    // Attempt to get a JWT for session syncing to the server
    let jwt = null;
    try {
        const jwtResponse = await account.createJWT();
        jwt = jwtResponse.jwt;
    } catch (e) {
        // Fallback for anonymous or failed JWT creation
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const response = await fetch('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: { 
        'Content-Type': 'application/json',
        ...(jwt ? { 'x-appwrite-jwt': jwt } : {})
      },
      body: JSON.stringify({
        prompt,
        model,
        mode,
        role,
        messages: historyMessages,
        debug: debugMode,
        searchProvider: searchProvider,
        threadId: activeThreadId
      }),
    });
    
    // Auto-relogin check: If 401, the session might have expired in the cookies
    if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please log in again.");
    }
    
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

    let userMessage = input.trim();
    
    // If there is an attached file, prepend its content
    if (attachedFile) {
        userMessage = `[ATTACHED FILE: ${attachedFile.name}]\n${attachedFile.content}\n\nUSER MESSAGE: ${userMessage}`;
    }

    setInput('');
    setAttachedFile(null); // Clear after sending
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsProcessing(true);
    setError('');

    try {
      if (councilMode === 'solo') {
        const member = council.find(m => m.model === activeModel);
        const result = await callAI(userMessage, activeModel, 'solo', newMessages, member?.role);
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.content, 
            sender: member?.name || 'AI',
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
      abortControllerRef.current = null;
    }
  };

  const addModel = () => {
    if (!newModelName || !newModelPath) return;
    
    // Auto-prefix if needed based on provider
    let finalPath = newModelPath;
    if (newModelProvider === 'lightning' && !finalPath.startsWith('lightning-ai/')) {
        finalPath = `lightning-ai/${finalPath}`;
    } else if (newModelProvider === 'antigravity' && !finalPath.startsWith('antigravity/')) {
        finalPath = `antigravity/${finalPath}`;
    } else if (newModelProvider === 'cli' && !finalPath.startsWith('cli/')) {
        finalPath = `cli/${finalPath}`;
    }
    
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

  const startEditing = (member: any) => {
    setEditingModelId(member.id);
    setEditName(member.name);
    setEditPath(member.model);
    setEditRole(member.role || 'Advisor');
  };

  const cancelEditing = () => {
    setEditingModelId(null);
  };

  const saveEdit = (id: string) => {
    const updated = council.map(m => {
      if (m.id === id) {
        return { ...m, name: editName, model: editPath, role: editRole };
      }
      return m;
    });
    setCouncil(updated);
    localStorage.setItem('zenith_council', JSON.stringify(updated));
    setEditingModelId(null);
  };

  const toggleSearchProvider = () => {
    const next = searchProvider === 'serper' ? 'tavily' : 'serper';
    setSearchProvider(next);
    localStorage.setItem('zenith_search_provider', next);
  };

  const startGoogleLink = async (provider: 'antigravity' | 'cli') => {
    setIsLinkingGoogle(true);
    setLinkingProvider(provider);
    try {
        const res = await fetch('/api/auth/google/url', {
            method: 'POST',
            body: JSON.stringify({ provider, redirectUri: window.location.origin + '/oauth-callback' })
        });
        const data = await res.json();
        setGoogleAuthUrl(data.url);
        setGoogleVerifier(data.verifier);
        window.open(data.url, '_blank');
    } catch (e: any) {
        setError(e.message);
    } finally {
        setIsLinkingGoogle(false);
    }
  };

  const finishGoogleLink = async () => {
    if (!googleCodeInput || !linkingProvider) return;
    setIsProcessing(true);
    try {
        // Extract code from URL if user pasted the whole thing
        let code = googleCodeInput;
        if (code.includes('code=')) {
            const url = new URL(code);
            code = url.searchParams.get('code') || code;
        }

        const res = await fetch('/api/auth/google/callback', {
            method: 'POST',
            body: JSON.stringify({ 
                code, 
                verifier: googleVerifier, 
                provider: linkingProvider,
                redirectUri: window.location.origin + '/oauth-callback'
            })
        });
        const tokens = await res.json();
        
        // Save to Appwrite
        const suffix = linkingProvider === 'antigravity' ? 'antigravity' : 'cli';
        await saveKey(`google_${suffix}_refresh`, tokens.refresh_token);
        
        // Fetch Email & Project
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const userInfo = await userInfoRes.json();
        await saveKey(`google_${suffix}_email`, userInfo.email);

        setGoogleAuthUrl('');
        setGoogleCodeInput('');
        setLinkingProvider(null);
        alert(`Successfully linked Google Account: ${userInfo.email}`);
    } catch (e: any) {
        setError(e.message);
    } finally {
        setIsProcessing(false);
    }
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

  const [pinging, setPinging] = useState<string | null>(null);
  const [pingResults, setPingResults] = useState<Record<string, { success: boolean, latency?: number, error?: string }>>({});

  const pingModel = async (provider: 'lightning' | 'openai') => {
    let key = provider === 'lightning' ? lightningKey : openaiKey;
    
    // Combine Lightning Key if needed
    if (provider === 'lightning' && lightningUsername && lightningTeamspace) {
        key = `${lightningKey}/${lightningUsername}/${lightningTeamspace}`;
    }

    const model = provider === 'lightning' ? 'gpt-oss-120b' : 'gpt-4o-mini';
    
    setPinging(provider);
    try {
        const res = await fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, apiKey: key, provider })
        });
        const data = await res.json();
        setPingResults(prev => ({ ...prev, [provider]: data }));
    } catch (err: any) {
        setPingResults(prev => ({ ...prev, [provider]: { success: false, error: err.message } }));
    } finally {
        setPinging(null);
    }
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
                  placeholder="sk-..." className="w-full px-4 py-3 rounded-xl font-mono text-sm border border-[var(--card-border)] bg-[var(--background)] mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Username</label>
                        <input 
                          type="text" value={lightningUsername} onChange={(e) => setLightningUsername(e.target.value)}
                          placeholder="username" className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--card-border)] bg-[var(--background)]"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Teamspace</label>
                        <input 
                          type="text" value={lightningTeamspace} onChange={(e) => setLightningTeamspace(e.target.value)}
                          placeholder="teamspace" className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--card-border)] bg-[var(--background)]"
                        />
                    </div>
                </div>
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
          
          {/* Threads Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Conversations</h3>
              <button onClick={createThread} className="text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors">
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 mb-6">
              {threads.map(thread => (
                <div 
                  key={thread.$id}
                  onClick={() => switchThread(thread.$id)}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeThreadId === thread.$id ? 'bg-[var(--accent)] text-white shadow-md' : 'hover:bg-[var(--card-border)] text-[var(--text-muted)]'}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageCircle className={`w-3.5 h-3.5 flex-shrink-0 ${activeThreadId === thread.$id ? 'text-white' : 'text-[var(--accent)]'}`} />
                    <span className="text-xs font-medium truncate">{thread.title}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteThread(thread.$id); }}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 transition-all ${activeThreadId === thread.$id ? 'text-white' : 'text-red-400'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {threads.length === 0 && (
                <p className="text-[10px] text-center text-[var(--text-muted)] italic py-2">No active conversations</p>
              )}
            </div>
          </div>

          {/* Council Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Council</h3>
              <button onClick={() => setCouncilMode(m => m === 'debate' ? 'solo' : 'debate')} className={`text-[10px] px-2 py-0.5 rounded-full border ${councilMode === 'debate' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--card-border)] text-[var(--text-muted)]'}`}>
                {councilMode === 'debate' ? 'DEBATE' : 'SOLO'}
              </button>
            </div>
            
            <button 
              onClick={() => setShowLibrary(!showLibrary)}
              className={`w-full flex items-center justify-between p-3 mb-4 rounded-xl border transition-all ${showLibrary ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg shadow-[var(--accent)]/20' : 'bg-[var(--card-border)]/50 border-[var(--card-border)] hover:bg-[var(--card-border)]'}`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className={`w-4 h-4 ${showLibrary ? 'text-white' : 'text-[var(--accent)]'}`} />
                <span className="text-sm font-semibold">Knowledge Hub</span>
              </div>
              <ChevronLeft className={`w-4 h-4 transition-transform ${showLibrary ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            <div className="space-y-2">
              {council.map(member => (
                <div 
                  key={member.id} 
                  onClick={() => setActiveModel(member.model)}
                  className={`p-3 rounded-xl border transition-all ${
                    activeModel === member.model && councilMode === 'solo' 
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                    : 'border-[var(--card-border)] hover:bg-[var(--card-border)]'
                  } ${editingModelId === member.id ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {editingModelId === member.id ? (
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                       <input 
                         value={editName} 
                         onChange={e => setEditName(e.target.value)}
                         className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded p-1 text-xs"
                         placeholder="Name"
                       />
                       <input 
                         value={editPath} 
                         onChange={e => setEditPath(e.target.value)}
                         className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded p-1 text-xs"
                         placeholder="Model ID"
                       />
                       <input 
                         value={editRole} 
                         onChange={e => setEditRole(e.target.value)}
                         className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded p-1 text-xs"
                         placeholder="Role (e.g. Skeptic)"
                       />
                       <div className="flex justify-end gap-1 pt-1">
                          <button onClick={cancelEditing} className="p-1 text-[var(--text-muted)] hover:text-red-500">
                             <X className="w-3 h-3" />
                          </button>
                          <button onClick={() => saveEdit(member.id)} className="p-1 text-[var(--accent)] hover:text-[var(--accent)]/80">
                             <Check className="w-3 h-3" />
                          </button>
                       </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{member.name}</span>
                            <span className="text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider">{member.role}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); startEditing(member); }} className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteModel(member.id); }} className="text-[var(--text-muted)] hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{member.model}</div>
                    </>
                  )}
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
                  <option value="antigravity">Google Antigravity</option>
                  <option value="cli">Google CLI</option>
              </select>

              <input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="Display Name (e.g. GPT-4)" className="w-full bg-transparent border-b border-[var(--card-border)] p-1 text-xs focus:ring-0 mb-2" />
              <input value={newModelPath} onChange={e => setNewModelPath(e.target.value)} placeholder={newModelProvider === 'openai' ? 'Model ID (e.g. gpt-4)' : 'Model ID (e.g. llama-3.1)'} className="w-full bg-transparent border-b border-[var(--card-border)] p-1 text-xs focus:ring-0 text-[var(--text-muted)] mb-2" />
              <input value={newModelRole} onChange={e => setNewModelRole(e.target.value)} placeholder="Role (e.g. Advisor, Skeptic)" className="w-full bg-transparent border-b border-[var(--card-border)] p-1 text-xs focus:ring-0 text-[var(--text-muted)]" />
              
              <p className="text-[10px] text-[var(--text-muted)] italic mt-2">
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

              {/* Search Provider Toggle */}
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2"><Globe className="w-3 h-3 text-[var(--text-muted)]" /> Search Tool</span>
                  <div className="flex bg-[var(--card-border)] p-0.5 rounded-lg">
                    <button 
                      onClick={() => { setSearchProvider('serper'); localStorage.setItem('zenith_search_provider', 'serper'); }}
                      className={`text-[9px] px-2 py-1 rounded-md transition-all ${searchProvider === 'serper' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                    >
                      SERPER
                    </button>
                    <button 
                      onClick={() => { setSearchProvider('tavily'); localStorage.setItem('zenith_search_provider', 'tavily'); }}
                      className={`text-[9px] px-2 py-1 rounded-md transition-all ${searchProvider === 'tavily' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'}`}
                    >
                      TAVILY
                    </button>
                  </div>
                </div>
              </div>

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
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase text-[var(--text-muted)]">Lightning AI Key</label>
                            <button 
                                onClick={() => pingModel('lightning')}
                                disabled={!!pinging || !lightningKey}
                                className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1"
                            >
                                {pinging === 'lightning' ? 'Pinging...' : 'Ping'}
                            </button>
                        </div>
                        <input type="password" value={lightningKey} onChange={e => setLightningKey(e.target.value)} className="w-full bg-[var(--background)] rounded p-1 text-xs border border-[var(--card-border)] mb-2" placeholder="sk-..." />
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label className="text-[8px] uppercase text-[var(--text-muted)]">Username</label>
                                <input type="text" value={lightningUsername} onChange={e => setLightningUsername(e.target.value)} className="w-full bg-[var(--background)] rounded p-1 text-xs border border-[var(--card-border)]" placeholder="user" />
                            </div>
                            <div>
                                <label className="text-[8px] uppercase text-[var(--text-muted)]">Teamspace</label>
                                <input type="text" value={lightningTeamspace} onChange={e => setLightningTeamspace(e.target.value)} className="w-full bg-[var(--background)] rounded p-1 text-xs border border-[var(--card-border)]" placeholder="team" />
                            </div>
                        </div>

                        {pingResults.lightning && (
                            <p className={`text-[9px] mt-1 ${pingResults.lightning.success ? 'text-emerald-500' : 'text-red-500'}`}>
                                {pingResults.lightning.success ? `Success (${pingResults.lightning.latency}ms)` : `Error: ${pingResults.lightning.error}`}
                            </p>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase text-[var(--text-muted)]">OpenAI Key</label>
                            <button 
                                onClick={() => pingModel('openai')}
                                disabled={!!pinging || !openaiKey}
                                className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1"
                            >
                                {pinging === 'openai' ? 'Pinging...' : 'Ping'}
                            </button>
                        </div>
                        <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} className="w-full bg-[var(--background)] rounded p-1 text-xs border border-[var(--card-border)]" placeholder="sk-..." />
                        {pingResults.openai && (
                            <p className={`text-[9px] mt-1 ${pingResults.openai.success ? 'text-emerald-500' : 'text-red-500'}`}>
                                {pingResults.openai.success ? `Success (${pingResults.openai.latency}ms)` : `Error: ${pingResults.openai.error}`}
                            </p>
                        )}
                      </div>

                      {/* Google Linking */}
                      <div className="pt-2 border-t border-[var(--card-border)]">
                        <label className="text-[10px] uppercase text-[var(--text-muted)] mb-2 block">Google Accounts (BYOS)</label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                           <button 
                             onClick={() => startGoogleLink('antigravity')}
                             disabled={isLinkingGoogle}
                             className="text-[10px] bg-[var(--background)] hover:bg-[var(--card-border)] border border-[var(--card-border)] p-2 rounded-lg transition-colors flex items-center gap-2 justify-center"
                           >
                             <Globe className="w-3 h-3" /> Antigravity
                           </button>
                           <button 
                             onClick={() => startGoogleLink('cli')}
                             disabled={isLinkingGoogle}
                             className="text-[10px] bg-[var(--background)] hover:bg-[var(--card-border)] border border-[var(--card-border)] p-2 rounded-lg transition-colors flex items-center gap-2 justify-center"
                           >
                             <Terminal className="w-3 h-3" /> Gemini CLI
                           </button>
                        </div>

                        {linkingProvider && (
                            <div className="p-2 bg-[var(--background)] border border-[var(--accent)]/30 rounded-xl space-y-2 animate-in fade-in zoom-in-95">
                                <p className="text-[9px] text-[var(--text-muted)]">
                                    Sign in on the new tab, then paste the **Redirect URL** (the whole link) from the address bar below:
                                </p>
                                <input 
                                    value={googleCodeInput}
                                    onChange={e => setGoogleCodeInput(e.target.value)}
                                    placeholder="Paste URL here..."
                                    className="w-full bg-[var(--card-bg)] rounded p-1.5 text-xs border border-[var(--card-border)]"
                                />
                                <div className="flex gap-1">
                                    <button onClick={finishGoogleLink} className="flex-1 bg-[var(--accent)] text-white text-[10px] py-1 rounded">Connect</button>
                                    <button onClick={() => setLinkingProvider(null)} className="px-2 border border-[var(--card-border)] text-[10px] py-1 rounded">Cancel</button>
                                </div>
                            </div>
                        )}
                      </div>

                      <button onClick={handleSaveApiKeys} className="w-full bg-[var(--accent)] text-white text-xs py-1.5 rounded hover:bg-[var(--accent)]/90">Save Keys</button>
                  </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium truncate">{user?.name || 'Anonymous'}</p>
               <p className="text-xs text-[var(--text-muted)] truncate">{user?.email || 'Guest User'}</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 py-2 rounded-lg transition-colors">
              <p className="sr-only">Logout</p>
              <span>Logout</span>
          </button>
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
             <button onClick={startNewChat} className="p-2 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors" title="New Chat">
               <Trash2 className="w-5 h-5" />
             </button>
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
            
            {/* Attachment Preview */}
            <AnimatePresence>
              {attachedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-14 left-0 bg-[var(--accent)]/10 border border-[var(--accent)]/30 p-2 rounded-xl flex items-center gap-2 text-xs backdrop-blur-md shadow-lg"
                >
                  <FileUp className="w-3 h-3 text-[var(--accent)]" />
                  <span className="font-medium truncate max-w-[150px]">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="p-1 hover:bg-red-500/10 rounded-lg text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="relative">
              <div className="absolute left-2 top-2 bottom-2 flex items-center">
                 <label className={`aspect-square p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${isReadingFile ? 'opacity-50 animate-pulse' : 'hover:bg-[var(--card-border)]'}`}>
                   <Paperclip className={`w-5 h-5 ${attachedFile ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                   <input type="file" className="hidden" onChange={handleFileUpload} disabled={isReadingFile || !!attachedFile} />
                 </label>
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachedFile ? "Ask about the file..." : "Send a message..."}
                className="w-full pl-12 pr-14 py-4 rounded-2xl shadow-sm transition-all focus:ring-2 focus:ring-[var(--accent)]/20"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <button 
                  type="button"
                  onClick={stopGeneration}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
                >
                  <div className="w-3 h-3 bg-white rounded-sm" />
                </button>
              ) : (
                <button 
                  type="submit" 
                  disabled={!input.trim() || isProcessing}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
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
      <AnimatePresence>
        {showLibrary && (
          <LibraryTab user={user} onClose={() => setShowLibrary(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
