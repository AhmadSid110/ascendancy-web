'use client';

import { useState } from 'react';
import { account } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { Shield, Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      // Sync client side (optional)
      try { await account.createEmailPasswordSession(email, password); } catch(e) {}
      
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] transition-colors duration-300">
      <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center border border-[var(--accent)]/20">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Join Ascendancy</h1>
          <p className="text-sm text-[var(--text-muted)]">Create your secure access account</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <input 
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Full Name" className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--background)] border border-[var(--card-border)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
            required
          />
          <input 
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--background)] border border-[var(--card-border)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
            required
          />
          <input 
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--background)] border border-[var(--card-border)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
            required
          />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={isProcessing} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white py-3 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2">
            {isProcessing ? <Zap className="w-4 h-4 animate-spin" /> : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] flex items-center justify-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
