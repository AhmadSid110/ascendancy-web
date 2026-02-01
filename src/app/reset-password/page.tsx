'use client';

import { useState, Suspense } from 'react';
import { account } from '@/lib/appwrite';
import { Shield, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    if (!userId || !secret) {
        return (
            <div className="text-center text-red-500">
                Invalid recovery link.
                <div className="mt-4">
                     <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setError('');
        setIsProcessing(true);
        try {
            await account.updateRecovery(userId, secret, password);
            setSuccess(true);
            setTimeout(() => router.push('/'), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (success) {
        return (
             <div className="text-center space-y-4">
                <div className="flex justify-center">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <p className="text-sm">Password reset successfully! Redirecting to login...</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleReset} className="space-y-4">
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password" className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--background)] border border-[var(--card-border)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              required
            />
            <input 
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password" className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--background)] border border-[var(--card-border)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              required
            />
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button type="submit" disabled={isProcessing} className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white py-3 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2">
              {isProcessing ? <Zap className="w-4 h-4 animate-spin" /> : 'Set New Password'}
            </button>
        </form>
    );
}

export default function ResetPassword() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)] transition-colors duration-300">
      <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center border border-[var(--accent)]/20">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
