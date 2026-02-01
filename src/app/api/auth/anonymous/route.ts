import { NextResponse } from 'next/server';
import { createClient } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { Account } from 'node-appwrite';

export async function POST() {
  try {
    const client = await createClient();
    const account = new Account(client);
    
    // Create an anonymous session
    const session = await account.createAnonymousSession();

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '697e89ff001ad611e97a';
    const cookieName = `a_session_${projectId}`;

    (await cookies()).set(cookieName, session.secret, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, user: session });
  } catch (error: any) {
    console.error("Anonymous Login API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
