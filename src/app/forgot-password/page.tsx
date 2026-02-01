'use client';

import { useState } from 'react';
import { account } from '@/lib/appwrite';
import { Shield, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : 'http://localhost:3000/reset-password';
      await account.createRecovery(email, redirectUrl);
      setSuccess(true);
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
          <h1 className="text-2xl font-bold tracking-tight">Account Recovery</h1>
          <p className="text-sm text-[var(--text-muted)]">Reset your access credentials</p>
        </div>
        
        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-sm">If an account exists with that email, we've sent instructions to reset your password.</p>
            <Link href="/" className="inline-block mt-4 text-[var(--accent)] hover:underline">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address" className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--background)] border border-[var(--card-border)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              required
            />
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button type="submit" disabled={isProcessing} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white py-3 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2">
              {isProcessing ? <Zap className="w-4 h-4 animate-spin" /> : 'Send Recovery Link'}
            </button>
          </form>
        )}
        
        {!success && (
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
